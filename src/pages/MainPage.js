import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';

// Helper function to get date string in YYYY-MM-DD format
// Moved outside the component to be accessible and prevent re-declaration
const getISODateString = (date) => {
  return date.toISOString().slice(0, 10);
};

function MainPage({ userName }) {
  const navigate = useNavigate();
  // 1. 狀態：用來追蹤目前是否為深夜模式
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 從 localStorage 讀取已儲存的主題，若無則預設為 false (白天)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // 如果使用者系統偏好深色主題，也預設為深色
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // 2. 副作用：當 isDarkMode 狀態改變時，更新 body 的 class 和 localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // 3. 事件處理器：點擊按鈕時切換模式
  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };
  const [friendList, setFriendList] = useState([]); // Kept for future use or other logic
  const [friendsDone, setFriendsDone] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedDates, setCompletedDates] = useState(new Set());

  // Generate the dates for the calendar (last 21 days)
  const calendarDays = [];
  const today = new Date();
  // To ensure today is the very last day, we reset its time part
  today.setHours(12, 0, 0, 0);

  for (let i = 20; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    calendarDays.push(date);
  }
  const todayStr = getISODateString(today);

  useEffect(() => {
    async function fetchChallengeData() {
      if (!userName) return;
      setLoading(true);

      // 1. Fetch friend list
      const friendDoc = await getDoc(doc(db, 'Friends', userName));
      let friends = [];
      if (friendDoc.exists() && Array.isArray(friendDoc.data().friends)) {
        friends = friendDoc.data().friends;
      }
      setFriendList(friends);

      // 2. Fetch user's completion status for the last 21 days
      const dateStrings = calendarDays.map(date => getISODateString(date));
      const challengePromises = dateStrings.map(dateStr =>
        getDoc(doc(db, 'DailyChallenge', dateStr, 'users', userName))
      );

      const challengeDocs = await Promise.all(challengePromises);

      const newCompletedDates = new Set();
      challengeDocs.forEach((docSnap, index) => {
        if (docSnap.exists() && docSnap.data().completed) {
          newCompletedDates.add(dateStrings[index]);
        }
      });
      setCompletedDates(newCompletedDates);

      // 3. Fetch friends' completion status for TODAY
      const usersSnap = await getDocs(collection(db, 'DailyChallenge', todayStr, 'users'));
      const doneFriends = [];
      usersSnap.forEach(docSnap => {
        if (friends.includes(docSnap.id) && docSnap.data().completed) {
          doneFriends.push(docSnap.id);
        }
      });
      setFriendsDone(doneFriends);

      setLoading(false);
    }

    if (userName) fetchChallengeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);

  // Derive today's challenge completion status from the new Set
  const isTodayChallengeDone = completedDates.has(todayStr);

  return (
    <div className="main-container">
       <div className="main-header">
      <h1>Welcome to LinguaLearn AI</h1>
        <button onClick={toggleTheme} className="theme-toggle-button" aria-label="切換主題">
          {/* 如果是深夜模式，顯示太陽圖示，反之則顯示月亮 */}
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      <h2>主畫面</h2>
      <div className="main-welcome">
        歡迎，{userName}！
      </div>

      {/* 每日挑戰區塊 */}
      <div className="main-daily-challenge">
        {/* Left side info */}
        <div className="challenge-info">
          <div className="main-challenge-title">📅 每日挑戰</div>
          <div className="main-challenge-desc">今天學習一個新單字！</div>
          <div className="main-challenge-status">
            {loading ? (
              <span className="main-challenge-loading">載入中...</span>
            ) : isTodayChallengeDone ? (
              <span className="main-challenge-done">你已完成今日挑戰</span>
            ) : (
              <span className="main-challenge-notyet">尚未完成，快去學習單字！</span>
            )}
          </div>
          <div className="main-challenge-friends">
            <span className="main-challenge-friend-title">今日完成的好友：</span>
            {loading ? (
              <span className="main-challenge-loading">載入中...</span>
            ) : friendsDone.length === 0 ? (
              <span className="main-challenge-none">暫無好友完成</span>
            ) : (
              friendsDone.map(name => (
                <span key={name} className="main-challenge-friend">{name}</span>
              ))
            )}
          </div>
        </div>

        {/* Right side calendar */}
        <div className="challenge-calendar-container">
          <div className="challenge-calendar-header">最近 21 天</div>
          <div className="challenge-calendar">
            {calendarDays.map(day => {
              const dayStr = getISODateString(day);
              const isCurrent = dayStr === todayStr;

              const isCompleted = completedDates.has(dayStr);
              let dayClassName = 'calendar-day';
              if (isCompleted) dayClassName += ' completed';
              if (isCurrent) dayClassName += ' current-day';

              return (
                <div key={dayStr} className={dayClassName}>
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="main-menu">
        <button onClick={() => navigate('/ai-chat')}>AI語音對話</button>
        <button onClick={() => navigate('/conversations')}>歷史對話</button>
        <button onClick={() => navigate('/vocabulary')}>學習單字</button>
        <button onClick={() => navigate('/medals')}>勳章系統</button>
        <button onClick={() => navigate('/friends')}>好友與排行榜</button>
      </div>
    </div>
  );
}

export default MainPage;
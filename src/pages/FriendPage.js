import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader'; 
import './FriendPage.css';
import { collection, doc, getDoc, setDoc, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../firebase';

// 勳章定義 (與勳章頁面同步)
const MEDALS = [
  { id: 'vocab10', type: 'vocab', target: 10 },
  { id: 'vocab30', type: 'vocab', target: 30 },
  { id: 'conv10', type: 'conversation', target: 10 },
  { id: 'conv50', type: 'conversation', target: 50 },
  { id: 'conv100', type: 'conversation', target: 100 }
];

function FriendPage({ userName }) {
  // *** HIGHLIGHT START: 新增模式切換的邏輯 (與主頁面相同) ***
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) { return savedTheme === 'dark'; }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  // *** HIGHLIGHT END ***

  const [friendInput, setFriendInput] = useState('');
  const [friends, setFriends] = useState([]);
  const [friendStats, setFriendStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const fetchFriends = useCallback(async () => {
    if (!userName) return;
    setLoading(true);

    const friendDoc = await getDoc(doc(db, 'Friends', userName));
    const friendArr = friendDoc.exists() ? friendDoc.data().friends : [];
    setFriends(friendArr);

    const userList = [userName, ...friendArr];
    if (userList.length === 0) {
      setLoading(false);
      return;
    }

    const statsPromises = userList.map(async (name) => {
      const vocabQuery = query(collection(db, 'UserVocabulary', name, 'words'), where('passed', '==', true));
      const convQuery = query(collection(db, 'Conversations'), where('user_name', '==', name));
      
      const [vocabSnap, convSnap] = await Promise.all([getDocs(vocabQuery), getDocs(convQuery)]);
      
      const vocabPassed = vocabSnap.size;
      const convCount = convSnap.size;
      const medalCount = MEDALS.filter(m => (m.type === 'vocab' && vocabPassed >= m.target) || (m.type === 'conversation' && convCount >= m.target)).length;

      return { name, vocabPassed, convCount, medal: medalCount };
    });

    const stats = await Promise.all(statsPromises);
    setFriendStats(stats);
    setLoading(false);
  }, [userName]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  async function handleAddFriend() {
    setMsg({ text: '', type: '' });
    const toAdd = friendInput.trim();
    if (!toAdd) {
      setMsg({ text: '請輸入好友名稱', type: 'error' });
      return;
    }
    if (toAdd === userName) {
      setMsg({ text: '不能添加自己為好友', type: 'error' });
      return;
    }
    if (friends.includes(toAdd)) {
      setMsg({ text: `${toAdd} 已經是你的好友`, type: 'info' });
      return;
    }

    const userCheck = await getDoc(doc(db, 'Users', toAdd));
    if (!userCheck.exists()) {
      setMsg({ text: '查無此用戶', type: 'error' });
      return;
    }

    const newFriends = [...friends, toAdd];
    await setDoc(doc(db, 'Friends', userName), { friends: newFriends }, { merge: true });
    setFriendInput('');
    setMsg({ text: '好友添加成功！', type: 'success' });
    fetchFriends();
  }

  const vocabRank = [...friendStats].sort((a, b) => b.vocabPassed - a.vocabPassed);
  const convRank = [...friendStats].sort((a, b) => b.convCount - a.convCount);
  const medalRank = [...friendStats].sort((a, b) => b.medal - a.medal);

  return (
    <div className="friend-container">
      {/* *** HIGHLIGHT START: 新增 Header，包含標題和切換按鈕 *** */}
      <PageHeader 
        title="好友與排行榜"
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        showBackButton={true} // 明確告訴組件要顯示返回按鈕
      />
      <div className="friend-welcome">歡迎，{userName}！</div>
      {/* *** HIGHLIGHT END *** */}

      <div className="friend-add">
        <input
          className="friend-input"
          placeholder="輸入好友名稱"
          value={friendInput}
          onChange={e => setFriendInput(e.target.value)}
        />
        <button className="friend-btn" onClick={handleAddFriend}>添加好友</button>
      </div>
      {msg.text && <div className={`friend-msg ${msg.type}`}>{msg.text}</div>}

      {loading ? (
        <div className="friend-loading">載入排行榜中...</div>
      ) : (
        <div className="rankings-container">
          {[{ title: '單字學習排行榜', data: vocabRank, field: 'vocabPassed', unit: '個' },
            { title: '對話次數排行榜', data: convRank, field: 'convCount', unit: '次' },
            { title: '勳章數排行榜', data: medalRank, field: 'medal', unit: '枚' }].map(rank => (
            <div key={rank.title}>
              <div className="friend-list-title">{rank.title}</div>
              <div className="friend-list">
                <div className="friend-list-header">
                  <span>排名</span>
                  <span>名稱</span>
                  <span>{rank.field === 'vocabPassed' ? '單字數' : (rank.field === 'convCount' ? '對話數' : '勳章數')}</span>
                </div>
                {rank.data.map((item, idx) => (
                  <div key={item.name} className={`friend-list-row${item.name === userName ? ' me' : ''}`}>
                    <span className="rank-position">{idx + 1}</span>
                    <span className="rank-name">{item.name}</span>
                    <span className="rank-score">{item[rank.field]} {rank.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FriendPage;
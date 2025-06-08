import React, { useEffect, useState } from 'react';
import './MedalPage.css';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// 勳章定義可以移到組件外部，因為它不會改變
const MEDALS = [
  { id: 'vocab10', name: '單字新手', type: 'vocab', target: 10, description: '學習通過10個單字' },
  { id: 'vocab30', name: '單字高手', type: 'vocab', target: 30, description: '學習通過30個單字' },
  { id: 'conv10', name: '對話新手', type: 'conversation', target: 10, description: '完成10次AI對話' },
  { id: 'conv50', name: '對話達人', type: 'conversation', target: 50, description: '完成50次AI對話' },
  { id: 'conv100', name: '聊天大師', type: 'conversation', target: 100, description: '完成100次AI對話' }
];

function MedalPage({ userName }) {
  // *** HIGHLIGHT START: 新增模式切換的邏輯 (與主頁面相同) ***
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };
  // *** HIGHLIGHT END ***

  const [vocabCount, setVocabCount] = useState(0);
  const [convCount, setConvCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!userName) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // 兩個 Promise 可以並行處理，提升效率
      const vocabPromise = getDocs(
        query(
          collection(db, 'UserVocabulary', userName, 'words'),
          where('passed', '==', true)
        )
      );
      const convPromise = getDocs(
        query(
          collection(db, 'Conversations'),
          where('user_name', '==', userName)
        )
      );

      try {
        const [vocabSnap, convSnap] = await Promise.all([vocabPromise, convPromise]);
        setVocabCount(vocabSnap.size);
        setConvCount(convSnap.size);
      } catch (error) {
        console.error("Error fetching medal data:", error);
      }
      
      setLoading(false);
    }
    fetchData();
  }, [userName]);

  return (
    <div className="medal-container">
      {/* *** HIGHLIGHT START: 新增 Header，包含標題和切換按鈕 *** */}
      <div className="medal-header">
        <h2>勳章系統</h2>
        <button onClick={toggleTheme} className="theme-toggle-button" aria-label="切換主題">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      <div className="medal-welcome">
        歡迎，{userName}！
      </div>
      {/* *** HIGHLIGHT END *** */}

      {loading ? (
        <div className="medal-loading">載入勳章進度中...</div>
      ) : (
        <>
          <div className="medal-progress">
            <div className="progress-item">
              <span className="progress-label">已學會單字</span>
              <span className="progress-count">{vocabCount}</span>
            </div>
            <div className="progress-item">
              <span className="progress-label">總對話次數</span>
              <span className="progress-count">{convCount}</span>
            </div>
          </div>
          <div className="medal-list">
            {MEDALS.map(medal => {
              const currentCount = medal.type === 'vocab' ? vocabCount : convCount;
              const achieved = currentCount >= medal.target;
              
              return (
                <div key={medal.id} className={`medal-item ${achieved ? 'achieved' : ''}`}>
                  <div className="medal-icon">{achieved ? '🏅' : '🔒'}</div>
                  <div className="medal-info">
                    <div className="medal-name">{medal.name}</div>
                    <div className="medal-desc">{medal.description}</div>
                  </div>
                  <div className="medal-status">
                    {achieved ? '已獲得' : `(${currentCount}/${medal.target})`}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default MedalPage;
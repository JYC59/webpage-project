import React, { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader'; 
import './ConversationsPage.css';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

function ConversationsPage({ userName }) {
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

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchHistory() {
      if (!userName) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const q = query(
          collection(db, 'Conversations'),
          where('user_name', '==', userName),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const allDocs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHistory(allDocs);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError(err.message || String(err));
      }
      setLoading(false);
    }
    fetchHistory();
  }, [userName]);

  return (
    <div className="conv-container">
      {/* *** HIGHLIGHT START: 新增 Header，包含標題和切換按鈕 *** */}
      <PageHeader 
        title="對話歷史"
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        showBackButton={true} // 明確告訴組件要顯示返回按鈕
      />
      <div className="conv-welcome">
        歡迎，{userName}！
      </div>
      {/* *** HIGHLIGHT END *** */}

      {loading ? (
        <div className="conv-loading">載入中...</div>
      ) : error ? (
        <div className="conv-empty" style={{ color: 'red' }}>載入失敗：{error}</div>
      ) : history.length === 0 ? (
        <p className="conv-empty">目前沒有對話紀錄。</p>
      ) : (
        <div className="conv-list">
          {history.map(item => (
            <div key={item.id} className="conv-record">
              <div className="conv-info">
                <span className="conv-scenario">{item.scenario || '一般對話'}</span>
                <span className="conv-time">
                  {item.timestamp?.toDate
                    ? item.timestamp.toDate().toLocaleString('zh-TW')
                    : '未知時間'}
                </span>
              </div>
              <div className="conv-q">
                <span className="conv-label">你：</span>
                {item.user_input}
              </div>
              <div className="conv-a">
                <span className="conv-label">AI：</span>
                {item.ai_response}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConversationsPage;
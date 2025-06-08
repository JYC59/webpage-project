import React, { useEffect, useState } from 'react';
import './VocabularyPage.css';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

function VocabularyPage({ userName }) {
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

  const [vocabList, setVocabList] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [userPassed, setUserPassed] = useState({});
  const [input, setInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passLoading, setPassLoading] = useState(false);

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  useEffect(() => {
    async function fetchData() {
      if (!userName) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const vocabSnap = await getDocs(collection(db, 'Vocabulary'));
      const words = vocabSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const userWords = {};
      const userWordsSnap = await getDocs(collection(db, 'UserVocabulary', userName, 'words'));
      userWordsSnap.forEach(doc => {
        userWords[doc.id] = doc.data().passed;
      });

      setVocabList(words);
      setUserPassed(userWords);
      setLoading(false);
    }
    fetchData();
  }, [userName]);

  useEffect(() => {
    if (vocabList.length === 0 && !loading) return;
    const notPassed = vocabList.filter(word => !userPassed[word.id]);
    if (notPassed.length === 0) {
      setCurrentWord(null);
    } else {
      const randomIdx = Math.floor(Math.random() * notPassed.length);
      setCurrentWord(notPassed[randomIdx]);
    }
    setInput('');
    setShowAnswer(false);
  }, [userPassed, vocabList, loading]);

  async function handlePass(passed) {
    if (!currentWord) return;
    setPassLoading(true);
    try {
      await setDoc(
        doc(db, 'UserVocabulary', userName, 'words', currentWord.id),
        { passed }
      );
      if (passed) {
        await setDoc(
          doc(db, 'DailyChallenge', dateStr, 'users', userName),
          { completed: true }
        );
      }
      setUserPassed(prev => ({ ...prev, [currentWord.id]: passed }));
    } catch (error) {
      console.error("Error updating vocabulary status:", error);
    }
    setPassLoading(false);
  }

  return (
    <div className="vocab-container">
      {/* *** HIGHLIGHT START: 新增 Header，包含標題和切換按鈕 *** */}
      <div className="vocab-header">
        <h2>學習單字</h2>
        <button onClick={toggleTheme} className="theme-toggle-button" aria-label="切換主題">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      <div className="vocab-welcome">
        歡迎，{userName}！
      </div>
      {/* *** HIGHLIGHT END *** */}
      
      {loading ? (
        <div className="vocab-loading">載入單字庫中...</div>
      ) : currentWord ? (
        <div className="vocab-card">
          <div className="vocab-question">
            <span className="vocab-label">英文：</span>
            <span className="vocab-english">{currentWord.english}</span>
          </div>
          <div className="vocab-answer">
            <input
              className="vocab-input"
              type="text"
              placeholder="請輸入中文解釋"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={showAnswer}
            />
            <button
              className="vocab-btn"
              onClick={() => setShowAnswer(true)}
              disabled={showAnswer || input.trim() === ''}
            >
              顯示答案
            </button>
          </div>
          {showAnswer && (
            <div className="vocab-result">
              <span className="vocab-label">正確答案：</span>
              <span className="vocab-chinese">{currentWord.chinese}</span>
              <div className="vocab-pass-btns">
                <button
                  className="vocab-btn pass"
                  onClick={() => handlePass(true)}
                  disabled={passLoading}
                >
                  {passLoading ? '...' : '我學會了'}
                </button>
                <button
                  className="vocab-btn fail"
                  onClick={() => handlePass(false)}
                  disabled={passLoading}
                >
                  {passLoading ? '...' : '還沒學會'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="vocab-finish">🎉 你已經學會所有單字，太棒了！</div>
      )}
    </div>
  );
}

export default VocabularyPage;
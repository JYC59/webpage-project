import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './LoginPage.css';

function LoginPage({ onLogin }) {
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

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' }); // 合併 error 和 success 狀態
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    if (!userName || !password) {
      setMsg({ text: '請輸入名稱和密碼', type: 'error' });
      return;
    }

    const docRef = doc(db, "Users", userName.trim());
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && password === docSnap.data().password) {
      if (onLogin) onLogin(userName.trim());
      navigate('/');
    } else {
      setMsg({ text: '名稱或密碼錯誤', type: 'error' });
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    if (!userName || !password) {
      setMsg({ text: '請輸入名稱和密碼', type: 'error' });
      return;
    }
    
    const docRef = doc(db, "Users", userName.trim());
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      setMsg({ text: '此用戶名稱已被註冊', type: 'error' });
      return;
    }
    
    await setDoc(docRef, { user_name: userName.trim(), password });
    setMsg({ text: '註冊成功，請登入', type: 'success' });
  }

  return (
    <div className="login-container">
      {/* *** HIGHLIGHT START: 新增 Header，包含標題和切換按鈕 *** */}
      <div className="login-header">
        <h2>登入 / 註冊</h2>
        <button onClick={toggleTheme} className="theme-toggle-button" aria-label="切換主題">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      {/* *** HIGHLIGHT END *** */}
      
      <form onSubmit={handleLogin} className="login-form">
        <div className="form-group">
          <label htmlFor="username">用戶名稱</label>
          <input
            id="username"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">密碼</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-buttons">
          <button type="submit">登入</button>
          <button type="button" onClick={handleRegister}>註冊</button>
        </div>
      </form>
      {msg.text && <div className={`login-message ${msg.type}`}>{msg.text}</div>}
    </div>
  );
}

export default LoginPage;
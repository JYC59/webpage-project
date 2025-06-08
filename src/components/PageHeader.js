import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PageHeader.css';

function PageHeader({ title, showBackButton = true, isDarkMode, toggleTheme }) {
  const navigate = useNavigate();

  return (
    <div className="page-header">
      {/* 只有在 showBackButton 為 true 時才顯示返回按鈕 */}
      {showBackButton && (
        <button 
          onClick={() => navigate('/')} 
          className="back-button" 
          aria-label="返回主畫面"
        >
          ← {/* 這是一個左箭頭符號 */}
        </button>
      )}
      
      <h2>{title}</h2>

      <button onClick={toggleTheme} className="theme-toggle-button" aria-label="切換主題">
        {isDarkMode ? '☀️' : '🌙'}
      </button>
    </div>
  );
}

export default PageHeader;
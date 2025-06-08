import React, { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader'; 
import './AiChatPage.css';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const GEMINI_API_KEY = '你的API_KEY'; // 請記得替換成你的金鑰

const SCENARIOS = [
  { key: 'default', label: '一般對話', prompt: 'Hi! What do you want to talk to me about today?' },
  { key: 'airport', label: '機場英文', prompt: 'You are at the airport. Let\'s practice a conversation: "Hello, I would like to check in for my flight to London."' },
  { key: 'restaurant', label: '餐廳點餐', prompt: 'You are at a restaurant. Let\'s practice: "Hi, I would like to order a steak and a salad, please."' },
  { key: 'hospital', label: '醫院看診', prompt: 'You are visiting a doctor. Let\'s practice: "Doctor, I have a headache and a sore throat."' }
];

function AiChatPage({ userName }) {
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

  const [scenario, setScenario] = useState(SCENARIOS[0].key);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: SCENARIOS[0].prompt }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 切換情境 (邏輯不變)
  function handleScenarioChange(key) {
    const selected = SCENARIOS.find(s => s.key === key);
    setScenario(key);
    setMessages([{ role: 'assistant', content: selected.prompt }]);
    setInput('');
  }

  // 發送訊息 (邏輯不變)
  async function handleSend() {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    let aiReply = '抱歉，AI 服務發生錯誤。';

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: newMessages.map(msg => ({
              role: msg.role,
              parts: [{ text: msg.content }]
            }))
          })
        }
      );
      const data = await response.json();
      if (data?.candidates?.[0]?.content?.parts?.[0]) {
        aiReply = data.candidates[0].content.parts[0].text;
      }
      setMessages([...newMessages, { role: 'assistant', content: aiReply }]);

      await addDoc(collection(db, 'Conversations'), {
        user_name: userName,
        user_input: input,
        ai_response: aiReply,
        scenario: SCENARIOS.find(s => s.key === scenario)?.label || '一般對話',
        timestamp: new Date()
      });
    } catch (error) {
      console.error("AI API Error:", error);
      setMessages([...newMessages, { role: 'assistant', content: '抱歉，AI 服務發生錯誤。' }]);
    }
    setLoading(false);
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="aichat-container">
      {/* *** HIGHLIGHT START: 新增 Header，包含標題和切換按鈕 *** */}
      <PageHeader 
        title="AI語音對話"
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        showBackButton={true} // 明確告訴組件要顯示返回按鈕
      />
      <div className="aichat-welcome">
        歡迎，{userName}！
      </div>
      {/* *** HIGHLIGHT END *** */}

      <div className="aichat-scenarios">
        {SCENARIOS.map(s => (
          <button
            key={s.key}
            className={`aichat-scenario-btn${scenario === s.key ? ' selected' : ''}`}
            onClick={() => handleScenarioChange(s.key)}
            disabled={loading}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="aichat-chatbox">
        {messages.map((msg, idx) => (
          <div key={idx} className={`aichat-msg ${msg.role}`}>
            <span className="aichat-msg-label">
              {msg.role === 'user' ? `${userName}: ` : 'AI: '}
            </span>
            {msg.content}
          </div>
        ))}
        {loading && <div className="aichat-loading">AI 正在回覆中...</div>}
      </div>
      <div className="aichat-inputbox">
        <textarea
          rows={2}
          className="aichat-input"
          placeholder="請輸入你的訊息⋯⋯"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={loading}
        />
        <button
          className="aichat-sendbtn"
          onClick={handleSend}
          disabled={loading}
        >
          發送
        </button>
      </div>
    </div>
  );
}

export default AiChatPage;
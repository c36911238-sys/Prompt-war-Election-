'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import './ChatAssistant.css';

const ChatAssistant = React.memo(function ChatAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Election Assistant. I can help you understand the election process, voting eligibility, and schedules. How can I help you today?', id: 'initial' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleLanguageChange = useCallback((e) => {
    setLanguage(e.target.value);
  }, []);

  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const sanitizedInput = DOMPurify.sanitize(input);
    const userMessage = { role: 'user', content: sanitizedInput, id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sanitizedInput, language })
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: DOMPurify.sanitize(data.response || "I'm sorry, I couldn't process that request right now."),
        id: (Date.now() + 1).toString()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Network error: Unable to reach the AI assistant. Please try again later.",
        id: (Date.now() + 1).toString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, language]);

  return (
    <div className="glass-panel chat-container animate-fade-in delay-200">
      <div className="chat-header">
        <div className="chat-title">
          <span className="material-symbols-outlined text-gradient">robot_2</span>
          <h3>AI Election Assistant</h3>
        </div>
        <select 
          className="lang-select input-glass" 
          value={language} 
          onChange={handleLanguageChange}
          aria-label="Select Chat Language"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="hi">हिंदी</option>
          <option value="fr">Français</option>
        </select>
      </div>

      <div className="chat-messages" aria-live="polite" aria-atomic="false">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.role}`}>
            <div 
              className={`message ${msg.role}`}
              dangerouslySetInnerHTML={{ __html: msg.content }} 
            />
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="message assistant typing-indicator" aria-label="Assistant is typing...">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me about the election..." 
          className="input-glass"
          disabled={isLoading}
          aria-label="Chat input"
        />
        <button type="submit" className="btn-primary" disabled={isLoading || !input.trim()} aria-label="Send Message">
          <span className="material-symbols-outlined">send</span>
        </button>
      </form>
    </div>
  );
});

export default ChatAssistant;

'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useAuth } from '@/contexts/AuthContext';
import { saveConversation } from '@/lib/firestore';
import { trackChatSent, trackLanguageChange, trackTTSPlayback } from '@/lib/analytics';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import './ChatAssistant.css';

// ---------------------------------------------------------------------------
// Sub-components — extracted for clarity and memoisation
// ---------------------------------------------------------------------------

/** Language selector dropdown */
const LanguageSelector = React.memo(function LanguageSelector({ value, onChange }) {
  return (
    <select
      className="lang-select input-glass"
      value={value}
      onChange={onChange}
      aria-label="Select chat language"
    >
      {SUPPORTED_LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
});

/** TTS speak button — plays Cloud TTS audio for an assistant message */
const SpeakButton = React.memo(function SpeakButton({ text, languageCode }) {
  const [playing, setPlaying] = useState(false);

  const handleSpeak = useCallback(async () => {
    if (playing) return;
    setPlaying(true);
    trackTTSPlayback(languageCode);
    try {
      const res  = await fetch('/api/tts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, languageCode }),
      });
      const data = await res.json();
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.onended = () => setPlaying(false);
        audio.play();
      } else {
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  }, [text, languageCode, playing]);

  return (
    <button
      className="tts-btn"
      onClick={handleSpeak}
      disabled={playing}
      aria-label={playing ? 'Playing audio…' : 'Read message aloud'}
      title="Read aloud"
    >
      <span className="material-symbols-outlined">
        {playing ? 'volume_up' : 'play_circle'}
      </span>
    </button>
  );
});

/** Single chat message bubble */
const MessageBubble = React.memo(function MessageBubble({ msg, languageCode }) {
  const ttsCode = useMemo(() =>
    SUPPORTED_LANGUAGES.find(l => l.code === languageCode)?.ttsCode || 'en-US',
    [languageCode]
  );

  return (
    <div className={`message-wrapper ${msg.role}`}>
      <div
        className={`message ${msg.role}`}
        dangerouslySetInnerHTML={{ __html: msg.content }}
      />
      {msg.role === 'assistant' && msg.id !== 'initial' && (
        <SpeakButton text={msg.content.replace(/<[^>]+>/g, '')} languageCode={ttsCode} />
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Random session ID — one per browser tab, stable across re-renders
// ---------------------------------------------------------------------------
const SESSION_ID = Math.random().toString(36).slice(2);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ChatAssistant = React.memo(function ChatAssistant() {
  const { user } = useAuth();

  const [messages, setMessages] = useState([
    {
      role:    'assistant',
      content: 'Hello! I am your AI Election Assistant powered by Gemini 2.0 Flash. I can help you understand the election process, voting eligibility, and schedules. How can I help you today?',
      id:      'initial',
    },
  ]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage]   = useState('en');
  const prevLanguage              = useRef('en');
  const messagesEndRef            = useRef(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Track language changes
  const handleLanguageChange = useCallback((e) => {
    const next = e.target.value;
    trackLanguageChange(prevLanguage.current, next);
    prevLanguage.current = next;
    setLanguage(next);
  }, []);

  const handleInputChange = useCallback((e) => setInput(e.target.value), []);

  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const sanitizedInput = DOMPurify.sanitize(input);
    const userMessage = {
      role:    'user',
      content: sanitizedInput,
      id:      Date.now().toString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Analytics — non-blocking
    trackChatSent(language, !!user);

    try {
      const response = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: sanitizedInput, language }),
      });

      const data = await response.json();
      const aiText = DOMPurify.sanitize(
        data.response || "I'm sorry, I couldn't process that request right now."
      );

      const assistantMessage = {
        role:    'assistant',
        content: aiText,
        id:      (Date.now() + 1).toString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Persist to Firestore if user is signed in (non-blocking)
      if (user) {
        saveConversation(user.uid, sanitizedInput, aiText, language, SESSION_ID);
      }

    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'Network error: Unable to reach the AI assistant. Please check your connection and try again.',
        id:      (Date.now() + 1).toString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, language, user]);

  return (
    <div className="glass-panel chat-container animate-fade-in delay-200">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title">
          <span className="material-symbols-outlined text-gradient">robot_2</span>
          <div>
            <h3>AI Election Assistant</h3>
            <span className="chat-subtitle">Powered by Gemini 2.0 Flash</span>
          </div>
        </div>
        <LanguageSelector value={language} onChange={handleLanguageChange} />
      </div>

      {/* Auth hint */}
      {!user && (
        <div className="chat-auth-hint" aria-live="polite">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>info</span>
          Sign in to save your chat history.
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages" aria-live="polite" aria-atomic="false" aria-label="Chat messages">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} languageCode={language} />
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="message-wrapper assistant">
            <div
              className="message assistant typing-indicator"
              aria-label="Assistant is typing…"
            >
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask me about the election…"
          className="input-glass"
          disabled={isLoading}
          aria-label="Chat input"
          maxLength={500}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </form>
    </div>
  );
});

export default ChatAssistant;

'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useAuth } from '@/contexts/AuthContext';
import { saveConversation } from '@/lib/firestore';
import { trackChatSent, trackLanguageChange, trackTTSPlayback } from '@/lib/analytics';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import './ChatAssistant.css';

// ---------------------------------------------------------------------------
// Custom hook — TTS audio playback
// ---------------------------------------------------------------------------

function useTts() {
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [ttsError, setTtsError]         = useState(null);

  const playTtsAudio = useCallback(async (messageText, languageCode) => {
    if (isTtsLoading) return;
    setIsTtsLoading(true);
    setTtsError(null);
    trackTTSPlayback(languageCode);
    try {
      const ttsResponse = await fetch('/api/tts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: messageText, languageCode }),
      });
      const ttsAudioResponse = await ttsResponse.json();
      if (ttsAudioResponse.audioContent) {
        const audio    = new Audio(`data:audio/mp3;base64,${ttsAudioResponse.audioContent}`);
        audio.onended  = () => setIsTtsLoading(false);
        audio.play();
      } else {
        setIsTtsLoading(false);
      }
    } catch (ttsRequestError) {
      setTtsError(ttsRequestError.message);
      setIsTtsLoading(false);
    }
  }, [isTtsLoading]);

  return { isTtsLoading, ttsError, playTtsAudio };
}

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
      id="language-selector"
    >
      {SUPPORTED_LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
});

/** TTS speak button — plays Cloud TTS audio for an assistant message */
const SpeakButton = React.memo(function SpeakButton({ messageText, languageCode }) {
  const { isTtsLoading, playTtsAudio } = useTts();

  const handlePlayAudio = useCallback(() => {
    playTtsAudio(messageText, languageCode);
  }, [messageText, languageCode, playTtsAudio]);

  return (
    <button
      className="tts-btn"
      onClick={handlePlayAudio}
      disabled={isTtsLoading}
      aria-label={isTtsLoading ? 'Loading audio…' : 'Read message aloud'}
      title="Read aloud"
      id={`tts-btn-${messageText.slice(0, 8).replace(/\s/g, '-')}`}
    >
      {isTtsLoading
        ? <span className="tts-spinner" aria-hidden="true" />
        : <span className="material-symbols-outlined">play_circle</span>
      }
    </button>
  );
});

/** Single chat message bubble */
const MessageBubble = React.memo(function MessageBubble({ chatMessage, languageCode }) {
  const ttsCode = useMemo(() =>
    SUPPORTED_LANGUAGES.find((language) => language.code === languageCode)?.ttsCode || 'en-US',
    [languageCode]
  );

  return (
    <div className={`message-wrapper ${chatMessage.role}`}>
      <div
        className={`message ${chatMessage.role}`}
        dangerouslySetInnerHTML={{ __html: chatMessage.content }}
      />
      {chatMessage.role === 'assistant' && chatMessage.id !== 'initial' && (
        <SpeakButton
          messageText={chatMessage.content.replace(/<[^>]+>/g, '')}
          languageCode={ttsCode}
        />
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

  const [chatHistory, setChatHistory]         = useState([
    {
      role:    'assistant',
      content: 'Hello! I am your AI Election Assistant powered by Gemini 2.0 Flash. I can help you understand the election process, voting eligibility, and schedules. How can I help you today?',
      id:      'initial',
    },
  ]);
  const [inputText, setInputText]             = useState('');
  const [isLoading, setIsLoading]             = useState(false);
  const [isHistorySaveError, setIsHistorySaveError] = useState(false);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [languageCode, setLanguageCode]       = useState('en');
  const previousLanguageCode                  = useRef('en');
  const messagesEndRef                        = useRef(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [chatHistory, scrollToBottom]);

  // Track language changes
  const handleLanguageChange = useCallback((event) => {
    const nextLanguageCode = event.target.value;
    trackLanguageChange(previousLanguageCode.current, nextLanguageCode);
    previousLanguageCode.current = nextLanguageCode;
    setLanguageCode(nextLanguageCode);
  }, []);

  const handleInputChange = useCallback((event) => setInputText(event.target.value), []);

  const handleSendMessage = useCallback(async (event) => {
    event.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const sanitizedInput = DOMPurify.sanitize(inputText);
    const userMessage = {
      role:    'user',
      content: sanitizedInput,
      id:      Date.now().toString(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsHistorySaveError(false);
    setHasNetworkError(false);

    // Analytics — non-blocking
    trackChatSent(languageCode, !!user);

    try {
      const apiResponse = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: sanitizedInput, language: languageCode }),
      });

      const chatData = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(chatData.error || 'API error');
      }

      const aiText = DOMPurify.sanitize(
        chatData.response || "Couldn't reach the assistant. Please try again."
      );

      const assistantMessage = {
        role:    'assistant',
        content: aiText,
        id:      (Date.now() + 1).toString(),
      };

      setChatHistory((prev) => [...prev, assistantMessage]);

      // Persist to Firestore if user is signed in (non-blocking)
      if (user) {
        const firestoreResult = await saveConversation(user.uid, sanitizedInput, aiText, languageCode, SESSION_ID);
        if (!firestoreResult) {
          setIsHistorySaveError(true);
        }
      }

    } catch {
      setHasNetworkError(true);
      setChatHistory((prev) => [...prev, {
        role:    'assistant',
        content: "Couldn't reach the assistant. Please try again.",
        id:      (Date.now() + 1).toString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, languageCode, user]);

  // Determine if chat is empty (only the initial greeting is present)
  const isChatEmpty = chatHistory.length === 1 && chatHistory[0].id === 'initial';

  return (
    <div
      className="glass-panel chat-container animate-fade-in delay-200"
      role="region"
      aria-label="AI Election Assistant chat"
    >
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title">
          <span className="material-symbols-outlined text-gradient" aria-hidden="true">robot_2</span>
          <div>
            <h3>AI Election Assistant</h3>
            <span className="chat-subtitle">Powered by Gemini 2.0 Flash</span>
          </div>
        </div>
        <LanguageSelector value={languageCode} onChange={handleLanguageChange} />
      </div>

      {/* Auth hint */}
      {!user && (
        <div className="chat-auth-hint" aria-live="polite">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">info</span>
          Sign in to save your chat history.
        </div>
      )}

      {/* Firestore save warning */}
      {isHistorySaveError && (
        <p
          className="save-warning"
          role="status"
          aria-live="polite"
        >
          ⚠️ History couldn&apos;t be saved. Your session continues normally.
        </p>
      )}

      {/* Messages */}
      <div
        className="chat-messages"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Chat messages"
        role="log"
      >
        {/* Empty state */}
        {isChatEmpty && !isLoading && (
          <div
            className="chat-empty-state"
            role="status"
            aria-label="No messages yet"
          >
            <span className="chat-empty-icon" aria-hidden="true">🗳️</span>
            <p className="chat-empty-title">Ask anything about the election process.</p>
            <p className="chat-empty-hint">
              Try: &ldquo;How do I register to vote?&rdquo;
            </p>
          </div>
        )}

        {chatHistory.map((chatMessage) => (
          chatMessage.id === 'initial' && !isChatEmpty ? null : (
            <MessageBubble
              key={chatMessage.id}
              chatMessage={chatMessage}
              languageCode={languageCode}
            />
          )
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="message-wrapper assistant" role="status" aria-label="Assistant is typing">
            <div
              className="message assistant typing-indicator"
              aria-label="Assistant is typing…"
            >
              <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Network error boundary */}
      {hasNetworkError && (
        <div role="alert" className="chat-error-boundary">
          <p>The assistant is temporarily unavailable. Try again in a moment.</p>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="chat-input-form"
        aria-label="Send a message"
        role="form"
      >
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Ask me about the election…"
          className="input-glass"
          disabled={isLoading}
          aria-label="Type your election question"
          aria-describedby={hasNetworkError ? 'chat-network-error' : undefined}
          maxLength={500}
          id="chat-input"
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !inputText.trim()}
          aria-label="Send message"
          id="send-message-button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">send</span>
        </button>
      </form>
    </div>
  );
});

export default ChatAssistant;

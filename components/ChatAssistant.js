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
  const [hasTtsError, setHasTtsError]   = useState(null);

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
      setHasTtsError(ttsRequestError.message);
      setIsTtsLoading(false);
    }
  }, [isTtsLoading]);

  return { isTtsLoading, hasTtsError, playTtsAudio };
}

// ---------------------------------------------------------------------------
// Sub-components — extracted for clarity and memoisation
// ---------------------------------------------------------------------------

/** Language selector dropdown */
const LanguageSelector = React.memo(({ value, onChange }) => {
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
const SpeakButton = React.memo(({ messageText, languageCode }) => {
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
const MessageBubble = React.memo(({ chatMessage, languageCode }) => {
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
      {chatMessage.role === 'assistant' && chatMessage.id !== INITIAL_MESSAGE_ID && (
        <SpeakButton
          messageText={chatMessage.content.replace(/<[^>]+>/g, '')}
          languageCode={ttsCode}
        />
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_MESSAGE_LENGTH = 2000;
const MAX_INPUT_LENGTH = 500;
const INITIAL_MESSAGE_ID = 'initial';

// ---------------------------------------------------------------------------
// Random session ID — one per browser tab, stable across re-renders
// ---------------------------------------------------------------------------
const RANDOM_RADIX = 36;
const RANDOM_SLICE_INDEX = 2;
const SESSION_ID = Math.random().toString(RANDOM_RADIX).slice(RANDOM_SLICE_INDEX);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ChatAssistant = React.memo(() => {
  const { user } = useAuth();

  // ─── State ─────────────────────────────────────────────
  const [chatHistory, setChatHistory]         = useState([
    {
      role:    'assistant',
      content: 'Hello! I am your AI Election Assistant powered by Gemini 2.0 Flash. I can help you understand the election process, voting eligibility, and schedules. How can I help you today?',
      id:      INITIAL_MESSAGE_ID,
    },
  ]);
  const [inputText, setInputText]             = useState('');
  const [isLoading, setIsLoading]             = useState(false);
  const [isHistorySaveError, setIsHistorySaveError] = useState(false);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [inputValidationError, setInputValidationError] = useState(null);
  const [languageCode, setLanguageCode]       = useState('en');
  const previousLanguageCode                  = useRef('en');
  const messagesEndRef                        = useRef(null);

  // ─── Effects ───────────────────────────────────────────
  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [chatHistory, scrollToBottom]);

  // ─── Handlers ──────────────────────────────────────────
  // Track language changes
  const handleLanguageChange = useCallback((event) => {
    const nextLanguageCode = event.target.value;
    trackLanguageChange(previousLanguageCode.current, nextLanguageCode);
    previousLanguageCode.current = nextLanguageCode;
    setLanguageCode(nextLanguageCode);
  }, []);

  const handleInputChange = useCallback((event) => setInputText(event.target.value), []);

  const sendMessageToApi = async (message, langCode) => {
    const apiResponse = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message, language: langCode }),
    });

    const chatData = await apiResponse.json();
    if (!apiResponse.ok) {
      throw new Error(chatData.error || 'API error');
    }
    return chatData.response;
  };

  const handleSendMessage = useCallback(async (event) => {
    event.preventDefault();

    const trimmedMessage = inputText.trim();

    if (!trimmedMessage) {
      setInputValidationError('Please enter a question before sending.');
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setInputValidationError(`Your message must be under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    if (isLoading) return;

    setInputValidationError(null);

    const sanitizedInput = DOMPurify.sanitize(trimmedMessage);
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
      const rawAiText = await sendMessageToApi(sanitizedInput, languageCode);
      const aiText = DOMPurify.sanitize(
        rawAiText || "Couldn't reach the assistant. Please try again."
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
  const isChatEmpty = chatHistory.length === 1 && chatHistory[0].id === INITIAL_MESSAGE_ID;

  // ─── Render ────────────────────────────────────────────
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
          chatMessage.id === INITIAL_MESSAGE_ID && !isChatEmpty ? null : (
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
      {inputValidationError && (
        <p 
          className="input-validation-error" 
          role="alert"
          aria-live="assertive"
          style={{ color: '#ff4d4f', margin: '0 0 10px 0', fontSize: '0.9rem' }}
        >
          {inputValidationError}
        </p>
      )}
      <form
        onSubmit={handleSendMessage}
        className="chat-input-form"
        aria-label="Send a message"
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
          maxLength={MAX_INPUT_LENGTH}
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

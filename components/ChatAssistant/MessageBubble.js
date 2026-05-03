/**
 * Chat message bubble component
 * Displays individual chat messages with consistent styling and functionality
 */

import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { SpeakButton } from './SpeakButton';

/**
 * Message types for styling and behavior
 */
const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};

/**
 * Single chat message bubble component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object
 * @param {string} props.message.role - Message role (user, assistant, system)
 * @param {string} props.message.content - Message content (HTML)
 * @param {string} props.message.id - Unique message ID
 * @param {boolean} props.message.fallback - Whether this is a fallback response
 * @param {string} props.languageCode - Current language code for TTS
 * @param {boolean} props.showTts - Whether to show TTS button (default: true for assistant messages)
 * @param {string} props.className - Additional CSS classes
 * @returns {React.ReactElement} Message bubble component
 */
export const MessageBubble = React.memo(function MessageBubble({ 
  message, 
  languageCode,
  showTts = true,
  className = ''
}) {
  // Validate message object
  if (!message || typeof message !== 'object') {
    console.error('[MessageBubble] Invalid message object provided');
    return null;
  }

  const { role, content, id, fallback } = message;

  // Validate required fields
  if (!role || !content || !id) {
    console.error('[MessageBubble] Message missing required fields:', { role, content, id });
    return null;
  }

  // Sanitize content for security
  const sanitizedContent = useMemo(() => {
    if (typeof content !== 'string') {
      return String(content);
    }
    
    // For user messages, we want to be more restrictive
    if (role === MESSAGE_TYPES.USER) {
      return DOMPurify.sanitize(content, { 
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
        ALLOWED_ATTR: []
      });
    }
    
    // For assistant messages, allow more formatting
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOWED_PROTOCOLS: ['http', 'https', 'mailto']
    });
  }, [content, role]);

  // Extract plain text for TTS
  const plainTextContent = useMemo(() => {
    return sanitizedContent
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }, [sanitizedContent]);

  // Determine if TTS should be shown
  const shouldShowTts = useMemo(() => {
    return showTts && 
           role === MESSAGE_TYPES.ASSISTANT && 
           id !== 'initial' && 
           plainTextContent.length > 0;
  }, [showTts, role, id, plainTextContent]);

  // Build CSS classes
  const wrapperClasses = [
    'message-wrapper',
    role,
    fallback ? 'fallback' : '',
    className
  ].filter(Boolean).join(' ');

  const messageClasses = [
    'message',
    role,
    fallback ? 'fallback' : ''
  ].filter(Boolean).join(' ');

  // Handle message click for user messages (for editing in future)
  const handleMessageClick = () => {
    if (role === MESSAGE_TYPES.USER) {
      // Future: implement message editing
      console.log('[MessageBubble] User message clicked:', id);
    }
  };

  return (
    <div 
      className={wrapperClasses}
      data-message-id={id}
      data-message-role={role}
    >
      {/* Message content */}
      <div
        className={messageClasses}
        onClick={role === MESSAGE_TYPES.USER ? handleMessageClick : undefined}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        role={role === MESSAGE_TYPES.ASSISTANT ? 'log' : undefined}
        aria-live={role === MESSAGE_TYPES.ASSISTANT ? 'polite' : undefined}
      />

      {/* Message metadata */}
      <div className="message-metadata">
        {/* Fallback indicator */}
        {fallback && (
          <span 
            className="fallback-indicator"
            title="This is a fallback response"
            aria-label="Fallback response"
          >
            <span className="material-symbols-outlined">offline_bolt</span>
          </span>
        )}

        {/* TTS button for assistant messages */}
        {shouldShowTts && (
          <SpeakButton
            messageText={plainTextContent}
            languageCode={languageCode}
          />
        )}

        {/* Message actions (future: copy, edit, etc.) */}
        <div className="message-actions">
          {/* Future: Add copy button, edit button, etc. */}
        </div>
      </div>
    </div>
  );
});

/**
 * System message component for special messages
 */
export const SystemMessage = React.memo(function SystemMessage({ 
  content, 
  type = 'info',
  className = '' 
}) {
  const systemClasses = [
    'message-wrapper',
    'system',
    `system-${type}`,
    className
  ].filter(Boolean).join(' ');

  const iconMap = {
    info: 'info',
    warning: 'warning',
    error: 'error',
    success: 'check_circle'
  };

  return (
    <div className={systemClasses}>
      <div className="message system">
        <span className="material-symbols-outlined system-icon">
          {iconMap[type] || 'info'}
        </span>
        <span className="system-content">{content}</span>
      </div>
    </div>
  );
});

/**
 * Typing indicator component
 */
export const TypingIndicator = React.memo(function TypingIndicator({ 
  className = '' 
}) {
  return (
    <div 
      className={`message-wrapper assistant typing ${className}`}
      role="status" 
      aria-label="Assistant is typing"
    >
      <div className="message assistant typing-indicator">
        <span className="typing-dot" aria-hidden="true" />
        <span className="typing-dot" aria-hidden="true" />
        <span className="typing-dot" aria-hidden="true" />
      </div>
    </div>
  );
});

/**
 * Message list component for rendering multiple messages
 */
export const MessageList = React.memo(function MessageList({
  messages,
  languageCode,
  isLoading = false,
  className = ''
}) {
  if (!Array.isArray(messages)) {
    console.error('[MessageList] Messages must be an array');
    return null;
  }

  return (
    <div className={`message-list ${className}`}>
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          languageCode={languageCode}
        />
      ))}
      
      {/* Typing indicator */}
      {isLoading && <TypingIndicator />}
    </div>
  );
});

export default MessageBubble;
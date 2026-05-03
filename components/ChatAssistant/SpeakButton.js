/**
 * TTS Speak Button component
 * Provides text-to-speech functionality for chat messages
 */

import React, { useCallback, useMemo } from 'react';
import { IconButton } from '../Button';
import { useTts } from './useTts';
import { getTtsLanguageCode } from './LanguageSelector';

/**
 * TTS speak button component
 * Plays Cloud TTS audio for assistant messages
 * 
 * @param {Object} props - Component props
 * @param {string} props.messageText - Text to convert to speech
 * @param {string} props.languageCode - Language code for TTS
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.size - Button size (sm, md, lg)
 * @returns {React.ReactElement} Speak button component
 */
export const SpeakButton = React.memo(function SpeakButton({ 
  messageText, 
  languageCode,
  className = '',
  disabled = false,
  size = 'sm'
}) {
  const { isTtsLoading, ttsError, playTtsAudio, clearTtsError } = useTts();

  // Convert chat language code to TTS language code
  const ttsLanguageCode = useMemo(() => 
    getTtsLanguageCode(languageCode), 
    [languageCode]
  );

  // Clean message text for TTS (remove HTML tags)
  const cleanMessageText = useMemo(() => {
    if (!messageText || typeof messageText !== 'string') {
      return '';
    }
    
    return messageText
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }, [messageText]);

  // Handle play audio click
  const handlePlayAudio = useCallback(() => {
    if (!cleanMessageText) {
      console.warn('[SpeakButton] No text available for TTS');
      return;
    }

    // Clear any previous error
    if (ttsError) {
      clearTtsError();
    }

    playTtsAudio(cleanMessageText, ttsLanguageCode);
  }, [cleanMessageText, ttsLanguageCode, playTtsAudio, ttsError, clearTtsError]);

  // Don't render if no text available
  if (!cleanMessageText) {
    return null;
  }

  // Determine button state and icon
  const isDisabled = disabled || isTtsLoading || !cleanMessageText;
  const buttonIcon = isTtsLoading 
    ? <span className="tts-spinner" aria-hidden="true" />
    : <span className="material-symbols-outlined">play_circle</span>;

  const ariaLabel = isTtsLoading 
    ? 'Loading audio...' 
    : ttsError 
      ? `Audio error: ${ttsError}. Click to retry.`
      : 'Read message aloud';

  const buttonClasses = [
    'tts-btn',
    ttsError ? 'tts-error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="speak-button-wrapper">
      <IconButton
        icon={buttonIcon}
        onClick={handlePlayAudio}
        disabled={isDisabled}
        ariaLabel={ariaLabel}
        title={ariaLabel}
        size={size}
        variant="ghost"
        className={buttonClasses}
      />
      
      {/* Error tooltip */}
      {ttsError && (
        <div 
          className="tts-error-tooltip" 
          role="tooltip"
          aria-live="polite"
        >
          <span className="material-symbols-outlined">error</span>
          <span className="tts-error-message">{ttsError}</span>
        </div>
      )}
    </div>
  );
});

/**
 * Batch speak button for multiple messages
 * Allows playing TTS for multiple messages in sequence
 */
export const BatchSpeakButton = React.memo(function BatchSpeakButton({
  messages,
  languageCode,
  className = '',
  disabled = false
}) {
  const { isTtsLoading, playTtsAudio } = useTts();

  const handleBatchPlay = useCallback(async () => {
    if (!messages || messages.length === 0) return;

    const ttsLanguageCode = getTtsLanguageCode(languageCode);
    
    for (const message of messages) {
      if (message.role === 'assistant' && message.content) {
        const cleanText = message.content.replace(/<[^>]+>/g, '').trim();
        if (cleanText) {
          await playTtsAudio(cleanText, ttsLanguageCode);
          // Wait for current audio to finish before playing next
          await new Promise(resolve => {
            const checkLoading = () => {
              if (!isTtsLoading) {
                resolve();
              } else {
                setTimeout(checkLoading, 100);
              }
            };
            checkLoading();
          });
        }
      }
    }
  }, [messages, languageCode, playTtsAudio, isTtsLoading]);

  if (!messages || messages.length === 0) {
    return null;
  }

  const assistantMessages = messages.filter(msg => 
    msg.role === 'assistant' && 
    msg.content && 
    msg.id !== 'initial'
  );

  if (assistantMessages.length === 0) {
    return null;
  }

  return (
    <IconButton
      icon={<span className="material-symbols-outlined">playlist_play</span>}
      onClick={handleBatchPlay}
      disabled={disabled || isTtsLoading}
      ariaLabel={`Play all ${assistantMessages.length} assistant messages`}
      title={`Play all ${assistantMessages.length} messages`}
      size="sm"
      variant="ghost"
      className={`batch-speak-btn ${className}`}
    />
  );
});

export default SpeakButton;
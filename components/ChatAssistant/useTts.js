/**
 * Custom hook for Text-to-Speech functionality
 * Handles TTS audio playback with error handling and loading states
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { trackTTSPlayback } from '@/lib/analytics';
import { LIMITS } from '@/lib/constants';

/**
 * Custom hook for TTS audio playback
 * 
 * @returns {Object} TTS state and functions
 * @returns {boolean} returns.isTtsLoading - Whether TTS is currently loading/playing
 * @returns {string|null} returns.ttsError - Current TTS error message
 * @returns {Function} returns.playTtsAudio - Function to play TTS audio
 * @returns {Function} returns.stopTtsAudio - Function to stop current TTS audio
 */
export function useTts() {
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState(null);
  const audioRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Play TTS audio for given text and language
   * 
   * @param {string} messageText - Text to convert to speech
   * @param {string} languageCode - Language code for TTS
   */
  const playTtsAudio = useCallback(async (messageText, languageCode) => {
    // Prevent multiple simultaneous requests
    if (isTtsLoading) return;
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsTtsLoading(true);
    setTtsError(null);
    
    // Track analytics
    trackTTSPlayback(languageCode);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Validate input
      if (!messageText || typeof messageText !== 'string') {
        throw new Error('Invalid text provided for TTS');
      }

      if (messageText.length > LIMITS.TTS_TEXT_MAX) {
        throw new Error(`Text too long for TTS. Maximum ${LIMITS.TTS_TEXT_MAX} characters allowed.`);
      }

      // Make TTS request with timeout
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: messageText.trim(), 
          languageCode 
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!ttsResponse.ok) {
        const errorData = await ttsResponse.json();
        throw new Error(errorData.error || `TTS request failed with status ${ttsResponse.status}`);
      }

      const ttsAudioResponse = await ttsResponse.json();
      
      if (!ttsAudioResponse.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      // Create and play audio
      const audio = new Audio(`data:audio/mp3;base64,${ttsAudioResponse.audioContent}`);
      audioRef.current = audio;

      // Set up audio event handlers
      audio.onended = () => {
        setIsTtsLoading(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setTtsError('Failed to play audio');
        setIsTtsLoading(false);
        audioRef.current = null;
      };

      audio.onabort = () => {
        setIsTtsLoading(false);
        audioRef.current = null;
      };

      // Play the audio
      await audio.play();

    } catch (error) {
      // Handle aborted requests silently
      if (error.name === 'AbortError') {
        return;
      }

      console.error('[TTS] Audio playback error:', error);
      setTtsError(error.message || 'Failed to play audio');
      setIsTtsLoading(false);
      audioRef.current = null;
    }
  }, [isTtsLoading]);

  /**
   * Stop currently playing TTS audio
   */
  const stopTtsAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsTtsLoading(false);
    setTtsError(null);
  }, []);

  /**
   * Clear TTS error
   */
  const clearTtsError = useCallback(() => {
    setTtsError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isTtsLoading,
    ttsError,
    playTtsAudio,
    stopTtsAudio,
    clearTtsError,
  };
}
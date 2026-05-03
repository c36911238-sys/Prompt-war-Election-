/**
 * Language selector component for chat interface
 * Provides consistent language selection with accessibility support
 */

import React from 'react';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

/**
 * Language selector dropdown component
 * 
 * @param {Object} props - Component props
 * @param {string} props.value - Currently selected language code
 * @param {Function} props.onChange - Function called when language changes
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether selector is disabled
 * @param {string} props.ariaLabel - Accessibility label
 * @returns {React.ReactElement} Language selector component
 */
export const LanguageSelector = React.memo(function LanguageSelector({ 
  value, 
  onChange, 
  className = '',
  disabled = false,
  ariaLabel = 'Select chat language'
}) {
  // Validate that current value is supported
  const isValidLanguage = SUPPORTED_LANGUAGES.some(lang => lang.code === value);
  
  if (!isValidLanguage) {
    console.warn(`[LanguageSelector] Invalid language code: ${value}. Falling back to English.`);
  }

  const handleChange = (event) => {
    const newLanguage = event.target.value;
    
    // Validate the selected language
    const selectedLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === newLanguage);
    if (!selectedLanguage) {
      console.error(`[LanguageSelector] Invalid language selected: ${newLanguage}`);
      return;
    }

    if (onChange) {
      onChange(event);
    }
  };

  const classes = ['lang-select', 'input-glass', className].filter(Boolean).join(' ');

  return (
    <div className="language-selector-wrapper">
      <label htmlFor="language-selector" className="sr-only">
        {ariaLabel}
      </label>
      <select
        id="language-selector"
        className={classes}
        value={isValidLanguage ? value : 'en'}
        onChange={handleChange}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {SUPPORTED_LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      
      {/* Language indicator icon */}
      <span 
        className="language-selector-icon material-symbols-outlined" 
        aria-hidden="true"
      >
        language
      </span>
    </div>
  );
});

/**
 * Get language display name from code
 * 
 * @param {string} languageCode - Language code to look up
 * @returns {string} Display name for the language
 */
export function getLanguageDisplayName(languageCode) {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
  return language ? language.label : 'Unknown Language';
}

/**
 * Get TTS language code from chat language code
 * 
 * @param {string} languageCode - Chat language code
 * @returns {string} TTS language code
 */
export function getTtsLanguageCode(languageCode) {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
  return language ? language.ttsCode : 'en-US';
}

/**
 * Validate if language code is supported
 * 
 * @param {string} languageCode - Language code to validate
 * @returns {boolean} Whether the language is supported
 */
export function isLanguageSupported(languageCode) {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === languageCode);
}

export default LanguageSelector;
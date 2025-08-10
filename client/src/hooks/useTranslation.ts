import { useState, useEffect, useCallback } from 'react';
import { 
  languages, 
  type Language, 
  getNestedValue, 
  interpolate,
  getSavedLanguage,
  saveLanguage,
  DEFAULT_LANGUAGE 
} from '@/i18n';

export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(getSavedLanguage());

  useEffect(() => {
    // Load saved language on mount
    const saved = getSavedLanguage();
    if (saved !== currentLanguage) {
      setCurrentLanguage(saved);
    }
  }, []);

  const changeLanguage = useCallback((language: Language) => {
    setCurrentLanguage(language);
    saveLanguage(language);
  }, []);

  const t = useCallback((key: string, values?: Record<string, string | number>) => {
    const translations = languages[currentLanguage];
    let translation = getNestedValue(translations, key);
    
    // Fallback to English if translation not found
    if (translation === key && currentLanguage !== DEFAULT_LANGUAGE) {
      translation = getNestedValue(languages[DEFAULT_LANGUAGE], key);
    }
    
    // If still not found, return the key
    if (translation === key) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    
    // Interpolate values if provided
    if (values) {
      return interpolate(translation, values);
    }
    
    return translation;
  }, [currentLanguage]);

  return {
    t,
    language: currentLanguage,
    changeLanguage,
    availableLanguages: Object.keys(languages) as Language[],
  };
}
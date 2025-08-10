import { en } from './locales/en';
import { fr } from './locales/fr';
import { ht } from './locales/ht';

export type Language = 'en' | 'fr' | 'ht';

export const languages = {
  en,
  fr,
  ht,
} as const;

export const languageNames = {
  en: 'English',
  fr: 'Français',
  ht: 'Kreyòl Ayisyen',
} as const;

export type TranslationKey = keyof typeof en;

// Helper function to get nested translation values
export function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
}

// Template string interpolation
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key]?.toString() || match;
  });
}

// Default language
export const DEFAULT_LANGUAGE: Language = 'en';

// Get saved language from localStorage or use default
export function getSavedLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  
  const saved = localStorage.getItem('eduexam-language') as Language;
  return saved && saved in languages ? saved : DEFAULT_LANGUAGE;
}

// Save language to localStorage
export function saveLanguage(language: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('eduexam-language', language);
}
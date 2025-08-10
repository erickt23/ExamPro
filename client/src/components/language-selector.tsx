import { useTranslation } from '@/hooks/useTranslation';
import { languageNames, type Language } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSelectorProps {
  className?: string;
}

export default function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, changeLanguage, t } = useTranslation();

  const handleLanguageChange = (value: Language) => {
    if (value !== language) {
      changeLanguage(value);
      // Force page reload to refresh all content with new language
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const getLanguageFlag = (lang: Language) => {
    switch (lang) {
      case 'en':
        return '🇺🇸';
      case 'fr':
        return '🇫🇷';
      case 'ht':
        return '🇭🇹';
      default:
        return '🌐';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-lg">{getLanguageFlag(language)}</span>
              <span className="hidden sm:inline">{languageNames[language]}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(languageNames).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getLanguageFlag(code as Language)}</span>
                <span>{name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
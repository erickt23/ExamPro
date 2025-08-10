import { useTranslation } from '@/hooks/useTranslation';
import { languageNames, type Language } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  className?: string;
}

export default function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, changeLanguage, t } = useTranslation();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="h-4 w-4 text-gray-500" />
      <Select value={language} onValueChange={(value: Language) => changeLanguage(value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('language.selectLanguage')} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(languageNames).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
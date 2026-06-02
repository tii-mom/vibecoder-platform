import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { Language } from '../i18n/types';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
  ];

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#0F1122]/90 hover:bg-[#1A1C36] border border-[#23264F] hover:border-[#383C70] rounded-full text-xs font-semibold text-gray-250 hover:text-white transition-all duration-200 cursor-pointer shadow-md select-none outline-none"
        title="Switch Language"
      >
        <Globe size={14} className="text-[#8C84FF] animate-pulse" />
        <span className="font-mono uppercase text-[10px] tracking-wide">{currentLang.flag} {currentLang.code}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-[#090A13]/95 backdrop-blur-lg border border-[#232646] rounded-2xl py-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#181C30] mb-1">
            <span className="text-[9px] font-mono text-gray-500 tracking-wider block uppercase font-bold">Select Language</span>
          </div>
          {languages.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-all text-left cursor-pointer hover:bg-[#161933] ${
                  isSelected ? 'text-[#8B83FF] bg-[#121429]/60 font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
                {isSelected && <Check size={12} className="text-[#8B83FF] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

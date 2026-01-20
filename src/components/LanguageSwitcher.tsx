'use client';

import { useI18n } from '@/lib/I18nContext';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en';
    setLocale(newLocale);
    // 保存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-locale', newLocale);
    }
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                 bg-white/70 backdrop-blur-md border border-gray-200 
                 text-gray-800 text-sm font-medium
                 hover:bg-white/90 transition-all duration-200
                 shadow-lg hover:shadow-xl"
      title={locale === 'en' ? '切换到中文' : 'Switch to English'}
    >
      <span className="text-base">🌐</span>
      <span>{locale === 'en' ? '中文' : 'EN'}</span>
    </button>
  );
}

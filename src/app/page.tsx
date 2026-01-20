'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/I18nContext';
import { TranslationKey } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface AIOpponent {
  id: number;
  name: string;
  display_name: string;
  display_name_en: string | null;
  avatar: string | null;
  difficulty: string;
  description: string | null;
  description_en: string | null;
  model: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: {
    total_player_wins: number;
    total_ai_wins: number;
    total_draws: number;
    total_games: number;
  };
  byAI: {
    id: number;
    name: string;
    name_en: string | null;
    avatar: string;
    difficulty: string;
    games_played: number;
    player_wins: number;
    ai_wins: number;
    draws: number;
    player_win_rate: number;
  }[];
}

const GITHUB_URL = 'https://github.com/greywen/rps';
const DISCLAIMER_KEY = 'rps_disclaimer_accepted';

export default function Home() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [aiOpponents, setAiOpponents] = useState<AIOpponent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedAI, setSelectedAI] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    fetchData();
    // 检查是否首次访问
    const disclaimerAccepted = localStorage.getItem(DISCLAIMER_KEY);
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
    }
  }, []);

  const acceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setShowDisclaimer(false);
  };

  const fetchData = async () => {
    try {
      const [aiOpponentsRes, statsRes] = await Promise.all([
        fetch('/api/ai-configs'),
        fetch('/api/stats')
      ]);
      
      const aiOpponentsData = await aiOpponentsRes.json();
      const statsData = await statsRes.json();
      
      if (aiOpponentsData.success) {
        setAiOpponents(aiOpponentsData.data);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Loading failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (!selectedAI) return;
    
    setStarting(true);
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiConfigId: selectedAI })
      });
      
      const data = await res.json();
      if (data.success) {
        router.push(`/game/${data.data.session.id}`);
      }
    } catch (error) {
      console.error('Start game failed:', error);
    } finally {
      setStarting(false);
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    const difficultyKeys: Record<string, TranslationKey> = {
      normal: 'normal',
      chaos: 'chaos'
    };
    const colors: Record<string, string> = {
      normal: 'bg-green-100 text-green-700',
      chaos: 'bg-red-100 text-red-700'
    };
    return { 
      text: t(difficultyKeys[difficulty] || 'unknown'), 
      color: colors[difficulty] || 'bg-gray-500' 
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100 flex items-center justify-center">
        <div className="text-gray-700 text-2xl animate-pulse">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100 p-4 sm:p-6 md:p-8">
      {/* 免责声明弹框 */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t('disclaimer')}</h2>
            </div>
            <div className="space-y-4 text-gray-600 text-sm sm:text-base">
              <p className="flex items-start gap-2">
                <span className="text-rose-500">•</span>
                {t('disclaimerContent1')}
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                {t('disclaimerContent2')}
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                {t('disclaimerContent3')}
              </p>
              <p className="flex items-start gap-2">
                <span className="text-violet-500">•</span>
                {t('disclaimerContent4')}
              </p>
            </div>
            <button
              onClick={acceptDisclaimer}
              className="mt-6 w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full font-bold text-lg hover:scale-105 transition-all cursor-pointer"
            >
              {t('iUnderstand')}
            </button>
          </div>
        </div>
      )}

      {/* 左上角 GitHub 图标 */}
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-9 h-9 rounded-full 
                   bg-white/70 backdrop-blur-md border border-gray-200 
                   text-gray-700 hover:text-gray-900 hover:bg-white/90 
                   transition-all duration-200 shadow-lg hover:shadow-xl"
        title="GitHub"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>

      <LanguageSwitcher />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 sm:w-72 h-40 sm:h-72 bg-pink-300 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute top-1/2 -right-20 w-48 sm:w-96 h-48 sm:h-96 bg-violet-300 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-32 left-1/3 w-40 sm:w-80 h-40 sm:h-80 bg-amber-300 rounded-full opacity-30 animate-pulse"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-800 mb-2 sm:mb-4 drop-shadow-sm">
            {t('title')}
          </h1>
          <h2 className="text-xl sm:text-xl md:text-2xl font-bold text-rose-500 mb-2 drop-shadow-sm">
            {t('subtitle')}
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg">
            {t('tagline')}
          </p>
        </div>

        {stats && (
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xl">
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-rose-500 drop-shadow-sm">
                  {stats.total.total_ai_wins}
                </div>
                <div className="text-gray-600 mt-1 text-xs sm:text-sm md:text-base">{t('aiWins')}</div>
              </div>
              <div className="text-center px-2 sm:px-4 md:px-8">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-400">VS</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  {stats.total.total_games} {t('games')}
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-amber-500 drop-shadow-sm">
                  {stats.total.total_player_wins}
                </div>
                <div className="text-gray-600 mt-1 text-xs sm:text-sm md:text-base">{t('humanWins')}</div>
              </div>
            </div>
            <div className="text-center mt-4">
              <span className="text-gray-500">{t('draws')}: {stats.total.total_draws}</span>
              <button
                onClick={() => setShowStats(!showStats)}
                className="ml-4 text-gray-700 hover:text-gray-900 underline transition-colors cursor-pointer"
              >
                {showStats ? t('hideDetails') : t('showDetails')}
              </button>
            </div>

            {showStats && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-gray-800 text-lg font-semibold mb-4">{t('aiStatistics')}</h3>
                <div className="grid gap-4">
                  {stats.byAI.map((ai) => {
                    const aiDisplayName = locale === 'en' && ai.name_en ? ai.name_en : ai.name;
                    return (
                    <div key={ai.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl flex items-center justify-center w-10 h-10">
                          {ai.avatar?.startsWith('/') ? (
                            <img src={ai.avatar} alt={aiDisplayName} className="w-8 h-8" />
                          ) : (
                            ai.avatar || '🤖'
                          )}
                        </span>
                        <div>
                          <div className="text-gray-800 font-medium">{aiDisplayName}</div>
                          <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${getDifficultyLabel(ai.difficulty).color}`}>
                            {getDifficultyLabel(ai.difficulty).text}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-700">
                          {t('played')} <span className="font-bold">{ai.games_played}</span> {t('gamesPlayed')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {t('humanWinRate')}: <span className="text-amber-600 font-medium">{ai.player_win_rate}%</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('win')}{ai.player_wins} / {t('lose')}{ai.ai_wins} / {t('drawShort')}{ai.draws}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
          <h3 className="text-gray-800 text-base sm:text-lg md:text-xl font-semibold mb-4 sm:mb-6 text-center">
            {t('chooseOpponent')}
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
            {aiOpponents.map((ai) => {
              const displayName = locale === 'en' && ai.display_name_en ? ai.display_name_en : ai.display_name;
              const description = locale === 'en' && ai.description_en ? ai.description_en : ai.description;
              return (
              <button
                key={ai.id}
                onClick={() => setSelectedAI(ai.id)}
                className={`p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                  selectedAI === ai.id
                    ? 'bg-gradient-to-br from-rose-100 to-violet-100 shadow-lg ring-2 sm:ring-4 ring-rose-400'
                    : 'bg-white/60 hover:bg-white/90'
                }`}
              >
                <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 flex items-center justify-center" style={{ animationDelay: `${ai.id * 100}ms` }}>
                  {ai.avatar?.startsWith('/') ? (
                    <img src={ai.avatar} alt={displayName} className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" />
                  ) : (
                    ai.avatar || '🤖'
                  )}
                </div>
                <div className={`font-bold text-sm sm:text-base ${selectedAI === ai.id ? 'text-rose-600' : 'text-gray-800'}`}>
                  {displayName}
                </div>
                <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                  selectedAI === ai.id 
                    ? 'bg-violet-200 text-violet-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <span className="text-[10px]">🧠</span>
                  <span>{ai.model}</span>
                </div>
                {description && (
                  <div className={`text-xs mt-1 sm:mt-2 line-clamp-2 ${selectedAI === ai.id ? 'text-rose-500' : 'text-gray-500'}`}>
                    {description}
                  </div>
                )}
              </button>
              );
            })}
          </div>

          <div className="text-center">
            <button
              onClick={startGame}
              disabled={!selectedAI || starting}
              className={`px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-base sm:text-lg md:text-xl font-bold transition-all duration-300 transform cursor-pointer ${
                selectedAI && !starting
                  ? 'bg-gradient-to-r from-rose-400 to-violet-500 text-white hover:scale-110 hover:shadow-xl active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {starting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('starting')}
                </span>
              ) : (
                t('startGame')
              )}
            </button>
            {!selectedAI && (
              <p className="text-gray-500 mt-3 text-sm">{t('selectOpponentFirst')}</p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>{t('gameRules')}</p>
          <p className="mt-1">{t('rpsRules')}</p>
          
          {/* GitHub 链接 */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors group"
          >
            <svg
              className="w-5 h-5 group-hover:scale-110 transition-transform"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="text-xs">{t('welcomeToStar')} ⭐</span>
          </a>
        </div>
      </div>
    </div>
  );
}

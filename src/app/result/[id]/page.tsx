'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/I18nContext';

type Choice = 'rock' | 'paper' | 'scissors';
type RoundResult = 'player_win' | 'ai_win' | 'draw';

interface GameSession {
  id: string;
  ai_id: number;
  ai_name: string;
  ai_avatar: string;
  player_wins: number;
  ai_wins: number;
  draws: number;
  total_rounds: number;
  status: string;
  ai_comment: string | null;
}

interface GameRound {
  id: number;
  round_number: number;
  player_choice: Choice;
  ai_choice: Choice;
  result: RoundResult;
}

const CHOICE_EMOJIS: Record<Choice, string> = {
  rock: '✊',
  paper: '🖐️',
  scissors: '✌️'
};

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<GameSession | null>(null);
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const CHOICE_NAMES: Record<Choice, string> = {
    rock: t('rock'),
    paper: t('paper'),
    scissors: t('scissors')
  };

  useEffect(() => {
    fetchResult();
  }, [resolvedParams.id]);

  const fetchResult = async () => {
    try {
      const res = await fetch(`/api/game?sessionId=${resolvedParams.id}`);
      const data = await res.json();
      
      if (data.success) {
        if (data.data.session.status !== 'finished') {
          router.push(`/game/${resolvedParams.id}`);
          return;
        }
        setSession(data.data.session);
        setRounds(data.data.rounds);
        
        // 如果玩家赢了，显示彩带
        if (data.data.session.player_wins > data.data.session.ai_wins) {
          setShowConfetti(true);
        }
      } else {
        setError(data.error);
      }
    } catch {
      setError(t('loadResultError'));
    } finally {
      setLoading(false);
    }
  };

  const getResultInfo = () => {
    if (!session) return null;
    
    if (session.player_wins > session.ai_wins) {
      return {
        title: t('congratsYouWon'),
        subtitle: t('humanVictory'),
        bgClass: 'from-emerald-100 via-teal-50 to-cyan-100',
        emoji: '🏆'
      };
    } else if (session.ai_wins > session.player_wins) {
      return {
        title: t('sorryYouLost'),
        subtitle: t('aiVictory'),
        bgClass: 'from-rose-100 via-pink-50 to-orange-100',
        emoji: '🤖'
      };
    } else {
      return {
        title: t('itsATie'),
        subtitle: t('evenlyMatched'),
        bgClass: 'from-amber-100 via-yellow-50 to-lime-100',
        emoji: '⚖️'
      };
    }
  };

  const getResultStyle = (result: RoundResult) => {
    switch (result) {
      case 'player_win':
        return { text: t('win'), color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
      case 'ai_win':
        return { text: t('lose'), color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
      case 'draw':
        return { text: t('drawShort'), color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100 flex items-center justify-center">
        <div className="text-gray-700 text-2xl animate-pulse">{t('loadingResult')}</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-700 text-2xl mb-4">😢 {error || t('resultNotFound')}</div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-800 rounded-full text-white transition-colors cursor-pointer"
          >
            {t('backToHome')}
          </button>
        </div>
      </div>
    );
  }

  const resultInfo = getResultInfo();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${resultInfo?.bgClass} p-4 md:p-8 relative overflow-hidden`}>
      {/* 彩带效果 */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6', '#3498DB'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-9xl opacity-10 animate-float">✊</div>
        <div className="absolute bottom-20 right-10 text-9xl opacity-10 animate-float delay-1000">✌️</div>
        <div className="absolute top-1/2 left-1/2 text-9xl opacity-10 animate-float delay-500">🖐️</div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">

        {/* 结果标题 */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <div className="text-5xl sm:text-6xl md:text-8xl mb-2 sm:mb-4">{resultInfo?.emoji}</div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-800 mb-1 sm:mb-2 drop-shadow-sm">
            {resultInfo?.title}
          </h1>
          <p className="text-gray-600 text-base sm:text-lg md:text-xl">{resultInfo?.subtitle}</p>
        </div>

        {/* 最终比分 */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8 shadow-xl">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="mb-1 sm:mb-2 flex justify-center">
                <img
                  src={session.ai_avatar}
                  alt={session.ai_name}
                  className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20"
                />
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-rose-500 mb-1 sm:mb-2">{session.ai_wins}</div>
              <div className="text-gray-600 text-sm sm:text-base">{session.ai_name}</div>
            </div>
            <div className="text-center px-2 sm:px-4">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-400">VS</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl sm:text-5xl md:text-7xl mb-1 sm:mb-2">👤</div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-amber-500 mb-1 sm:mb-2">{session.player_wins}</div>
              <div className="text-gray-600 text-sm sm:text-base">{t('you')}</div>
            </div>
          </div>
          {session.draws > 0 && (
            <div className="text-center text-gray-500 mt-4">
              {t('draws')}: {session.draws} {t('rounds')}
            </div>
          )}
        </div>

        {/* AI评语 */}
        {session.ai_comment && (
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-xl">
            <div className="flex items-start gap-3 sm:gap-4">
              <img
                src={session.ai_avatar}
                alt={session.ai_name}
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-gray-500 text-xs sm:text-sm mb-1">{session.ai_name} {t('says')}:</div>
                <div className="text-gray-700 text-sm sm:text-base md:text-lg leading-relaxed">
                  &ldquo;{session.ai_comment}&rdquo;
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 详细战绩 */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-xl">
          <h3 className="text-gray-800 text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('detailedRecord')}</h3>
          <div className="space-y-2 sm:space-y-3">
            {rounds.map((round) => {
              const style = getResultStyle(round.result);
              return (
                <div
                  key={round.id}
                  className={`flex items-center p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl ${style.bg} border ${style.border}`}
                >
                  {/* 回合数 */}
                  <div className="w-12 sm:w-16 flex-shrink-0">
                    <span className="text-gray-600 text-xs sm:text-sm">{t('roundNum').replace('{n}', String(round.round_number))}</span>
                  </div>
                  {/* 玩家选择 */}
                  <div className="w-16 sm:w-24 flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <span className="text-xl sm:text-2xl md:text-3xl">{CHOICE_EMOJIS[round.player_choice]}</span>
                    <span className="text-gray-500 text-xs sm:text-sm hidden sm:inline">{CHOICE_NAMES[round.player_choice]}</span>
                  </div>
                  {/* 结果 */}
                  <div className="flex-1 text-center">
                    <span className={`font-bold text-sm sm:text-base ${style.color}`}>{style.text}</span>
                  </div>
                  {/* AI选择 */}
                  <div className="w-16 sm:w-24 flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
                    <span className="text-gray-500 text-xs sm:text-sm hidden sm:inline">{CHOICE_NAMES[round.ai_choice]}</span>
                    <span className="text-xl sm:text-2xl md:text-3xl">{CHOICE_EMOJIS[round.ai_choice]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={() => router.push('/')}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-white/70 hover:bg-white border border-gray-200 rounded-full text-gray-700 font-medium text-sm sm:text-base transition-all hover:scale-105 cursor-pointer"
          >
            {t('backToHome')}
          </button>
          <button
            onClick={async () => {
              // 创建新游戏并跳转
              const res = await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiId: session.ai_id })
              });
              const data = await res.json();
              if (data.success) {
                router.push(`/game/${data.data.session.id}`);
              }
            }}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 rounded-full text-white font-bold text-sm sm:text-base transition-all hover:scale-105 shadow-xl cursor-pointer"
          >
          {t('playAgain')}
          </button>
        </div>
      </div>

      {/* 自定义动画样式 */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(10deg);
          }
        }
        
        .animate-confetti {
          animation: confetti 5s linear forwards;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
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
  number: number;
  playerChoice: Choice;
  aiChoice: Choice;
  result: RoundResult;
  wasTimeout: boolean;
}

const COUNTDOWN_TIME = 10;
const AI_ANIMATION_CHOICES: Choice[] = ['rock', 'scissors', 'paper'];

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, locale } = useI18n();
  const [session, setSession] = useState<GameSession | null>(null);
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [countdown, setCountdown] = useState(COUNTDOWN_TIME);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false); // 同步标记，防止重复提交
  const [showResult, setShowResult] = useState(false);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiAnimation, setAiAnimation] = useState(false);
  const [aiAnimationIndex, setAiAnimationIndex] = useState(0);

  const CHOICES: { key: Choice; emoji: string; name: string }[] = [
    { key: 'rock', emoji: '✊', name: t('rock') },
    { key: 'scissors', emoji: '✌️', name: t('scissors') },
    { key: 'paper', emoji: '🖐️', name: t('paper') }
  ];

  // AI思考时的手势切换动画
  useEffect(() => {
    if (!aiAnimation) return;
    
    const interval = setInterval(() => {
      setAiAnimationIndex(prev => (prev + 1) % AI_ANIMATION_CHOICES.length);
    }, 300);
    
    return () => clearInterval(interval);
  }, [aiAnimation]);

  // 加载游戏会话
  useEffect(() => {
    fetchGameSession();
  }, [resolvedParams.id]);

  const fetchGameSession = async () => {
    try {
      const res = await fetch(`/api/game?sessionId=${resolvedParams.id}`);
      const data = await res.json();
      
      if (data.success) {
        setSession(data.data.session);
        if (data.data.session.status === 'finished') {
          router.push(`/result/${resolvedParams.id}`);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(t('loadGameError'));
    } finally {
      setLoading(false);
    }
  };

  // 进行游戏
  const playRound = useCallback(async (choice: Choice | null, timeout: boolean = false) => {
    if (!session || isPlaying || isPlayingRef.current) return;
    
    isPlayingRef.current = true; // 立即同步设置，防止重复调用
    setIsPlaying(true);
    setAiAnimation(true);
    
    try {
      const res = await fetch('/api/game/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          playerChoice: choice,
          timeout,
          locale
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // 模拟AI思考动画
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setAiAnimation(false);
        setCurrentRound(data.data.round);
        // 使用服务端返回的 round.number 来避免重复添加
        setRounds(prev => {
          // 检查是否已存在相同轮次的记录
          if (prev.some(r => r.number === data.data.round.number)) {
            return prev;
          }
          return [...prev, data.data.round];
        });
        setSession(data.data.session);
        setShowResult(true);
        
        // 显示结果后继续或结束
        setTimeout(() => {
          if (data.data.gameFinished) {
            router.push(`/result/${session.id}`);
          } else {
            setShowResult(false);
            setCurrentRound(null);
            setSelectedChoice(null);
            setCountdown(COUNTDOWN_TIME);
            setIsPlaying(false);
            isPlayingRef.current = false; // 重置同步标记
          }
        }, 2500);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setAiAnimation(false);
      }
    } catch {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setAiAnimation(false);
    }
  }, [session, isPlaying, router]);

  // 倒计时
  useEffect(() => {
    if (loading || !session || session.status !== 'playing' || isPlaying || isPlayingRef.current || showResult) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 时间到，随机选择 - 清除定时器后再调用
          clearInterval(timer);
          // 使用 setTimeout 确保状态更新后再调用
          setTimeout(() => {
            playRound(null, true);
          }, 0);
          return COUNTDOWN_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, session, isPlaying, showResult, playRound]);

  // 玩家选择
  const handleChoice = (choice: Choice) => {
    if (isPlaying || isPlayingRef.current || showResult) return;
    setSelectedChoice(choice);
    playRound(choice, false);
  };

  const getResultText = (result: RoundResult) => {
    switch (result) {
      case 'player_win': return { text: t('youWin'), color: 'text-green-400', bg: 'bg-green-500/20' };
      case 'ai_win': return { text: t('aiWon'), color: 'text-red-400', bg: 'bg-red-500/20' };
      case 'draw': return { text: t('itsADraw'), color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    }
  };

  const getChoiceEmoji = (choice: Choice) => {
    return CHOICES.find(c => c.key === choice)?.emoji || '❓';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100 flex items-center justify-center">
        <div className="text-gray-700 text-2xl animate-pulse">{t('loading')}</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-700 text-2xl mb-4">😢 {error || t('gameNotFound')}</div>
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

  const currentRoundNumber = rounds.length + 1;

  // 背景石头剪刀布元素配置 - 简单连续往上飘
  const floatElements = [
    { emoji: '✊', left: '5%', delay: 0, duration: 15, size: 'text-3xl' },
    { emoji: '✌️', left: '15%', delay: 4, duration: 18, size: 'text-4xl' },
    { emoji: '🖐️', left: '25%', delay: 8, duration: 14, size: 'text-3xl' },
    { emoji: '✊', left: '35%', delay: 2, duration: 16, size: 'text-4xl' },
    { emoji: '✌️', left: '45%', delay: 6, duration: 15, size: 'text-3xl' },
    { emoji: '🖐️', left: '55%', delay: 10, duration: 17, size: 'text-4xl' },
    { emoji: '✊', left: '65%', delay: 3, duration: 14, size: 'text-3xl' },
    { emoji: '✌️', left: '75%', delay: 7, duration: 16, size: 'text-4xl' },
    { emoji: '🖐️', left: '85%', delay: 11, duration: 15, size: 'text-3xl' },
    { emoji: '✊', left: '95%', delay: 1, duration: 18, size: 'text-4xl' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100 p-4 md:p-8">
      {/* 石头剪刀布背景动画 - 简单连续往上飘 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {floatElements.map((el, i) => (
          <div
            key={`float-${i}`}
            className={`absolute ${el.size} animate-rps-float`}
            style={{
              left: el.left,
              bottom: '0',
              animationDuration: `${el.duration}s`,
              animationDelay: `-${el.delay}s`,
              opacity: 0.3,
            }}
          >
            {el.emoji}
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* 顶部信息栏 */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            {t('exitGame')}
          </button>
          <div className="text-gray-800 text-base font-medium">
            {t('round')} {currentRoundNumber > session.total_rounds ? session.total_rounds : currentRoundNumber} / {session.total_rounds}
          </div>
        </div>

        {/* 比分板 */}
        <div className="bg-white/70 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 md:mb-8">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-rose-500">{session.ai_wins}</div>
              <div className="text-gray-600 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1">
                <img src={session.ai_avatar} alt={session.ai_name} className="w-4 h-4 sm:w-5 sm:h-5 inline-block" />
                {session.ai_name}
              </div>
            </div>
            <div className="text-gray-400 text-xl sm:text-2xl font-bold px-2 sm:px-4">:</div>
            <div className="text-center flex-1">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-500">{session.player_wins}</div>
              <div className="text-gray-600 text-xs sm:text-sm mt-1">👤 {t('you')}</div>
            </div>
          </div>
          {session.draws > 0 && (
            <div className="text-center text-gray-500 text-sm mt-2">
              {t('draws')}: {session.draws}
            </div>
          )}
        </div>

        {/* 对战区域 */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8">
          {/* AI 区域 */}
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <div className="text-gray-500 text-xs sm:text-sm mb-1 sm:mb-2">{t('opponent')}</div>
            <div className="text-5xl sm:text-6xl md:text-8xl mb-1 sm:mb-2 transition-transform duration-150">
              {showResult && currentRound 
                ? getChoiceEmoji(currentRound.aiChoice) 
                : aiAnimation 
                  ? getChoiceEmoji(AI_ANIMATION_CHOICES[aiAnimationIndex])
                  : <img src={session.ai_avatar} alt={session.ai_name} className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 mx-auto" />
              }
            </div>
            <div className="text-gray-800 font-medium text-sm sm:text-base">{session.ai_name}</div>
            {aiAnimation && (
              <div className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-2 animate-pulse">{t('thinking')}</div>
            )}
          </div>

          {/* VS 分隔线 */}
          <div className="relative my-4 sm:my-6 md:my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 sm:px-4 text-rose-400 font-bold text-base sm:text-lg md:text-xl">
                VS
              </span>
            </div>
          </div>

          {/* 玩家区域 */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="text-gray-500 text-xs sm:text-sm mb-1 sm:mb-2">{t('you')}</div>
            <div className="text-5xl sm:text-6xl md:text-8xl mb-1 sm:mb-2">
              {showResult && currentRound 
                ? getChoiceEmoji(currentRound.playerChoice)
                : selectedChoice 
                  ? getChoiceEmoji(selectedChoice)
                  : '❓'
              }
            </div>
            {currentRound?.wasTimeout && (
              <div className="text-orange-400 text-sm">⏰ {t('timeoutAutoSelect')}</div>
            )}
          </div>

          {/* 结果显示 */}
          {showResult && currentRound && (
            <div className={`text-center py-3 sm:py-4 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 ${getResultText(currentRound.result).bg}`}>
              <div className={`text-xl sm:text-2xl md:text-3xl font-bold ${getResultText(currentRound.result).color}`}>
                {getResultText(currentRound.result).text}
              </div>
            </div>
          )}

          {/* 倒计时 */}
          {!showResult && !isPlaying && (
            <div className="text-center mb-4 sm:mb-6">
              <div className={`text-4xl sm:text-5xl md:text-6xl font-bold ${countdown <= 3 ? 'text-rose-500 animate-pulse' : 'text-gray-700'}`}>
                {countdown}
              </div>
              <div className="text-gray-500 text-xs sm:text-sm mt-1">{t('secondsToAutoSelect')}</div>
            </div>
          )}

          {/* 选择按钮 */}
          {!showResult && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {CHOICES.map((choice) => (
                <button
                  key={choice.key}
                  onClick={() => handleChoice(choice.key)}
                  disabled={isPlaying}
                  className={`p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl transition-all duration-300 cursor-pointer transform ${
                    isPlaying
                      ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                      : selectedChoice === choice.key
                        ? 'bg-gradient-to-br from-rose-400 to-violet-400 scale-105 sm:scale-110 shadow-xl'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:scale-105 active:scale-95'
                  }`}
                >
                  <div className="text-3xl sm:text-4xl md:text-6xl mb-1 sm:mb-2">{choice.emoji}</div>
                  <div className={`font-medium text-xs sm:text-sm md:text-base ${selectedChoice === choice.key ? 'text-gray-800' : 'text-gray-700'}`}>
                    {choice.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 历史记录 */}
        {rounds.length > 0 && (
          <div className="bg-white/70 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-200">
            <div className="text-gray-500 text-xs sm:text-sm mb-2 sm:mb-3">{t('history')}</div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {rounds.map((round, index) => (
                <div
                  key={index}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm ${
                    round.result === 'player_win'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : round.result === 'ai_win'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}
                >
                  <span className="mr-0.5 sm:mr-1">{t('roundNum').replace('{n}', String(round.number))}:</span>
                  {getChoiceEmoji(round.playerChoice)} vs {getChoiceEmoji(round.aiChoice)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

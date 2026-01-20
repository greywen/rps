// 多语言配置

export type Locale = 'en' | 'zh';

export const translations = {
  en: {
    // 通用
    loading: 'Loading...',
    loadingResult: 'Loading result...',
    backToHome: 'Back to Home',
    exitGame: 'Exit Game',
    
    // 首页
    title: 'Rock Paper Scissors',
    subtitle: 'Human VS AI Large Model',
    tagline: 'Who will be the ultimate champion?',
    aiWins: 'AI Wins',
    humanWins: 'Human Wins',
    games: 'Games',
    draws: 'Draws',
    showDetails: 'Show Details',
    hideDetails: 'Hide Details',
    aiStatistics: 'Statistics',
    played: 'Played',
    gamesPlayed: 'games',
    humanWinRate: 'Human Win Rate',
    chooseOpponent: 'Choose Your Opponent',
    startGame: 'Start Game',
    starting: 'Starting...',
    selectOpponentFirst: 'Please select an AI opponent first',
    gameRules: 'Game Rules: Best of 5, 10 seconds per round',
    rpsRules: 'Rock beats Scissors | Scissors beats Paper | Paper beats Rock',
    
    // 难度
    normal: 'Normal',
    chaos: 'Chaos',
    unknown: 'Unknown',
    
    // 游戏页面
    round: 'Round',
    of: '/',
    opponent: 'Opponent',
    you: 'You',
    thinking: 'Thinking...',
    vs: 'VS',
    secondsLeft: 'seconds left',
    secondsToAutoSelect: 'seconds to auto-select',
    timeoutAutoSelect: 'Timeout - Auto selected',
    rock: 'Rock',
    paper: 'Paper',
    scissors: 'Scissors',
    youWin: 'You Win!',
    aiWon: 'AI Wins!',
    itsADraw: 'Draw!',
    timeout: 'Timeout - Auto selected',
    history: 'History',
    roundNum: 'Round {n}',
    gameNotFound: 'Game not found',
    loadGameError: 'Failed to load game',
    loadResultError: 'Failed to load result',
    rounds: 'rounds',
    says: 'says',
    resultNotFound: 'Result not found',
    
    // 结果页面
    congratsYouWon: '🎉 Congratulations! You Won!',
    humanVictory: 'Victory for Humanity!',
    sorryYouLost: '😢 Sorry, You Lost',
    aiVictory: 'AI Claims Victory',
    itsATie: '🤝 It\'s a Tie!',
    evenlyMatched: 'Evenly Matched',
    detailedRecord: 'Detailed Record',
    win: 'W',
    lose: 'L',
    drawShort: 'D',
    home: 'Home',
    playAgain: 'Play Again',

    // AI 配置相关
    poweredBy: 'Powered by',
    aiModel: 'AI Model',
    noAiConfigured: 'Random Mode',

    // 免责声明弹框
    disclaimer: 'Disclaimer',
    disclaimerContent1: 'This is just an entertainment game, the results are random and do not represent the actual capabilities of any AI model.',
    disclaimerContent2: 'The game outcomes are purely for entertainment purposes and should not be used to evaluate or compare AI models.',
    disclaimerContent3: 'We do not collect, store, or share any personal information or user data.',
    disclaimerContent4: 'By continuing, you acknowledge that you understand this is just a game for fun.',
    iUnderstand: 'I Understand',
    welcomeToStar: 'Welcome to Star',
  },
  zh: {
    // 通用
    loading: '加载中...',
    loadingResult: '加载结果中...',
    backToHome: '返回首页',
    exitGame: '退出游戏',
    
    // 首页
    title: '石头剪刀布',
    subtitle: '人类 VS AI大模型',
    tagline: '谁才是真正的猜拳之王？',
    aiWins: 'AI 胜',
    humanWins: '人类胜',
    games: '场',
    draws: '平局',
    showDetails: '查看详情',
    hideDetails: '隐藏详情',
    aiStatistics: '胜率统计',
    played: '对战',
    gamesPlayed: '场',
    humanWinRate: '人类胜率',
    chooseOpponent: '选择你的对手',
    startGame: '开始游戏',
    starting: '准备中...',
    selectOpponentFirst: '请先选择一位AI对手',
    gameRules: '游戏规则：五局三胜制，每局10秒思考时间',
    rpsRules: '✊ 石头克剪刀 | ✌️ 剪刀克布 | 🖐️ 布克石头',
    
    // 难度
    normal: '普通',
    chaos: '混沌',
    unknown: '未知',
    
    // 游戏页面
    round: '第',
    of: '/',
    opponent: '对手',
    you: '你',
    thinking: '思考中...',
    vs: 'VS',
    secondsLeft: '秒后自动选择',
    secondsToAutoSelect: '秒后自动选择',
    timeoutAutoSelect: '超时自动选择',
    rock: '石头',
    paper: '布',
    scissors: '剪刀',
    youWin: '你赢了！',
    aiWon: 'AI赢了！',
    itsADraw: '平局！',
    timeout: '超时自动选择',
    history: '历史记录',
    roundNum: '第{n}局',
    gameNotFound: '游戏不存在',
    loadGameError: '加载游戏失败',
    loadResultError: '加载结果失败',
    rounds: '局',
    says: '说',
    resultNotFound: '结果不存在',
    
    // 结果页面
    congratsYouWon: '🎉 恭喜你赢了！',
    humanVictory: '人类的胜利！',
    sorryYouLost: '😢 很遗憾你输了',
    aiVictory: 'AI获得了胜利',
    itsATie: '🤝 平局！',
    evenlyMatched: '势均力敌',
    detailedRecord: '详细战绩',
    win: '胜',
    lose: '负',
    drawShort: '平',
    home: '返回首页',
    playAgain: '再来一局',

    // AI 配置相关
    poweredBy: '驱动模型',
    aiModel: 'AI 模型',
    noAiConfigured: '随机模式',

    // 免责声明弹框
    disclaimer: '免责声明',
    disclaimerContent1: '这只是一个娱乐小游戏，结果具有随机性，不代表任何AI大模型的真实能力。',
    disclaimerContent2: '游戏结果仅供娱乐，不应用于评估或比较AI模型的实际性能。',
    disclaimerContent3: '本网站不收集、存储或分享任何个人信息或用户数据。',
    disclaimerContent4: '继续使用即表示您理解这只是一个趣味游戏。',
    iUnderstand: '我已了解',
    welcomeToStar: '欢迎 Star',
  }
} as const;

export type TranslationKey = keyof typeof translations.en;

// 检测用户语言
export function detectLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en';
  }
  
  // 检测浏览器语言
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  
  // 如果是中文环境，返回中文
  if (browserLang.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  
  // 默认返回英文
  return 'en';
}

// 获取翻译
export function getTranslation(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] || translations.en[key] || key;
}

// 创建翻译函数
export function createT(locale: Locale) {
  return (key: TranslationKey): string => getTranslation(locale, key);
}

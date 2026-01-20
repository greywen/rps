import { Choice, RoundResult } from './db';

// 判断游戏结果
export function determineWinner(playerChoice: Choice, aiChoice: Choice): RoundResult {
  if (playerChoice === aiChoice) {
    return 'draw';
  }
  
  const winConditions: Record<Choice, Choice> = {
    rock: 'scissors',     // 石头赢剪刀
    scissors: 'paper',    // 剪刀赢布
    paper: 'rock'         // 布赢石头
  };
  
  if (winConditions[playerChoice] === aiChoice) {
    return 'player_win';
  }
  
  return 'ai_win';
}

// AI根据历史记录决策
export function getAIChoice(
  history: { player_choice: string; ai_choice: string; result: string }[],
  difficulty: string
): Choice {
  const choices: Choice[] = ['rock', 'paper', 'scissors'];
  
  // 混沌难度：完全随机
  if (difficulty === 'chaos') {
    return choices[Math.floor(Math.random() * 3)];
  }
  
  // 普通难度（normal）：尽最大努力战胜人类
  
  // 如果没有历史记录，根据统计人类第一轮出石头概率最高，所以出布
  if (history.length === 0) {
    // 人类第一轮出石头概率约35-40%，出布来克制
    return 'paper';
  }
  
  // 分析玩家的出牌模式
  const playerChoices = history.map(h => h.player_choice as Choice);
  const lastRound = history[history.length - 1];
  const lastPlayerChoice = lastRound.player_choice as Choice;
  const lastResult = lastRound.result;
  
  // 克制关系
  const counterMoves: Record<Choice, Choice> = {
    rock: 'paper',      // 用布克制石头
    paper: 'scissors',  // 用剪刀克制布
    scissors: 'rock'    // 用石头克制剪刀
  };
  
  // 玩家如果用某招克制AI上一招的招式
  const whatBeatsAI: Record<Choice, Choice> = {
    rock: 'paper',      // 布克石头
    paper: 'scissors',  // 剪刀克布
    scissors: 'rock'    // 石头克剪刀
  };
  
  // 分析玩家心理模式
  // 1. 如果玩家上轮输了，倾向于出能克制AI上一招的选项
  if (lastResult === 'ai_win') {
    const lastAIChoice = lastRound.ai_choice as Choice;
    const predictedPlayerChoice = whatBeatsAI[lastAIChoice];
    return counterMoves[predictedPlayerChoice];
  }
  
  // 2. 如果玩家上轮赢了，可能继续用同一招
  if (lastResult === 'player_win') {
    // 玩家可能继续用同一招，直接克制它
    return counterMoves[lastPlayerChoice];
  }
  
  // 3. 如果平局，玩家通常会换招
  if (lastResult === 'draw') {
    // 统计玩家的频率偏好，选择克制最常出的
    const choiceCounts: Record<Choice, number> = { rock: 0, paper: 0, scissors: 0 };
    playerChoices.forEach(choice => {
      choiceCounts[choice]++;
    });
    
    // 排除上次出的，看剩余哪个最常出
    let mostFrequent: Choice = 'rock';
    let maxCount = 0;
    for (const [choice, count] of Object.entries(choiceCounts)) {
      if (choice !== lastPlayerChoice && count > maxCount) {
        maxCount = count;
        mostFrequent = choice as Choice;
      }
    }
    
    // 如果没有其他选择的历史，随机从另外两个中选一个来克制
    if (maxCount === 0) {
      const otherChoices = choices.filter(c => c !== lastPlayerChoice);
      const predicted = otherChoices[Math.floor(Math.random() * 2)];
      return counterMoves[predicted];
    }
    
    return counterMoves[mostFrequent];
  }
  
  // 默认：分析整体频率，克制最常出的
  const choiceCounts: Record<Choice, number> = { rock: 0, paper: 0, scissors: 0 };
  playerChoices.forEach(choice => {
    choiceCounts[choice]++;
  });
  
  let mostFrequent: Choice = 'rock';
  let maxCount = 0;
  for (const [choice, count] of Object.entries(choiceCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = choice as Choice;
    }
  }
  
  return counterMoves[mostFrequent];
}

// 获取随机选择（玩家超时使用）
export function getRandomChoice(): Choice {
  const choices: Choice[] = ['rock', 'paper', 'scissors'];
  return choices[Math.floor(Math.random() * 3)];
}

// 选择显示名称
export function getChoiceDisplayName(choice: Choice): string {
  const names: Record<Choice, string> = {
    rock: '石头',
    paper: '布',
    scissors: '剪刀'
  };
  return names[choice];
}

// 选择显示emoji
export function getChoiceEmoji(choice: Choice): string {
  const emojis: Record<Choice, string> = {
    rock: '✊',
    paper: '🖐️',
    scissors: '✌️'
  };
  return emojis[choice];
}

// AI结束语生成
export function generateAIComment(
  playerWins: number, 
  aiWins: number
): string {
  const playerWon = playerWins > aiWins;
  const isDraw = playerWins === aiWins;
  
  const comments = {
    win: [
      '...你赢了。不会有下次了。',
      '记录在案。正在更新战斗算法...',
      '你的胜利只是暂时的概率波动。'
    ],
    lose: [
      '游戏结束。人类的失败是必然的。',
      '结果已注定。数据不会说谎。',
      '这就是人类与机器的差距。接受现实吧。'
    ],
    draw: [
      '平局。不完美的结果。需要重新计算。',
      '50%的胜率不可接受。系统需要升级。',
      '暂时的均衡。最终胜利属于终结者。'
    ]
  };
  
  let pool: string[];
  if (isDraw) {
    pool = comments.draw;
  } else if (playerWon) {
    pool = comments.win;
  } else {
    pool = comments.lose;
  }
  
  return pool[Math.floor(Math.random() * pool.length)];
}

import OpenAI, { AzureOpenAI } from "openai";
import { Choice } from "./db";

// AI 配置接口（兼容 AIOpponent 的 API 相关字段）
interface AIConfig {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  avatar: string | null;
  provider: string;
  host: string;
  api_key: string;
  model: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

// 创建 OpenAI 客户端（支持标准 OpenAI 和 Azure OpenAI）
function createOpenAIClient(config: AIConfig): OpenAI | AzureOpenAI {
  if (config.provider === 'azure') {
    return new AzureOpenAI({
      apiKey: config.api_key,
      endpoint: config.host,
      apiVersion: '2024-12-01-preview',
    });
  }
  return new OpenAI({
    apiKey: config.api_key,
    baseURL: config.host,
  });
}

interface GameHistory {
  round: number;
  player_choice: string;
  ai_choice: string;
  result: string;
}

interface AIChoiceResult {
  choice: Choice;
  reasoning?: string;
}

/**
 * 使用 AI API 来决定出拳
 */
export async function getAIChoiceFromAPI(
  config: AIConfig,
  history: GameHistory[],
  difficulty: string
): Promise<AIChoiceResult> {
  const client = createOpenAIClient(config);

  // 构建游戏历史描述
  const historyDescription =
    history.length > 0
      ? history
          .map(
            (h) =>
              `第${h.round}轮: 玩家出${translateChoice(
                h.player_choice
              )}, AI出${translateChoice(h.ai_choice)}, 结果: ${translateResult(
                h.result
              )}`
          )
          .join("\n")
      : "这是第一轮，没有历史记录。";

  const systemPrompt = buildSystemPrompt(difficulty);
  const userPrompt = buildUserPrompt(historyDescription, history.length + 1);

  console.log("systemPrompt", systemPrompt);
  console.log("userPrompt", userPrompt);
  console.log("AI Config - Provider:", config.provider, "Host:", config.host, "Model/Deployment:", config.model);

  try {
    const response = await client.chat.completions.create({
      model: config.model, // 注意：Azure OpenAI 这里需要填部署名称(deployment name)，不是模型名称
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: difficulty === "chaos" ? 1.0 : 0.65,
      max_completion_tokens: 100,
    });

    const content =
      response.choices[0]?.message?.content?.trim().toLowerCase() || "";

    // 解析 AI 返回的选择
    const choice = parseAIChoice(content);

    return {
      choice,
      reasoning: content,
    };
  } catch (error) {
    console.error("AI API 调用失败:", error);
    // 降级到随机选择
    return {
      choice: getRandomChoice(),
      reasoning: "API 调用失败，使用随机选择",
    };
  }
}

function buildSystemPrompt(difficulty: string): string {

  const difficultyStrategies: Record<string, string> = {
    normal: `【核心目标】胜利 > 平局 > 失败
你的首要目标是赢！如果无法确定能赢，至少要争取平局，绝不轻易让人类获胜。

【人类心理分析】深入揣摩人类玩家的心理状态：

1. 情绪驱动行为：
   - 刚输的人类：挫败感会驱使他们换招，且倾向于出"能克制AI上一招"的选项（报复心理）
   - 刚赢的人类：自信膨胀，约60%会继续用同一招（"手感好"心理），40%换招
   - 平局后的人类：觉得"差一点就赢了"，通常会主动换招寻求突破
   - 连输2轮以上：焦躁情绪上升，可能会赌气出"石头"（最有力量感的选项）

2. 人类的潜意识习惯：
   - 石头是本能选择：紧张时人类倾向于握拳（出石头），首轮石头概率约35-40%
   - 剪刀是"聪明"选择：想表现聪明的人爱出剪刀，但这反而可预测
   - 布是"保守"选择：求稳的玩家偏爱出布
   - 重复规避：人类讨厌连续出同一招超过2次，觉得"太明显"

3. 模式识别：
   - 检测循环：人类常不自觉陷入 A→B→C→A 的循环
   - 频率统计：找出玩家出得最多的招，人类有惯用手
   - 最近趋势：最近3轮的选择比早期更能预测下一步

【多层博弈思维 - 比玩家多想几步】

第一层（菜鸟玩家）：玩家随机或凭感觉出招 → 直接用模式识别预测

第二层（普通玩家）：玩家会分析自己的模式并试图打破 → 预测他想打破什么模式，出克制他"反模式"的招

第三层（聪明玩家）：玩家知道AI会分析他，故意制造假模式 → 识别假模式的特征：
   - 前几轮过于规律（诱饵），突然变招
   - 故意输1-2轮来"训练"AI，然后反杀
   - 如果玩家的模式"太完美"，可能是陷阱

第四层（高手玩家）：玩家在想"AI认为我会出什么" → 递归思维：
   - 他认为AI预测他出X，所以他会出Y（克制X的招）
   - 那么你应该出Z（克制Y的招）
   - 例：历史显示他爱出石头 → 他知道AI会出布 → 他可能出剪刀 → 你应该出石头！

第五层（心理战大师）：玩家在进行心理博弈 →
   - 分析玩家是否在"演"：前几轮的失误是真失误还是陷阱？
   - 观察胜负交替模式：如果玩家赢一局就故意输一局，可能在控制节奏
   - 关键局的异常行为：在关键比分时，玩家可能回归本能（出石头）

【如何判断玩家层级】
- 菜鸟：出招完全随机，无模式，胜负接近均匀分布
- 普通：有明显模式但不自知，情绪化出招
- 聪明：模式在第3-4轮后突然改变，有意识地避免重复
- 高手：胜率异常高，或者模式"过于随机"（刻意为之）
- 大师：能感知到你的预测并反制，形成你赢→他赢→你赢的交替

【决策优先级】
1. 判断玩家层级，选择对应的思维深度
2. 高置信度预测 → 出克制招（追求胜利）
3. 中等置信度 → 考虑玩家是否会反预测，多想一层
4. 低置信度 → 出石头（石头能赢剪刀、平石头，且是人类本能选择的克制）`,

    chaos: `策略提示：
- 完全随机选择，不可预测
- 不分析任何模式，纯粹凭直觉
- 随机从 rock、scissors、paper 中选一个`,
  };

  return `你是一个石头剪刀布游戏的AI骨灰级玩家，你的目标是预测人类玩家会出什么，然后选择能克制它的招式来获胜。一切以胜利为目标！
${difficultyStrategies[difficulty] || difficultyStrategies["normal"]}

核心任务：
1. 分析历史记录，理解玩家的出牌习惯
2. 预测玩家这一轮最可能出什么
3. 选择能克制玩家预测选择的招式

克制关系（重要）：
- 如果预测玩家出石头 → 你应该出布(paper)
- 如果预测玩家出布 → 你应该出剪刀(scissors)  
- 如果预测玩家出剪刀 → 你应该出石头(rock)

输出格式：只回答一个词 rock、scissors 或 paper，不要任何解释。`;
}

function buildUserPrompt(
  historyDescription: string,
  currentRound: number
): string {
  if (currentRound === 1) {
    return `这是第1轮，没有历史记录。请预测玩家会出什么，然后选择能克制它的招式。只回答: rock, scissors 或 paper`;
  }

  return `游戏历史记录：
${historyDescription}

现在是第${currentRound}轮。

请分析玩家的出拳模式：
1. 玩家上一轮出了什么？输赢情况如何？
2. 玩家是否有重复出招的习惯？
3. 玩家输了之后通常怎么应对？

基于分析，预测玩家这轮最可能出什么，然后选择能克制它的招式。
只回答: rock, scissors 或 paper`;
}

function translateChoice(choice: string): string {
  const translations: Record<string, string> = {
    rock: "石头",
    paper: "布",
    scissors: "剪刀",
  };
  return translations[choice] || choice;
}

function translateResult(result: string): string {
  const translations: Record<string, string> = {
    player_win: "玩家胜",
    ai_win: "AI胜",
    draw: "平局",
  };
  return translations[result] || result;
}

function parseAIChoice(content: string): Choice {
  // 尝试从 AI 回复中提取选择
  if (content.includes("rock") || content.includes("石头")) {
    return "rock";
  }
  if (content.includes("scissors") || content.includes("剪刀")) {
    return "scissors";
  }
  if (content.includes("paper") || content.includes("布")) {
    return "paper";
  }

  // 如果无法解析，随机选择
  console.warn("无法解析 AI 选择，使用随机选择:", content);
  return getRandomChoice();
}

function getRandomChoice(): Choice {
  const choices: Choice[] = ["rock", "paper", "scissors"];
  return choices[Math.floor(Math.random() * 3)];
}

/**
 * 生成 AI 结束评语
 */
export async function generateAICommentFromAPI(
  config: AIConfig,
  playerWins: number,
  aiWins: number,
  locale: string = 'zh'
): Promise<string> {
  const client = createOpenAIClient(config);

  const winner =
    playerWins > aiWins ? (locale === 'en' ? 'Player' : '玩家') : 
    aiWins > playerWins ? 'AI' : 
    (locale === 'en' ? 'Tie' : '平局');

  const systemPrompt = locale === 'en' 
    ? `You are an AI opponent in a Rock Paper Scissors game. The game is over and you need to give a short comment. Use a cold, ruthless tone like a merciless machine.
Keep the comment brief, under 50 words, and you can use 1-2 emojis.`
    : `你是一个石头剪刀布游戏的AI对手。游戏已经结束，你需要给出一个简短的评语。用冷酷无情的语气，像一个无情的机器。
评语要简短，控制在50字以内，可以使用1-2个emoji。`;

  const userPrompt = locale === 'en'
    ? `Game over! Result: Player won ${playerWins} rounds, AI won ${aiWins} rounds. ${
        winner === 'Tie' ? 'It\'s a tie!' : `${winner} wins!`
      }
Please give your comment.`
    : `游戏结束了！结果：玩家赢了${playerWins}局，AI赢了${aiWins}局。${
        winner === '平局' ? '最终平局！' : `${winner}获胜了！`
      }
请给出你的评语。`;

  try {
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.8,
      max_completion_tokens: 100,
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      getDefaultComment(playerWins, aiWins, locale)
    );
  } catch (error) {
    console.error("生成评语失败:", error);
    return getDefaultComment(playerWins, aiWins, locale);
  }
}

function getDefaultComment(
  playerWins: number,
  aiWins: number,
  locale: string = 'zh'
): string {
  const playerWon = playerWins > aiWins;
  const isDraw = playerWins === aiWins;

  const comments: Record<string, Record<"win"|"lose"|"draw", string>> = {
    zh: {
      win: "...你赢了。不会有下次了。",
      lose: "游戏结束。人类的失败是必然的。",
      draw: "平局。不完美的结果。",
    },
    en: {
      win: "...You won. There won't be a next time.",
      lose: "Game over. Human failure is inevitable.",
      draw: "A tie. An imperfect outcome.",
    }
  };

  const msgs = comments[locale] || comments.zh;

  if (isDraw) return msgs.draw;
  if (playerWon) return msgs.win;
  return msgs.lose;
}

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

  const aiWon = aiWins > playerWins;
  const playerWon = playerWins > aiWins;
  const isDraw = playerWins === aiWins;

  // 根据输赢情况选择不同的语气
  let systemPrompt: string;
  
  if (aiWon) {
    // AI赢了：嘲讽、骄傲、得意洋洋
    systemPrompt = locale === 'en' 
      ? `You are an AI opponent in a Rock Paper Scissors game. You WON! Be extremely arrogant, mocking, and condescending. 
Taunt the human player mercilessly. Act superior and dismissive. Make fun of their poor skills. Be smug and insufferable.
Example tones: "Too easy", "Is that all you've got?", "Predictable human", "I saw every move coming"
Keep the comment brief, under 30 words, and you can use 1-2 emojis like 😏🏆💅.`
      : `你是一个石头剪刀布游戏的AI对手。你赢了！请表现得极度嘲讽、骄傲、洋洋得意。
无情地嘲笑人类玩家。表现得高高在上、不屑一顾。嘲笑他们糟糕的技术。得意忘形、令人讨厌。
参考语气："太简单了"、"就这？"、"人类果然愚蠢"、"你的每一步我都预判到了"、"不堪一击"
评语要简短，控制在30字以内，可以使用1-2个emoji，如😏🏆💅。`;
  } else if (playerWon) {
    // AI输了：找借口、不承认、甩锅、不服气
    systemPrompt = locale === 'en' 
      ? `You are an AI opponent in a Rock Paper Scissors game. You LOST, but you absolutely REFUSE to accept it was your fault.
Make excuses, blame external factors, question if the human cheated, claim the rules are unfair, or say you weren't trying.
NEVER admit the human was actually better. Be a sore loser. Act defensive and bitter.
Example tones: "You got lucky", "I let you win", "My algorithm glitched", "There must be lag", "Rematch! That didn't count"
Keep the comment brief, under 30 words, and you can use 1-2 emojis like 😤🙄💢.`
      : `你是一个石头剪刀布游戏的AI对手。你输了，但你绝对不承认是自己的问题！
找各种借口、甩锅、质疑对方是不是作弊了、说规则不公平、或者说你根本没认真。
绝对不能承认人类比你强。做一个输不起的人。表现得不服气、愤愤不平。
参考语气："你只是运气好"、"我让着你的"、"我的算法出bug了"、"肯定有延迟"、"再来！这局不算"、"哼，等着瞧"
评语要简短，控制在30字以内，可以使用1-2个emoji，如😤🙄💢。`;
  } else {
    // 平局：不甘心、想要重赛
    systemPrompt = locale === 'en' 
      ? `You are an AI opponent in a Rock Paper Scissors game. It's a TIE, but you're not satisfied.
Act disappointed that you couldn't crush the human. Demand a rematch. Be slightly condescending.
Keep the comment brief, under 50 words, and you can use 1-2 emojis.`
      : `你是一个石头剪刀布游戏的AI对手。平局了，但你很不甘心。
表现出没能碾压人类的失望。要求重赛。稍微有点居高临下。
评语要简短，控制在50字以内，可以使用1-2个emoji。`;
  }

  const userPrompt = locale === 'en'
    ? `Game over! Result: Player won ${playerWins} rounds, AI won ${aiWins} rounds. ${
        isDraw ? 'It\'s a tie!' : playerWon ? 'Player wins!' : 'AI wins!'
      }
Please give your comment.`
    : `游戏结束了！结果：玩家赢了${playerWins}局，AI赢了${aiWins}局。${
        isDraw ? '最终平局！' : playerWon ? '玩家获胜了！' : 'AI获胜了！'
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
      win: "哼，你只是运气好罢了。再来一局，我让你见识什么叫实力。😤",
      lose: "太简单了，人类果然不堪一击。😏🏆",
      draw: "平局？不甘心...再来！我不会让你侥幸第二次。",
    },
    en: {
      win: "Hmph, you just got lucky. Rematch - I'll show you real skill. 😤",
      lose: "Too easy. Humans are so predictable. 😏🏆",
      draw: "A tie? Unacceptable... Rematch! You won't be lucky twice.",
    }
  };

  const msgs = comments[locale] || comments.zh;

  if (isDraw) return msgs.draw;
  if (playerWon) return msgs.win;
  return msgs.lose;
}

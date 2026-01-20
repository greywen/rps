import { NextRequest, NextResponse } from 'next/server';
import db, { GameSession, AIOpponent, Choice } from '@/lib/db';
import { determineWinner, getAIChoice, getRandomChoice, generateAIComment } from '@/lib/game';
import { getAIChoiceFromAPI, generateAICommentFromAPI } from '@/lib/ai-service';

// 进行一局游戏
export async function POST(request: NextRequest) {
  try {
    const { sessionId, playerChoice, timeout = false, locale = 'zh' } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '缺少会话ID' },
        { status: 400 }
      );
    }

    // 获取游戏会话基本信息
    const baseSession = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(sessionId) as GameSession | undefined;

    if (!baseSession) {
      return NextResponse.json(
        { success: false, error: '游戏会话不存在' },
        { status: 404 }
      );
    }

    if (baseSession.status !== 'playing') {
      return NextResponse.json(
        { success: false, error: '游戏已结束' },
        { status: 400 }
      );
    }

    // 获取 AI 对手信息
    const ai = db.prepare('SELECT * FROM ai_opponents WHERE id = ?').get(baseSession.ai_id) as AIOpponent | undefined;
    
    const difficulty = ai?.difficulty || 'normal';

    const session = { ...baseSession, difficulty };

    // 计算当前轮次
    const currentRounds = db.prepare(
      'SELECT COUNT(*) as count FROM game_rounds WHERE session_id = ?'
    ).get(sessionId) as { count: number };
    
    const roundNumber = currentRounds.count + 1;

    if (roundNumber > session.total_rounds) {
      return NextResponse.json(
        { success: false, error: '游戏轮次已满' },
        { status: 400 }
      );
    }

    // 获取历史记录供AI决策
    const history = db.prepare(`
      SELECT round_number as round, player_choice, ai_choice, result 
      FROM game_rounds 
      WHERE session_id = ?
      ORDER BY round_number
    `).all(sessionId) as { round: number; player_choice: string; ai_choice: string; result: string }[];

    // 确定玩家选择（如果超时则随机）
    const finalPlayerChoice: Choice = timeout ? getRandomChoice() : playerChoice;

    // AI做出选择 - 如果有 API 配置则调用 API，否则使用本地逻辑
    let aiChoice: Choice;
    if (ai && ai.api_key && !ai.api_key.includes('your-api-key')) {
      try {
        // 构建兼容的配置对象
        const aiConfig = {
          id: ai.id,
          name: ai.name,
          display_name: ai.display_name,
          description: ai.description,
          avatar: ai.avatar,
          provider: ai.provider || 'openai',
          host: ai.host || 'https://api.openai.com/v1',
          api_key: ai.api_key,
          model: ai.model || 'gpt-4o-mini',
          enabled: ai.enabled,
          created_at: ai.created_at,
          updated_at: ai.updated_at
        };
        const aiResult = await getAIChoiceFromAPI(aiConfig, history, difficulty);
        aiChoice = aiResult.choice;
      } catch (error) {
        console.error('AI API 调用失败，使用本地逻辑:', error);
        aiChoice = getAIChoice(history as { player_choice: string; ai_choice: string; result: string }[], difficulty);
      }
    } else {
      aiChoice = getAIChoice(history as { player_choice: string; ai_choice: string; result: string }[], difficulty);
    }

    // 判断结果
    const result = determineWinner(finalPlayerChoice, aiChoice);

    // 记录本轮结果
    db.prepare(`
      INSERT INTO game_rounds (session_id, round_number, player_choice, ai_choice, result)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, roundNumber, finalPlayerChoice, aiChoice, result);

    // 更新会话统计
    const updateField = result === 'player_win' ? 'player_wins' : 
                        result === 'ai_win' ? 'ai_wins' : 'draws';
    
    db.prepare(`
      UPDATE game_sessions 
      SET ${updateField} = ${updateField} + 1
      WHERE id = ?
    `).run(sessionId);

    // 检查游戏是否结束
    let gameFinished = false;
    let aiComment = null;

    if (roundNumber >= session.total_rounds) {
      gameFinished = true;
      
      // 获取最终统计
      const finalSession = db.prepare(
        'SELECT player_wins, ai_wins FROM game_sessions WHERE id = ?'
      ).get(sessionId) as { player_wins: number; ai_wins: number };

      // 生成AI评语 - 如果有 API 配置则调用 API，否则使用本地逻辑
      if (ai && ai.api_key && !ai.api_key.includes('your-api-key')) {
        try {
          const aiConfig = {
            id: ai.id,
            name: ai.name,
            display_name: ai.display_name,
            description: ai.description,
            avatar: ai.avatar,
            host: ai.host || 'https://api.openai.com/v1',
            api_key: ai.api_key,
            model: ai.model || 'gpt-4o-mini',
            enabled: ai.enabled,
            created_at: ai.created_at,
            updated_at: ai.updated_at
          };
          aiComment = await generateAICommentFromAPI(
            aiConfig,
            finalSession.player_wins,
            finalSession.ai_wins,
            locale
          );
        } catch (error) {
          console.error('生成评语 API 调用失败，使用本地逻辑:', error);
          aiComment = generateAIComment(
            finalSession.player_wins,
            finalSession.ai_wins
          );
        }
      } else {
        aiComment = generateAIComment(
          finalSession.player_wins,
          finalSession.ai_wins
        );
      }

      // 更新会话状态
      db.prepare(`
        UPDATE game_sessions 
        SET status = 'finished', ai_comment = ?, finished_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(aiComment, sessionId);
    }

    // 获取更新后的会话
    const updatedSession = db.prepare(`
      SELECT gs.*, ao.name as ai_name, ao.display_name, ao.avatar as ai_avatar
      FROM game_sessions gs
      LEFT JOIN ai_opponents ao ON gs.ai_id = ao.id
      WHERE gs.id = ?
    `).get(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        round: {
          number: roundNumber,
          playerChoice: finalPlayerChoice,
          aiChoice,
          result,
          wasTimeout: timeout
        },
        session: updatedSession,
        gameFinished,
        aiComment
      }
    });
  } catch (error) {
    console.error('游戏出错:', error);
    return NextResponse.json(
      { success: false, error: '游戏出错' },
      { status: 500 }
    );
  }
}

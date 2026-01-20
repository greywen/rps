import { NextRequest, NextResponse } from 'next/server';
import db, { GameSession, AIOpponent, generateShortId, ensureDbInitialized } from '@/lib/db';

// 创建新游戏
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    
    const { aiId, aiConfigId, playerName = '玩家' } = await request.json();

    // 兼容旧的 aiConfigId 参数，统一使用 aiId
    const opponentId = aiId || aiConfigId;

    if (!opponentId) {
      return NextResponse.json(
        { success: false, error: '请选择AI对手' },
        { status: 400 }
      );
    }

    // 获取 AI 对手
    const aiResult = await db.execute({
      sql: 'SELECT * FROM ai_opponents WHERE id = ? AND enabled = 1',
      args: [opponentId]
    });
    const ai = aiResult.rows[0] as unknown as AIOpponent | undefined;
    
    if (!ai) {
      return NextResponse.json(
        { success: false, error: 'AI对手不存在或未启用' },
        { status: 404 }
      );
    }

    // 生成短UUID作为游戏ID
    const gameId = generateShortId();

    // 创建游戏会话
    await db.execute({
      sql: `INSERT INTO game_sessions (id, ai_id, player_name, status) VALUES (?, ?, ?, 'playing')`,
      args: [gameId, opponentId, playerName]
    });

    const sessionResult = await db.execute({
      sql: 'SELECT * FROM game_sessions WHERE id = ?',
      args: [gameId]
    });
    const session = sessionResult.rows[0] as unknown as GameSession;

    return NextResponse.json({
      success: true,
      data: {
        session,
        ai: {
          id: ai.id,
          name: ai.name,
          display_name: ai.display_name,
          avatar: ai.avatar,
          difficulty: ai.difficulty,
          description: ai.description,
          model: ai.model
        }
      }
    });
  } catch (error) {
    console.error('创建游戏失败:', error);
    return NextResponse.json(
      { success: false, error: '创建游戏失败' },
      { status: 500 }
    );
  }
}

// 获取游戏状态
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '缺少会话ID' },
        { status: 400 }
      );
    }

    // 获取会话信息（包含 AI 对手信息）
    const sessionResult = await db.execute({
      sql: `
        SELECT gs.*, ao.name as ai_name, ao.display_name, ao.avatar as ai_avatar, ao.difficulty
        FROM game_sessions gs
        LEFT JOIN ai_opponents ao ON gs.ai_id = ao.id
        WHERE gs.id = ?
      `,
      args: [sessionId]
    });
    const session = sessionResult.rows[0];
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '游戏会话不存在' },
        { status: 404 }
      );
    }

    const roundsResult = await db.execute({
      sql: 'SELECT * FROM game_rounds WHERE session_id = ? ORDER BY round_number',
      args: [sessionId]
    });

    return NextResponse.json({
      success: true,
      data: {
        session,
        rounds: roundsResult.rows
      }
    });
  } catch (error) {
    console.error('获取游戏状态失败:', error);
    return NextResponse.json(
      { success: false, error: '获取游戏状态失败' },
      { status: 500 }
    );
  }
}

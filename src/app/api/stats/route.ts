import { NextResponse } from 'next/server';
import db, { ensureDbInitialized } from '@/lib/db';

// 获取总体统计数据
export async function GET() {
  try {
    await ensureDbInitialized();
    
    // 获取总比分（统计最终游戏胜负，不是小局胜负）
    const totalStatsResult = await db.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN player_wins > ai_wins THEN 1 ELSE 0 END), 0) as total_player_wins,
        COALESCE(SUM(CASE WHEN ai_wins > player_wins THEN 1 ELSE 0 END), 0) as total_ai_wins,
        COALESCE(SUM(CASE WHEN player_wins = ai_wins THEN 1 ELSE 0 END), 0) as total_draws,
        COUNT(*) as total_games
      FROM game_sessions
      WHERE status = 'finished'
    `);
    const totalStats = totalStatsResult.rows[0] as unknown as {
      total_player_wins: number;
      total_ai_wins: number;
      total_draws: number;
      total_games: number;
    };

    // 获取每个AI的详细统计（统计最终游戏胜负，不是小局胜负）
    const aiStatsResult = await db.execute(`
      SELECT 
        ao.id,
        ao.display_name as name,
        ao.display_name_en as name_en,
        ao.avatar,
        ao.difficulty,
        COUNT(gs.id) as games_played,
        COALESCE(SUM(CASE WHEN gs.player_wins > gs.ai_wins THEN 1 ELSE 0 END), 0) as player_wins,
        COALESCE(SUM(CASE WHEN gs.ai_wins > gs.player_wins THEN 1 ELSE 0 END), 0) as ai_wins,
        COALESCE(SUM(CASE WHEN gs.player_wins = gs.ai_wins THEN 1 ELSE 0 END), 0) as draws,
        CASE 
          WHEN COUNT(gs.id) = 0 THEN 0
          ELSE ROUND(
            CAST(SUM(CASE WHEN gs.player_wins > gs.ai_wins THEN 1 ELSE 0 END) AS FLOAT) / 
            COUNT(gs.id) * 100, 1
          )
        END as player_win_rate
      FROM ai_opponents ao
      LEFT JOIN game_sessions gs ON ao.id = gs.ai_id AND gs.status = 'finished'
      WHERE ao.enabled = 1
      GROUP BY ao.id
      ORDER BY ao.id
    `);

    return NextResponse.json({
      success: true,
      data: {
        total: totalStats,
        byAI: aiStatsResult.rows
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import db, { AIOpponent, ensureDbInitialized } from '@/lib/db';
import { validateAuthFromRequest } from '@/lib/auth';

// 验证管理员权限
function checkAuth(request: Request) {
  if (!validateAuthFromRequest(request)) {
    return NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
  }
  return null;
}

// 获取所有 AI 对手（前端显示用，隐藏敏感信息）
export async function GET() {
  try {
    await ensureDbInitialized();
    
    const result = await db.execute(`
      SELECT id, name, display_name, display_name_en, avatar, difficulty, description, description_en, model, enabled, sort_order, created_at, updated_at
      FROM ai_opponents
      WHERE enabled = 1
      ORDER BY sort_order DESC, id
    `);
    
    const opponents = result.rows as unknown as Omit<AIOpponent, 'host' | 'api_key'>[];
    
    return NextResponse.json({ success: true, data: opponents });
  } catch (error) {
    console.error('获取 AI 对手失败:', error);
    return NextResponse.json(
      { success: false, error: '获取 AI 对手失败' },
      { status: 500 }
    );
  }
}

// 创建新的 AI 对手
export async function POST(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    await ensureDbInitialized();
    
    const body = await request.json();
    const { name, display_name, display_name_en, avatar, difficulty, description, description_en, provider, host, api_key, model, enabled = true, sort_order = 10 } = body;

    if (!name || !display_name) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: `
        INSERT INTO ai_opponents (name, display_name, display_name_en, avatar, difficulty, description, description_en, provider, host, api_key, model, enabled, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [name, display_name, display_name_en || null, avatar || null, difficulty || 'normal', description || null, description_en || null, provider || 'openai', host || null, api_key || null, model || null, enabled ? 1 : 0, sort_order]
    });

    const newOpponentResult = await db.execute({
      sql: 'SELECT * FROM ai_opponents WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    });

    return NextResponse.json({ success: true, data: newOpponentResult.rows[0] });
  } catch (error) {
    console.error('创建 AI 对手失败:', error);
    return NextResponse.json(
      { success: false, error: '创建 AI 对手失败' },
      { status: 500 }
    );
  }
}

// 更新 AI 对手
export async function PUT(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    await ensureDbInitialized();
    
    const body = await request.json();
    const { id, name, display_name, display_name_en, avatar, difficulty, description, description_en, provider, host, api_key, model, enabled, sort_order } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少 ID' },
        { status: 400 }
      );
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (display_name !== undefined) { updates.push('display_name = ?'); values.push(display_name); }
    if (display_name_en !== undefined) { updates.push('display_name_en = ?'); values.push(display_name_en); }
    if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
    if (difficulty !== undefined) { updates.push('difficulty = ?'); values.push(difficulty); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (description_en !== undefined) { updates.push('description_en = ?'); values.push(description_en); }
    if (provider !== undefined) { updates.push('provider = ?'); values.push(provider); }
    if (host !== undefined) { updates.push('host = ?'); values.push(host); }
    if (api_key !== undefined) { updates.push('api_key = ?'); values.push(api_key); }
    if (model !== undefined) { updates.push('model = ?'); values.push(model); }
    if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled ? 1 : 0); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.execute({
      sql: `UPDATE ai_opponents SET ${updates.join(', ')} WHERE id = ?`,
      args: values
    });

    const updatedResult = await db.execute({
      sql: 'SELECT id, name, display_name, avatar, difficulty, description, model, enabled, created_at, updated_at FROM ai_opponents WHERE id = ?',
      args: [id]
    });

    return NextResponse.json({ success: true, data: updatedResult.rows[0] });
  } catch (error) {
    console.error('更新 AI 对手失败:', error);
    return NextResponse.json(
      { success: false, error: '更新 AI 对手失败' },
      { status: 500 }
    );
  }
}

// 删除 AI 对手
export async function DELETE(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    await ensureDbInitialized();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少 ID' },
        { status: 400 }
      );
    }

    // 检查是否有游戏会话使用此对手
    const usedByResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM game_sessions WHERE ai_id = ?',
      args: [id]
    });
    const usedBy = usedByResult.rows[0] as unknown as { count: number };
    
    if (Number(usedBy.count) > 0) {
      return NextResponse.json(
        { success: false, error: '此对手有游戏记录，无法删除' },
        { status: 400 }
      );
    }

    await db.execute({
      sql: 'DELETE FROM ai_opponents WHERE id = ?',
      args: [id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除 AI 对手失败:', error);
    return NextResponse.json(
      { success: false, error: '删除 AI 对手失败' },
      { status: 500 }
    );
  }
}

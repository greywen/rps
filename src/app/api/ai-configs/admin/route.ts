import { NextResponse } from 'next/server';
import db, { AIOpponent } from '@/lib/db';
import OpenAI, { AzureOpenAI } from 'openai';
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

// 获取所有 AI 对手（管理员用，包含完整信息）
export async function GET(request: Request) {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const opponents = db.prepare(`
      SELECT * FROM ai_opponents ORDER BY sort_order DESC, id
    `).all() as AIOpponent[];
    
    return NextResponse.json({ success: true, data: opponents });
  } catch (error) {
    console.error('获取 AI 对手失败:', error);
    return NextResponse.json(
      { success: false, error: '获取 AI 对手失败' },
      { status: 500 }
    );
  }
}

// 创建 OpenAI 客户端
function createClient(provider: string, host: string, api_key: string): OpenAI | AzureOpenAI {
  if (provider === 'azure') {
    return new AzureOpenAI({
      apiKey: api_key,
      endpoint: host,
      apiVersion: '2024-12-01-preview',
    });
  }
  return new OpenAI({
    apiKey: api_key,
    baseURL: host,
  });
}

// 测试 API 连接 / 生成名称和描述
export async function POST(request: Request) {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, provider, host, api_key, model } = body;

    if (!host || !api_key || !model) {
      return NextResponse.json(
        { success: false, error: '请填写完整的 API 配置' },
        { status: 400 }
      );
    }

    const client = createClient(provider, host, api_key);

    // 测试连接
    if (action === 'test') {
      const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_completion_tokens: 5,
      });

      if (response.choices && response.choices.length > 0) {
        return NextResponse.json({
          success: true,
          message: '连接成功',
          model: response.model || model,
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'API 返回异常' },
          { status: 400 }
        );
      }
    }

    // 生成名称和描述
    if (action === 'generate') {
      const systemPrompt = `你是一个正在为自己取名的AI。你将作为"石头剪刀布"游戏中的AI对手角色出场。

请为自己创造一个独特的游戏角色身份，包括名称和描述。

## 命名灵感方向（选择一个或混合）：
- **性格特质**：冷静、狡猾、热血、呆萌、傲娇、毒舌...
- **战斗风格**：预测型、随机型、心理战、模式识别、直觉派...
- **文化元素**：武侠、科幻、神话、动漫、游戏梗...
- **谐音梗/双关语**：与石头剪刀布、AI、模型名相关的有趣谐音

## 要求：
1. **中文名称**：2-4个字，朗朗上口，有记忆点
2. **英文名称**：1-4个单词，酷炫或可爱，与中文名风格呼应
3. **中文描述**：6-12字，第一人称或第三人称皆可，展现角色个性
4. **英文描述**：6-12词，风格与中文一致
5. 可以幽默、中二、可爱，但要有特色，让玩家想挑战
6. **不要**使用"智"、"AI"、"机器"等过于直白的词汇作为名称主体

## 回复格式（纯JSON，无其他内容）：
{"display_name": "中文名称", "display_name_en": "English Name", "description": "中文描述", "description_en": "English description"}`;

      const userPrompt = `你是 ${model}，现在请为自己创造一个石头剪刀布游戏角色身份。发挥创意，展现你独特的性格！`;

      const response = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
        max_completion_tokens: 200,
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      
      try {
        // 尝试解析 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            success: true,
            display_name: parsed.display_name || '',
            display_name_en: parsed.display_name_en || '',
            description: parsed.description || '',
            description_en: parsed.description_en || '',
          });
        }
      } catch (parseError) {
        console.error('解析生成结果失败:', parseError, content);
      }

      return NextResponse.json(
        { success: false, error: '无法解析AI返回的内容' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: '未知操作' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('API 操作失败:', error);
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

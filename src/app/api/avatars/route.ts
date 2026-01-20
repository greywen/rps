import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 获取 public/avatars 目录下的所有头像文件
export async function GET() {
  try {
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
    const files = fs.readdirSync(avatarsDir);
    
    // 过滤出 svg 文件并去掉扩展名
    const avatars = files
      .filter(file => file.endsWith('.svg'))
      .map(file => ({
        name: file.replace('.svg', ''),
        path: `/avatars/${file}`,
      }));
    
    return NextResponse.json({ success: true, data: avatars });
  } catch (error) {
    console.error('获取头像列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取头像列表失败' },
      { status: 500 }
    );
  }
}

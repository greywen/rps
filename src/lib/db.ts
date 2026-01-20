import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

// 生成短UUID (8字符)
export function generateShortId(): string {
  return crypto.randomBytes(4).toString('hex');
}

const dbPath = path.join(process.cwd(), 'game.db');
const db = new Database(dbPath);

// 初始化数据库表
db.exec(`
  -- AI对手表（合并了 AI 配置信息）
  CREATE TABLE IF NOT EXISTS ai_opponents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT,
    difficulty TEXT DEFAULT 'normal',
    description TEXT,
    provider TEXT DEFAULT 'openai',
    host TEXT,
    api_key TEXT,
    model TEXT,
    enabled INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 游戏场次表
  CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    ai_id INTEGER,
    player_name TEXT DEFAULT '玩家',
    total_rounds INTEGER DEFAULT 5,
    player_wins INTEGER DEFAULT 0,
    ai_wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    status TEXT DEFAULT 'playing',
    ai_comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    FOREIGN KEY (ai_id) REFERENCES ai_opponents(id)
  );

  -- 每局记录表
  CREATE TABLE IF NOT EXISTS game_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    player_choice TEXT,
    ai_choice TEXT,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id)
  );
`);

// 检查并添加新字段到 ai_opponents 表（如果不存在）
try {
  const tableInfo = db.prepare("PRAGMA table_info(ai_opponents)").all() as { name: string }[];
  const columns = tableInfo.map(col => col.name);
  
  if (!columns.includes('display_name')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN display_name TEXT');
    // 用 name 字段填充 display_name
    db.exec('UPDATE ai_opponents SET display_name = name WHERE display_name IS NULL');
  }
  if (!columns.includes('description')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN description TEXT');
  }
  if (!columns.includes('host')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN host TEXT');
  }
  if (!columns.includes('api_key')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN api_key TEXT');
  }
  if (!columns.includes('model')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN model TEXT');
  }
  if (!columns.includes('enabled')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN enabled INTEGER DEFAULT 1');
  }
  if (!columns.includes('updated_at')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  }
  if (!columns.includes('provider')) {
    db.exec("ALTER TABLE ai_opponents ADD COLUMN provider TEXT DEFAULT 'openai'");
  }
  if (!columns.includes('sort_order')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN sort_order INTEGER DEFAULT 10');
  }
  if (!columns.includes('display_name_en')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN display_name_en TEXT');
  }
  if (!columns.includes('description_en')) {
    db.exec('ALTER TABLE ai_opponents ADD COLUMN description_en TEXT');
  }
} catch {
  // 忽略错误
}

export default db;

// 类型定义
export interface AIOpponent {
  id: number;
  name: string;
  display_name: string;
  display_name_en: string | null;
  avatar: string | null;
  difficulty: string;
  description: string | null;
  description_en: string | null;
  provider: string | null;
  host: string | null;
  api_key: string | null;
  model: string | null;
  enabled: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GameSession {
  id: string;
  ai_id: number;
  player_name: string;
  total_rounds: number;
  player_wins: number;
  ai_wins: number;
  draws: number;
  status: string;
  ai_comment: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface GameRound {
  id: number;
  session_id: number;
  round_number: number;
  player_choice: string;
  ai_choice: string;
  result: string;
  created_at: string;
}

export type Choice = 'rock' | 'paper' | 'scissors';
export type RoundResult = 'player_win' | 'ai_win' | 'draw';

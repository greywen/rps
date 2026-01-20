import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_SESSION_COOKIE = 'admin_session';

// 获取 session secret，用于签名 token
function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set');
  }
  return secret;
}

// 生成签名 token
function generateToken(): string {
  const secret = getSessionSecret();
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(timestamp)
    .digest('hex');
  return `${timestamp}.${signature}`;
}

// 验证 token
function verifyToken(token: string): boolean {
  try {
    const secret = getSessionSecret();
    const [timestamp, signature] = token.split('.');
    
    if (!timestamp || !signature) return false;
    
    // 检查 token 是否过期 (24小时)
    const tokenTime = parseInt(timestamp, 10);
    if (Date.now() - tokenTime > 24 * 60 * 60 * 1000) {
      return false;
    }
    
    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(timestamp)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME!,
    password: process.env.ADMIN_PASSWORD!,
  };
}

export function validateCredentials(username: string, password: string): boolean {
  const credentials = getAdminCredentials();
  
  // 使用时序安全的比较，防止时序攻击
  const usernameBuffer = Buffer.from(username.padEnd(256, '\0'));
  const expectedUsernameBuffer = Buffer.from(credentials.username.padEnd(256, '\0'));
  const passwordBuffer = Buffer.from(password.padEnd(256, '\0'));
  const expectedPasswordBuffer = Buffer.from(credentials.password.padEnd(256, '\0'));
  
  const usernameMatch = crypto.timingSafeEqual(usernameBuffer, expectedUsernameBuffer);
  const passwordMatch = crypto.timingSafeEqual(passwordBuffer, expectedPasswordBuffer);
  
  return usernameMatch && passwordMatch;
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  if (!session?.value) return false;
  return verifyToken(session.value);
}

export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = generateToken();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

// 用于 API 路由验证的简化函数
export function validateAuthFromRequest(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;
  return verifyToken(match[1]);
}

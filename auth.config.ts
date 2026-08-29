import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// LINE 官方支援 OpenID Connect，用 OIDC discovery 自動抓 endpoint
const LineProvider = {
  id: 'line',
  name: 'LINE',
  type: 'oidc' as const,
  issuer: 'https://access.line.me',
  clientId: process.env.LINE_CLIENT_ID,
  clientSecret: process.env.LINE_CLIENT_SECRET,
  // bot_prompt: 登入過程中順便跳出「加官方帳號好友」的提示，之後才推得了訊息
  authorization: { params: { scope: 'openid profile email', bot_prompt: 'normal' } },
  checks: ['state' as const],
  // LINE 的 OIDC metadata 宣告用 ES256，但實際 ID token 是用 HS256 簽的，要明確指定才驗證得過
  client: { id_token_signed_response_alg: 'HS256' },
  // 同一個 email 允許自動合併到既有帳號（同一人可以用帳密/Google/LINE 交叉登入同一個帳號）
  allowDangerousEmailAccountLinking: true,
  profile(profile: { sub: string; name?: string; email?: string; picture?: string }) {
    return {
      id: profile.sub,
      name: profile.name ?? 'LINE 使用者',
      // LINE 的 email 權限需要另外申請，沒有的話用一個不會撞號的佔位 email
      email: profile.email ?? `line-${profile.sub}@line.local`,
      image: profile.picture,
    };
  },
};

// 這份設定只放「Edge runtime 也能安全跑」的東西（proxy.ts 會用到）
// 不能放 Credentials provider（裡面會用到 bcrypt/mongoose，Edge 不支援）
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    LineProvider,
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;

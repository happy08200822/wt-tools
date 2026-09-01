import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth;

// 保護所有頁面路由，API、靜態資源、登入頁本身不攔截
// /q 是給客戶看的報價追蹤頁，/sign 是給客戶看的合約簽署頁，客戶不會、也不需要登入這個網站
export const config = {
  matcher: ['/((?!api|login|q/|sign/|_next/static|_next/image|favicon.ico).*)'],
};

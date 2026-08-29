import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: 'jwt' },
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: '密碼', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        await dbConnect();
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // user 只有在剛登入那一刻才有值，之後每次 middleware 檢查都不會再打資料庫
      if (user?.id) {
        token.userId = user.id;
        await dbConnect();
        const dbUser = await User.findById(user.id).select('role');
        token.role = dbUser?.role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = (token.role as 'admin' | 'user') ?? 'user';
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // OAuth（Google / LINE）第一次登入會經過這裡，補上 role
      // adapter 是用原生 driver 寫入的，不會經過 Mongoose 的 timestamps，這裡順便補 createdAt
      await dbConnect();
      const isAdmin = user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
      await User.findByIdAndUpdate(user.id, {
        role: isAdmin ? 'admin' : 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
    async linkAccount({ user, account }) {
      // 第一次把 LINE 帳號連結起來時會經過這裡
      if (account.provider === 'line' && account.providerAccountId) {
        await dbConnect();
        await User.findByIdAndUpdate(user.id, { lineUserId: account.providerAccountId });
      }
    },
    async signIn({ user, account }) {
      // linkAccount 只有第一次連結才會觸發，這裡改成每次登入都檢查/補上，比較保險
      if (account?.provider === 'line' && account.providerAccountId) {
        await dbConnect();
        await User.findByIdAndUpdate(user.id, { lineUserId: account.providerAccountId });
      }
    },
  },
});

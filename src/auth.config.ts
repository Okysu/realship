import type { NextAuthConfig } from "next-auth";

// 不含数据库与 Credentials 的基础配置——供 proxy（Node runtime，但不碰 DB）复用。
// 完整配置（adapter + Credentials provider）在 auth.ts 注入。
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Credentials provider 必须使用 JWT 会话策略（database 策略下 session 会为 null）。
  session: { strategy: "jwt" },
  // 此实例仅用于读取 JWT（proxy 守卫），不需要 provider 校验凭据。
  providers: [],
  callbacks: {
    // 登录时把用户 id 与角色写入 token。
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    // 把 token 中的 id / role 透传到 session，供服务端与客户端读取。
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

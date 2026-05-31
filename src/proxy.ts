import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// 仅用 JWT 回调实例化（不碰数据库），用于 proxy 乐观守卫。
// 纵深防御：proxy 只做粗粒度重定向，真正的鉴权在每个 Server Action / 页面内用 lib/rbac 完成。
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const isLoggedIn = !!req.auth;

  const toLogin = () => NextResponse.redirect(new URL("/login", req.nextUrl));

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") return toLogin();
  } else if (pathname.startsWith("/judge")) {
    if (role !== "JUDGE") return toLogin();
  } else if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) return toLogin();
  }

  return NextResponse.next();
});

// Next.js 16：中间件已更名为 Proxy（src/proxy.ts），仅 Node runtime。
export const config = {
  matcher: ["/admin/:path*", "/judge/:path*", "/dashboard/:path*"],
};

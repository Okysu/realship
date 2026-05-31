import { type DefaultSession } from "next-auth";
import { type UserRole } from "@prisma/client";

// 扩展 Auth.js 的 Session / User / JWT，使其携带 id 与 role。
declare module "next-auth" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

// JWT 接口实际定义在 @auth/core/jwt（next-auth/jwt 仅 re-export），须在此增强。
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

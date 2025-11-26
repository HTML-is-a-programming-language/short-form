// src/lib/authOptions.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

// JWT 기반, DB 어댑터 없이 사용하는 설정
export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        // 세션마다 우리 Prisma User와 매핑해서 appUserId를 담아두는 콜백
        async session({ session }) {
            if (!session.user?.email) return session;

            const email = session.user.email;
            const name = session.user.name ?? "사용자";

            // 1) 이메일로 우리 User 찾기
            let user = await db.user.findUnique({
                where: { email },
            });

            // 2) 없으면 새로 만들기
            if (!user) {
                const baseUsername = email.split("@")[0].slice(0, 20);
                user = await db.user.create({
                    data: {
                        email,
                        name,
                        username: baseUsername || `user_${Date.now()}`,
                    },
                });
            }

            // 3) 세션 객체에 우리 User id / username 심기
            (session.user as any).appUserId = user.id;
            (session.user as any).username = user.username;

            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

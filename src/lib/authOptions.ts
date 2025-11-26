// src/lib/authOptions.ts
import type { NextAuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

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
        async session({ session }): Promise<Session> {
            if (!session.user?.email) {
                return session;
            }

            const email = session.user.email;
            const name = session.user.name ?? "사용자";

            let user = await db.user.findUnique({ where: { email } });

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

            // 여기서 session.user 타입은 우리가 확장한 타입이라 any 필요 없음
            session.user.appUserId = user.id;
            session.user.username = user.username;

            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

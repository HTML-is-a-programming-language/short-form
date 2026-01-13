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
            const providerImage = session.user.image ?? null;

            let user = await db.user.findUnique({ where: { email } });

            if (!user) {
                const baseUsername = email.split("@")[0].slice(0, 20);
                user = await db.user.create({
                    data: {
                        email,
                        name,
                        username: baseUsername || `user_${Date.now()}`,
                        image: providerImage,
                    },
                });
            } else if (!user.image && providerImage) {
                user = await db.user.update({
                    where: { id: user.id },
                    data: { image: providerImage },
                });
            }

            // ✅ 세션 확장 필드들
            session.user.appUserId = user.id;
            session.user.username = user.username;

            // ✅ 가장 중요: API에서 쓰는 user.id도 같이 넣어주기
            // (NextAuth 기본 타입엔 없지만 런타임에 넣는 건 가능)
            (session.user as { id?: string }).id = user.id;

            session.user.image = user.image ?? providerImage ?? null;

            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

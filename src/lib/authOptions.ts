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
            // 이메일 없으면 그냥 반환
            if (!session.user?.email) {
                return session;
            }

            const email = session.user.email;
            const name = session.user.name ?? "사용자";
            const providerImage = session.user.image ?? null; // 구글에서 온 이미지

            let user = await db.user.findUnique({ where: { email } });

            if (!user) {
                const baseUsername = email.split("@")[0].slice(0, 20);
                user = await db.user.create({
                    data: {
                        email,
                        name,
                        username: baseUsername || `user_${Date.now()}`,
                        image: providerImage, // ⭐ DB에도 같이 저장
                    },
                });
            } else if (!user.image && providerImage) {
                // 예전 유저인데 image가 비어있고, 이번에 프로필 이미지가 들어왔으면 동기화
                user = await db.user.update({
                    where: { id: user.id },
                    data: { image: providerImage },
                });
            }

            // 앱에서 쓸 추가 필드들
            session.user.appUserId = user.id;
            session.user.username = user.username;

            // 세션에 최종 image 세팅 (DB > provider)
            session.user.image = user.image ?? providerImage ?? null;

            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

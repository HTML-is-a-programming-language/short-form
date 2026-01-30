// src/lib/authOptions.ts
import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

type AppToken = JWT & {
    uid?: string;
    username?: string;
    onboarded?: boolean;
    image?: string | null;
};

function safeBaseUsername(email: string) {
    const base = email.split("@")[0] ?? "";
    // 너무 특수문자 많은 경우 대비(가볍게 정리)
    const cleaned = base.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
    return cleaned;
}

async function ensureUserByEmail(args: {
    email: string;
    name: string;
    providerImage: string | null;
}): Promise<{ id: string; username: string; isOnboarded: boolean; image: string | null }> {
    const { email, name, providerImage } = args;

    const existing = await db.user.findUnique({
        where: { email },
        select: {
            id: true,
            username: true,
            isOnboarded: true,
            image: true,
        },
    });

    if (existing) {
        // providerImage가 있고, DB에 이미지가 없을 때만 채우기(유저가 바꾼 이미지 덮어쓰지 않음)
        if (!existing.image && providerImage) {
            const updated = await db.user.update({
                where: { id: existing.id },
                data: { image: providerImage },
                select: { id: true, username: true, isOnboarded: true, image: true },
            });
            return updated;
        }
        return existing;
    }

    const baseUsername = safeBaseUsername(email);
    let username = baseUsername || `user_${Date.now()}`;

    try {
        const created = await db.user.create({
            data: {
                email,
                name,
                username,
                image: providerImage,
            },
            select: { id: true, username: true, isOnboarded: true, image: true },
        });
        return created;
    } catch {
        // username unique 충돌 등 대비: 한 번 더 안전한 값으로 시도
        username = `${(baseUsername || "user").slice(0, 12)}_${Math.random().toString(36).slice(2, 6)}`;
        const created = await db.user.create({
            data: {
                email,
                name,
                username,
                image: providerImage,
            },
            select: { id: true, username: true, isOnboarded: true, image: true },
        });
        return created;
    }
}

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
        // ✅ 핵심: DB 작업은 jwt에서 "처음 1회"만 (token에 uid/username 박아두기)
        async jwt({ token, user }) {
            const t = token as AppToken;

            // 이미 token에 uid가 들어있으면 DB 안 탐
            if (t.uid && t.username) {
                return t;
            }

            // user는 "처음 로그인/갱신" 시점에만 들어옴
            const email = (user as { email?: string | null } | undefined)?.email ?? token.email ?? null;
            if (!email) {
                return t;
            }

            const name =
                (user as { name?: string | null } | undefined)?.name ??
                (typeof token.name === "string" ? token.name : null) ??
                "사용자";

            const providerImage =
                (user as { image?: string | null } | undefined)?.image ??
                (typeof (token as { picture?: unknown }).picture === "string"
                    ? ((token as { picture: string }).picture as string)
                    : null) ??
                null;

            // ✅ 여기서만 DB 접근(최초 1회 / 혹은 token에 uid가 비어있는 구세션 1회)
            const ensured = await ensureUserByEmail({
                email,
                name,
                providerImage,
            });

            t.uid = ensured.id;
            t.username = ensured.username;
            t.onboarded = ensured.isOnboarded;
            t.image = ensured.image ?? providerImage ?? null;

            // next-auth 기본 token.picture도 같이 맞춰주면 session.image가 자연스럽게 따라감
            (t as unknown as { picture?: string | null }).picture = t.image ?? null;

            return t;
        },

        // ✅ session 콜백은 절대 DB 타지 말고 token에서 복사만
        async session({ session, token }): Promise<Session> {
            const t = token as AppToken;

            if (!session.user) {
                return session;
            }

            if (t.uid) {
                // 너가 쓰던 필드들 유지
                (session.user as { id?: string }).id = t.uid;
                (session.user as { appUserId?: string }).appUserId = t.uid;
            }

            if (t.username) {
                (session.user as { username?: string }).username = t.username;
            }

            if (typeof t.image !== "undefined") {
                session.user.image = t.image ?? null;
            }

            // onboarding 여부도 토큰에 실어둠(원하면 mypage에서 DB 조회 없이 사용 가능)
            (session.user as { isOnboarded?: boolean }).isOnboarded = Boolean(t.onboarded);

            return session;
        },
    },

    secret: process.env.NEXTAUTH_SECRET,
};

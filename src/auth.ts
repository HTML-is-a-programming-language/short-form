// src/auth.ts
import NextAuth, {
    type NextAuthConfig,
    type Session,
} from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const authConfig: NextAuthConfig = {
    adapter: PrismaAdapter(db) as Adapter,
    session: { strategy: "jwt" },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async session({
            session,
            token,
        }: {
            session: Session;
            token: JWT;
        }): Promise<Session> {
            if (token.sub && session.user) {
                // next-auth.d.ts 에서 확장해둔 타입이라 바로 사용 가능
                session.user.id = token.sub;
            }
            return session;
        },
    },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

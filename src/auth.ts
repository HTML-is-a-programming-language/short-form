// src/auth.ts
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";

/**
 * 서버 컴포넌트나 Route Handler에서
 * 현재 로그인한 유저의 세션을 가져오는 헬퍼
 */
export async function auth(): Promise<Session | null> {
    return getServerSession(authOptions);
}

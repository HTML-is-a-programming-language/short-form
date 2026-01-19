// src/app/api/onboarding/check-username/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const USERNAME_RE = /^[a-zA-Z0-9_가-힣ㄱ-ㅎㅏ-ㅣ]{2,15}$/;

const RESERVED = new Set<string>([
    "admin",
    "support",
    "help",
    "upload",
    "mypage",
    "onboarding",
    "api",
]);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { ok: false, available: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    const url = new URL(request.url);
    const raw = (url.searchParams.get("username") ?? "").trim().toLowerCase();

    if (!raw) {
        return NextResponse.json({ ok: true, available: false, message: "닉네임을 입력해 주세요." });
    }

    if (!USERNAME_RE.test(raw)) {
        return NextResponse.json({
            ok: true,
            available: false,
            message: "한글/영문/숫자/언더스코어만, 2~15자여야 해요.",
        });
    }

    if (RESERVED.has(raw)) {
        return NextResponse.json({
            ok: true,
            available: false,
            message: "사용할 수 없는 닉네임이에요.",
        });
    }

    const userId = (session.user as { id?: string }).id;

    const existing = await db.user.findUnique({
        where: { username: raw },
        select: { id: true },
    });

    if (!existing) {
        return NextResponse.json({ ok: true, available: true });
    }

    if (userId && existing.id === userId) {
        return NextResponse.json({ ok: true, available: true });
    }

    return NextResponse.json({ ok: true, available: false, message: "이미 사용 중인 닉네임이에요." });
}

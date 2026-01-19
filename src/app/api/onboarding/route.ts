// src/app/api/onboarding/route.ts
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

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;

    if (!userId) {
        return NextResponse.json(
            { message: "Session user id is missing" },
            { status: 500 }
        );
    }

    const body = await request.json().catch(() => null) as
        | { username?: string; bio?: string; agree?: boolean }
        | null;

    const username = (body?.username ?? "").trim().toLowerCase();
    const bio = (body?.bio ?? "").trim();
    const agree = Boolean(body?.agree);

    if (!agree) {
        return NextResponse.json({ message: "필수 약관 동의가 필요해요." }, { status: 400 });
    }

    if (!USERNAME_RE.test(username)) {
        return NextResponse.json(
            { message: "닉네임은 영문/숫자/언더스코어만, 3~15자여야 해요." },
            { status: 400 }
        );
    }

    if (RESERVED.has(username)) {
        return NextResponse.json({ message: "사용할 수 없는 닉네임이에요." }, { status: 400 });
    }

    const existing = await db.user.findUnique({
        where: { username },
        select: { id: true },
    });

    if (existing && existing.id !== userId) {
        return NextResponse.json({ message: "이미 사용 중인 닉네임이에요." }, { status: 409 });
    }

    await db.user.update({
        where: { id: userId },
        data: {
            username,
            bio: bio ? bio : null,
            isOnboarded: true,
            termsAgreedAt: new Date(),
        },
    });

    return NextResponse.json({ ok: true });
}

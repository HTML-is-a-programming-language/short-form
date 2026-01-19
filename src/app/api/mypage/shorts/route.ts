// src/app/api/mypage/shorts/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; username?: string; email?: string };

    // ✅ 세션에 id가 없을 수도 있으니(username/email로) DB에서 id를 보정
    let userId = user.id;

    if (!userId) {
        if (user.username) {
            const found = await db.user.findUnique({
                where: { username: user.username },
                select: { id: true },
            });
            userId = found?.id;
        } else if (user.email) {
            const found = await db.user.findUnique({
                where: { email: user.email },
                select: { id: true },
            });
            userId = found?.id;
        }
    }

    if (!userId) {
        return NextResponse.json(
            { message: "User id is missing in session and cannot be resolved." },
            { status: 500 }
        );
    }

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");

    const limitRaw = limitParam ? Number(limitParam) : DEFAULT_LIMIT;
    const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(1, limitRaw), MAX_LIMIT)
        : DEFAULT_LIMIT;

    const rows = await db.video.findMany({
        where: {
            authorId: userId,
            // ✅ 여기!
            deletedAt: null,
        },
        orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
        ],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
            id: true,
            uid: true,
            title: true,
            thumbnailUrl: true,
            isPublic: true,
            status: true,
            createdAt: true,
        },
    });

    const hasMore = rows.length > limit;
    const pageItems = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
        hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;

    return NextResponse.json({
        items: pageItems.map((r) => ({
            id: r.id,
            uid: r.uid,
            title: r.title,
            thumbnailUrl: r.thumbnailUrl,
            isPublic: r.isPublic,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
        })),
        nextCursor,
    });
}

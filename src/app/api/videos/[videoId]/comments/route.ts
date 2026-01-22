import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
    return NextResponse.json({ ok: false, message }, { status });
}

function getSessionUserId(session: unknown): string | null {
    const s = session as { user?: { id?: string; appUserId?: string } } | null;
    return s?.user?.id ?? s?.user?.appUserId ?? null;
}

async function resolveVideoId(videoParam: string): Promise<string | null> {
    const video = await db.video.findFirst({
        where: {
            OR: [{ id: videoParam }, { uid: videoParam }],
            deletedAt: null,
        },
        select: { id: true },
    });

    return video?.id ?? null;
}

type Ctx = {
    params: Promise<{ videoId: string }>;
};

export async function GET(req: Request, ctx: Ctx) {
    const { videoId: videoParam } = await ctx.params;

    const videoId = await resolveVideoId(videoParam);
    if (!videoId) return jsonError("Video not found", 404);

    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get("take") ?? 20), 50);
    const cursor = url.searchParams.get("cursor"); // commentId

    const items = await db.comment.findMany({
        where: {
            videoId,
            deletedAt: null,
            // 최상위 댓글만 원하면 아래 주석 해제
            // parentId: null,
        },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    image: true,
                },
            },
        },
    });

    const hasNext = items.length > take;
    const sliced = hasNext ? items.slice(0, take) : items;
    const nextCursor = hasNext ? sliced[sliced.length - 1]?.id ?? null : null;

    return NextResponse.json({
        ok: true,
        items: sliced,
        nextCursor,
    });
}

export async function POST(req: Request, ctx: Ctx) {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId) return jsonError("Unauthorized", 401);

    const { videoId: videoParam } = await ctx.params;

    const videoId = await resolveVideoId(videoParam);
    if (!videoId) return jsonError("Video not found", 404);

    const payload = (await req.json().catch(() => null)) as { body?: string } | null;
    if (!payload) return jsonError("Invalid JSON", 400);

    const body = String(payload.body ?? "").trim();
    if (body.length < 1) return jsonError("Comment is empty", 400);
    if (body.length > 500) return jsonError("Comment is too long (max 500)", 400);

    const created = await db.comment.create({
        data: {
            userId,
            videoId,
            body,
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    image: true,
                },
            },
        },
    });

    // POST 응답에 totalCount가 필요하면 comment-count로 다시 세도 됨(여긴 1번만 호출)
    const totalCount = await db.comment.count({ where: { videoId } });

    return NextResponse.json({
        ok: true,
        item: created,
        totalCount,
    });
}

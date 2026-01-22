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

type DeleteCtx = {
    params: Promise<{
        commentId: string;
    }>;
};

export async function DELETE(
    _req: Request,
    ctx: DeleteCtx
) {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId) return jsonError("Unauthorized", 401);

    const { commentId } = await ctx.params;

    const comment = await db.comment.findUnique({
        where: { id: commentId },
        select: { id: true, userId: true, videoId: true },
    });

    if (!comment) return jsonError("Not found", 404);
    if (comment.userId !== userId) return jsonError("Forbidden", 403);

    await db.comment.delete({ where: { id: commentId } });

    const totalCount = await db.comment.count({ where: { videoId: comment.videoId } });

    return NextResponse.json({ ok: true, totalCount });
}

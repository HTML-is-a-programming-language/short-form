// src/app/api/mypage/shorts/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, context: { params: { id: string } }) {
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

    const videoId = context.params.id;

    // 1) 영상 존재 + 소유자 + 삭제 여부 확인
    const video = await db.video.findUnique({
        where: { id: videoId },
        select: { id: true, authorId: true, deletedAt: true },
    });

    if (!video || video.deletedAt) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (video.authorId !== userId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // 2) 소프트 삭제 처리
    await db.video.update({
        where: { id: videoId },
        data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}

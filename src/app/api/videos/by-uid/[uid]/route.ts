import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ uid: string }> }
) {
    const { uid } = await params;

    const video = await db.video.findUnique({
        where: { uid },
        select: {
            id: true,
            uid: true,
            title: true,
            videoUrl: true,
            thumbnailUrl: true,
        },
    });

    if (!video) {
        return NextResponse.json(
            { ok: false, message: "Not found" },
            { status: 404 }
        );
    }

    return NextResponse.json({ ok: true, video }, { status: 200 });
}

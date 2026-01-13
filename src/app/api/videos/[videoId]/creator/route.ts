// src/app/api/videos/[videoId]/creator/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ videoId: string }> }
) {
    const { videoId } = await params;

    if (!videoId) {
        return NextResponse.json({ creator: null }, { status: 400 });
    }

    const video = await db.video.findUnique({
        where: { id: videoId }, // 너는 id를 넘기고 있으니 id 기준이 맞음
        select: {
            author: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                },
            },
        },
    });

    if (!video?.author) {
        return NextResponse.json({ creator: null }, { status: 404 });
    }

    return NextResponse.json({ creator: video.author }, { status: 200 });
}

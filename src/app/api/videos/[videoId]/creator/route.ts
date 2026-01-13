import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // 네 prisma 경로에 맞게

type Params = {
    params: {
        videoId: string;
    };
};

export async function GET(_: Request, { params }: Params) {
    const { videoId } = params;

    if (!videoId) {
        return NextResponse.json({ creator: null }, { status: 400 });
    }

    const video = await db.video.findUnique({
        where: { id: videoId },
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

    return NextResponse.json({
        creator: {
            id: video.author.id,
            name: video.author.name,
            username: video.author.username,
            image: video.author.image,
        },
    });
}

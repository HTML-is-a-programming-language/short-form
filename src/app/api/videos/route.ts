// src/app/api/videos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

type VideoCreateBody = {
    uid: string;
    title: string;
    description?: string;
    storagePath: string;
    videoUrl: string;
};

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.appUserId) {
            return NextResponse.json(
                { error: "unauthorized" },
                { status: 401 },
            );
        }

        const body = (await req.json()) as VideoCreateBody;
        const { uid, title, description, storagePath, videoUrl } = body;

        const authorId = session.user.appUserId;

        const video = await db.video.create({
            data: {
                uid,
                authorId,
                title,
                description,
                storagePath,
                videoUrl,
                status: "READY",
            },
        });

        return NextResponse.json({ ok: true, video }, { status: 201 });
    } catch (err: unknown) {
        console.error("[POST /api/videos] error:", err);

        const message =
            err instanceof Error ? err.message : "unknown error";

        return NextResponse.json(
            { error: message },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get("cursor");
        const take = 10;

        const videos = await db.video.findMany({
            where: { isPublic: true, status: "READY" },
            orderBy: { createdAt: "desc" },
            take: take + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: { author: true },
        });

        const nextCursor = videos.length > take ? videos.pop()!.id : null;

        return NextResponse.json(
            { videos, nextCursor },
            { status: 200 },
        );
    } catch (err: unknown) {
        console.error("[GET /api/videos] error:", err);

        const message =
            err instanceof Error ? err.message : "unknown error";

        return NextResponse.json(
            { error: message, videos: [], nextCursor: null },
            { status: 500 },
        );
    }
}

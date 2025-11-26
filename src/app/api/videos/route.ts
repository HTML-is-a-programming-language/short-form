// src/app/api/videos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

type Body = {
    uid: string;
    title: string;
    description?: string;
    storagePath: string;
    videoUrl: string;
};

// POST /api/videos  → 업로드 끝난 후 DB에 영상 정보 저장
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || !(session.user as any).appUserId) {
            return NextResponse.json(
                { error: "unauthorized" },
                { status: 401 },
            );
        }

        const body = (await req.json()) as Body;
        const { uid, title, description, storagePath, videoUrl } = body;

        if (!uid || !title || !storagePath || !videoUrl) {
            return NextResponse.json(
                { error: "missing required fields" },
                { status: 400 },
            );
        }

        const authorId = (session.user as any).appUserId as string;

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
    } catch (err: any) {
        console.error("[POST /api/videos] error:", err);
        return NextResponse.json(
            { error: err?.message ?? String(err) },
            { status: 500 },
        );
    }
}

// GET /api/videos  → 피드 목록
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
    } catch (err: any) {
        console.error("[GET /api/videos] error:", err);
        return NextResponse.json(
            { error: err?.message ?? String(err), videos: [], nextCursor: null },
            { status: 500 },
        );
    }
}

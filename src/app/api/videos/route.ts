import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const takeRaw = Number(searchParams.get("take") ?? "10");
    const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 30) : 10;

    const cursor = searchParams.get("cursor"); // Video.id 커서

    const rows = await db.video.findMany({
        where: {
            isPublic: true,
            status: "READY",
        },
        orderBy: {
            createdAt: "desc",
        },
        take: take + 1,
        ...(cursor
            ? {
                  cursor: { id: cursor },
                  skip: 1,
              }
            : {}),
        select: {
            id: true,
            title: true,
            videoUrl: true,
            thumbnailUrl: true,
        },
    });

    const hasMore = rows.length > take;
    const videos = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = videos.length ? videos[videos.length - 1].id : null;

    return NextResponse.json(
        {
            videos,
            nextCursor,
        },
        { status: 200 }
    );
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const videoUrl = String(body?.videoUrl ?? "").trim();
    const thumbnailUrl = String(body?.thumbnailUrl ?? "").trim();

    const authorId = (session.user as { id?: string }).id;
    if (!authorId) {
        return NextResponse.json({ message: "Session user id missing" }, { status: 400 });
    }

    if (!title) {
        return NextResponse.json({ message: "제목이 필요해요." }, { status: 400 });
    }

    if (!videoUrl) {
        return NextResponse.json({ message: "videoUrl이 필요해요." }, { status: 400 });
    }

    const uid = randomUUID();

    const video = await db.video.create({
        data: {
            uid,
            authorId,
            title,
            description: description ? description : null,
            storagePath: `uploads/${uid}`,
            videoUrl,
            thumbnailUrl: thumbnailUrl ? thumbnailUrl : null,
            status: "READY",
            isPublic: true,
        },
        select: {
            id: true,
            uid: true,
        },
    });

    return NextResponse.json({ video }, { status: 201 });
}

// src/app/api/videos/[videoId]/reaction/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ✅ Next.js 15 스타일: params는 Promise 타입
type RouteContext = {
    params: Promise<{ videoId: string }>;
};

// 👍 GET: 현재 영상의 좋아요/싫어요 상태 조회
export async function GET(req: NextRequest, context: RouteContext) {
    // 🔥 반드시 이렇게 꺼내야 함
    const { videoId } = await context.params;

    const session = await auth();
    const userId = session?.user?.appUserId ?? null;

    if (!videoId) {
        return new NextResponse("Missing videoId", { status: 400 });
    }

    const [likeCount, dislikeCount, myReaction] = await Promise.all([
        db.videoReaction.count({
            where: { videoId, type: "LIKE" },
        }),
        db.videoReaction.count({
            where: { videoId, type: "DISLIKE" },
        }),
        userId
            ? db.videoReaction.findUnique({
                  where: {
                      userId_videoId: { userId, videoId },
                  },
              })
            : Promise.resolve(null),
    ]);

    return NextResponse.json({
        likeCount,
        dislikeCount,
        myReaction: myReaction?.type ?? null,
    });
}

// 👍 POST: 내 좋아요/싫어요 상태 변경
export async function POST(req: NextRequest, context: RouteContext) {
    // 🔥 여기서도 똑같이 params를 await 해서 사용
    const { videoId } = await context.params;

    const session = await auth();
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.appUserId;

    if (!videoId) {
        return new NextResponse("Missing videoId", { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const type = body?.type as "LIKE" | "DISLIKE" | "NONE" | undefined;

    if (!type || !["LIKE", "DISLIKE", "NONE"].includes(type)) {
        return new NextResponse("Invalid type", { status: 400 });
    }

    if (type === "NONE") {
        // 반응 제거
        await db.videoReaction.deleteMany({
            where: { userId, videoId },
        });
    } else {
        // upsert로 LIKE/DISLIKE 갱신
        await db.videoReaction.upsert({
            where: {
                userId_videoId: { userId, videoId },
            },
            create: {
                userId,
                videoId,
                type,
            },
            update: { type },
        });
    }

    // 최신 카운트 다시 계산해서 반환
    const [likeCount, dislikeCount, myReaction] = await Promise.all([
        db.videoReaction.count({
            where: { videoId, type: "LIKE" },
        }),
        db.videoReaction.count({
            where: { videoId, type: "DISLIKE" },
        }),
        db.videoReaction.findUnique({
            where: {
                userId_videoId: { userId, videoId },
            },
        }),
    ]);

    return NextResponse.json({
        likeCount,
        dislikeCount,
        myReaction: myReaction?.type ?? null,
    });
}

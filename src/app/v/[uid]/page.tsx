// src/app/v/[uid]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = {
    params: Promise<{
        uid: string;
    }>;
};

export default async function VideoDetailPage({ params }: Props) {
    const { uid } = await params;

    const video = await db.video.findUnique({
        where: { uid },
        select: {
            uid: true,
            title: true,
            description: true,
            videoUrl: true,
            thumbnailUrl: true,
            author: {
                select: {
                    username: true,
                    name: true,
                    image: true,
                },
            },
            createdAt: true,
        },
    });

    if (!video) {
        notFound();
    }

    return (
        <main className="min-h-dvh bg-black text-white flex justify-center">
            <div className="w-full max-w-md px-4 py-8 space-y-4">
                <Link href="/" className="text-sm text-white/70">
                    ← 홈으로
                </Link>

                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                    <video
                        src={video.videoUrl}
                        poster={video.thumbnailUrl ?? undefined}
                        controls
                        playsInline
                        className="w-full"
                    />
                </div>

                <div className="space-y-2">
                    <div className="text-lg font-semibold">{video.title}</div>
                    {video.description ? (
                        <div className="text-sm text-white/70 whitespace-pre-wrap">
                            {video.description}
                        </div>
                    ) : null}

                    <div className="text-xs text-white/50">
                        작성자: {video.author.name ?? video.author.username} (@{video.author.username})
                    </div>
                </div>
            </div>
        </main>
    );
}

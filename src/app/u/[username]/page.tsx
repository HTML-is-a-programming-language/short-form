// src/app/u/[username]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Props = {
    params: Promise<{
        username: string;
    }>;
};

export default async function UserProfilePage({ params }: Props) {
    const { username: raw } = await params;
    const username = decodeURIComponent(raw).trim();

    const user = await db.user.findFirst({
        where: { username },
        select: {
            id: true,
            username: true,
            name: true,
            image: true,
        },
    });

    if (!user) {
        notFound();
    }

    const profileImage =
        user.image && user.image.trim() !== ""
            ? user.image
            : "/images/default-avatar.png";

    const videos = await db.video.findMany({
        where: {
            authorId: user.id,
            isPublic: true,
            status: "READY",
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            uid: true,
            title: true,
            thumbnailUrl: true,
        },
        take: 60,
    });

    return (
        <main className="min-h-dvh bg-black text-white flex justify-center">
            <div className="w-full max-w-md px-4 py-8">
                <header className="flex items-center justify-between mb-6">
                    <Link href="/" className="text-sm text-white/70 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFF"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/></svg>
                    </Link>
                    <div className="text-sm text-white/50">@{user.username}</div>
                </header>

                <section className="bg-white/5 rounded-2xl p-5 flex items-center gap-4 mb-6">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                        <Image
                            src={profileImage}
                            alt="프로필 이미지"
                            fill
                            sizes="56px"
                            className="object-cover"
                        />
                    </div>

                    <div className="flex-1">
                        <div className="text-base font-semibold">
                            {user.name ?? user.username}
                        </div>
                        <div className="text-xs text-white/50 mt-1">
                            @{user.username}
                        </div>
                    </div>
                </section>

                <h2 className="text-sm font-semibold text-white/70 mb-3">
                    업로드한 숏폼
                </h2>

                {videos.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                        아직 업로드한 영상이 없어요.
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {videos.map((v) => (
                            <Link
                                key={v.id}
                                href={`/?v=${encodeURIComponent(v.uid)}`}
                                className="
                                    group relative overflow-hidden rounded-xl
                                    border border-white/10 bg-white/5
                                    hover:border-white/20 transition
                                "
                                title={v.title}
                            >
                                {/* 9:16 비율(숏폼) 느낌 */}
                                <div className="relative w-full pt-[177.78%] bg-black/40">
                                    {v.thumbnailUrl ? (
                                        // 외부 썸네일이면 next/image 설정 때문에 막힐 수 있어서 img 사용
                                        <img
                                            src={v.thumbnailUrl}
                                            alt={v.title}
                                            className="absolute inset-0 h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
                                            No Thumbnail
                                        </div>
                                    )}

                                    {/* hover 시 살짝 어둡게 */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

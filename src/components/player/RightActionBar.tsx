"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CommentDrawer from "@/components/comments/CommentDrawer";

type RightActionBarProps = {
    videoId: string;
    commentCacheRef?: React.MutableRefObject<Map<string, Prefetched> >;
};

type MyReactionType = "LIKE" | "DISLIKE" | null;

type Creator = {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
} | null;

type CommentUser = {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
};

type CommentItem = {
    id: string;
    userId: string;
    videoId: string;
    body: string;
    createdAt: string;
    user: CommentUser;
};

type Prefetched = {
    videoId: string;
    totalCount: number;
    items: CommentItem[];
    nextCursor: string | null;
};

type ApiList = {
    ok: boolean;
    items: CommentItem[];
    nextCursor: string | null;
};

type ApiCount = {
    ok: boolean;
    totalCount?: number;
    count?: number;
};

export default function RightActionBar({ videoId, commentCacheRef }: RightActionBarProps) {
    const { data: session } = useSession();

    const [creator, setCreator] = useState<Creator>(null);

    const [likeCount, setLikeCount] = useState<number>(0);
    const [dislikeCount, setDislikeCount] = useState<number>(0);
    const [myReaction, setMyReaction] = useState<MyReactionType>(null);

    const [commentCount, setCommentCount] = useState<number>(0);

    const [commentOpen, setCommentOpen] = useState(false);
    const [prefetching, setPrefetching] = useState(false);
    const [prefetched, setPrefetched] = useState<Prefetched | null>(null);

    // 내부 캐시(외부 캐시 없을 때만 사용)
    const internalCacheRef = useRef(new Map<string, Prefetched>());
    const cacheRef = commentCacheRef ?? internalCacheRef;

    const prefetchTokenRef = useRef(0);

    // video 바뀌면 drawer 닫고 초기화 + 캐시값 즉시 반영
    useEffect(() => {
        setCommentOpen(false);
        setPrefetching(false);

        const cached = cacheRef.current.get(videoId) ?? null;
        setPrefetched(cached);

        if (cached) {
            setCommentCount(Number(cached.totalCount ?? 0));
        } else {
            setCommentCount(0);
        }
    }, [videoId, cacheRef]);

    // ✅ 리액션 로드
    useEffect(() => {
        if (!videoId) return;

        const fetchReactions = async () => {
            try {
                const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/reaction`, {
                    method: "GET",
                });
                if (!res.ok) return;

                const data = (await res.json().catch(() => null)) as
                    | { likeCount?: number; dislikeCount?: number; myReaction?: MyReactionType }
                    | null;

                if (!data) return;

                setLikeCount(Number(data.likeCount ?? 0));
                setDislikeCount(Number(data.dislikeCount ?? 0));
                setMyReaction((data.myReaction ?? null) as MyReactionType);
            } catch {
                // ignore
            }
        };

        void fetchReactions();
    }, [videoId]);

    // ✅ 작성자(업로더) 로드
    useEffect(() => {
        if (!videoId) return;

        const controller = new AbortController();

        const fetchCreator = async () => {
            try {
                const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/creator`, {
                    method: "GET",
                    signal: controller.signal,
                });
                if (!res.ok) return;

                const data = (await res.json().catch(() => null)) as { creator?: Creator } | null;
                if (!data) return;

                setCreator(data.creator ?? null);
            } catch (err) {
                if ((err as Error).name === "AbortError") return;
            }
        };

        void fetchCreator();

        return () => controller.abort();
    }, [videoId]);

    // ✅ 댓글 카운트(캐시가 있어도 서버에서 한 번 더 갱신)
    useEffect(() => {
        if (!videoId) return;

        const cached = cacheRef.current.get(videoId);
        if (cached) {
            setCommentCount(Number(cached.totalCount ?? 0));
        }

        const controller = new AbortController();

        const fetchCount = async () => {
            try {
                const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/comment-count`, {
                    method: "GET",
                    cache: "no-store",
                    signal: controller.signal,
                });
                if (!res.ok) return;

                const data = (await res.json().catch(() => null)) as ApiCount | null;
                if (!data || !data.ok) return;

                const next = Number(data.totalCount ?? data.count ?? 0);
                setCommentCount(next);

                const cur = cacheRef.current.get(videoId);
                if (cur) {
                    cacheRef.current.set(videoId, {
                        ...cur,
                        totalCount: next,
                    });
                    setPrefetched((prev) => {
                        if (!prev) return prev;
                        if (prev.videoId !== videoId) return prev;
                        return { ...prev, totalCount: next };
                    });
                }
            } catch (err) {
                if ((err as Error).name === "AbortError") return;
            }
        };

        void fetchCount();

        return () => controller.abort();
    }, [videoId, cacheRef]);

    const creatorRawImage = creator?.image ?? "";
    const creatorProfileImage =
        creatorRawImage && creatorRawImage.trim() !== ""
            ? creatorRawImage
            : "/images/default-avatar.png";

    const creatorAlt = creator?.name ?? creator?.username ?? "작성자";
    const creatorHref = creator ? `/users/${encodeURIComponent(creator.username)}` : "#";

    const handleReactionClick = async (nextType: "LIKE" | "DISLIKE") => {
        if (!session?.user) {
            const current = encodeURIComponent(window.location.pathname);
            window.location.href = `/api/auth/signin?callbackUrl=${current}`;
            return;
        }

        const newType: "LIKE" | "DISLIKE" | "NONE" =
            myReaction === nextType ? "NONE" : nextType;

        // 낙관적 업데이트
        setLikeCount((prev) => {
            let v = prev;
            if (myReaction === "LIKE") v -= 1;
            if (newType === "LIKE") v += 1;
            return Math.max(v, 0);
        });

        setDislikeCount((prev) => {
            let v = prev;
            if (myReaction === "DISLIKE") v -= 1;
            if (newType === "DISLIKE") v += 1;
            return Math.max(v, 0);
        });

        setMyReaction(newType === "NONE" ? null : (newType as MyReactionType));

        try {
            const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/reaction`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ type: newType }),
            });

            if (!res.ok) {
                return;
            }

            const data = (await res.json().catch(() => null)) as
                | { likeCount?: number; dislikeCount?: number; myReaction?: MyReactionType }
                | null;

            if (!data) return;

            setLikeCount(Number(data.likeCount ?? 0));
            setDislikeCount(Number(data.dislikeCount ?? 0));
            setMyReaction((data.myReaction ?? null) as MyReactionType);
        } catch {
            // ignore
        }
    };

    const handleCountChange = (n: number) => {
        setCommentCount(n);

        setPrefetched((prev) => {
            if (!prev) return prev;
            if (prev.videoId !== videoId) return prev;
            return {
                ...prev,
                totalCount: n,
            };
        });

        const cached = cacheRef.current.get(videoId);
        if (cached) {
            cacheRef.current.set(videoId, {
                ...cached,
                totalCount: n,
            });
        }
    };

    // ✅ 댓글: 열기 전에 1페이지 + count 병렬 prefetch 후 open
    const openCommentsWithPrefetch = async () => {
        if (!videoId) return;
        if (prefetching) return;

        const cached = cacheRef.current.get(videoId);
        if (cached) {
            setPrefetched(cached);
            setCommentCount(Number(cached.totalCount ?? commentCount));
            setCommentOpen(true);
            return;
        }

        prefetchTokenRef.current += 1;
        const token = prefetchTokenRef.current;

        setPrefetching(true);

        try {
            const qs = new URLSearchParams();
            qs.set("take", "20");

            const listUrl = `/api/videos/${encodeURIComponent(videoId)}/comments?${qs.toString()}`;
            const countUrl = `/api/videos/${encodeURIComponent(videoId)}/comment-count`;

            const [listRes, countRes] = await Promise.all([
                fetch(listUrl, { method: "GET", cache: "no-store" }),
                fetch(countUrl, { method: "GET", cache: "no-store" }),
            ]);

            if (prefetchTokenRef.current !== token) return;

            const listData = (await listRes.json().catch(() => null)) as ApiList | null;
            const countData = (await countRes.json().catch(() => null)) as ApiCount | null;

            const listOk = Boolean(listRes.ok && listData && listData.ok);
            const countOk = Boolean(countRes.ok && countData && countData.ok);

            const nextCount = countOk ? Number(countData?.totalCount ?? countData?.count ?? 0) : commentCount;
            if (countOk) {
                setCommentCount(nextCount);
            }

            if (listOk || countOk) {
                const packed: Prefetched = {
                    videoId,
                    totalCount: nextCount,
                    items: listOk && Array.isArray(listData?.items) ? listData.items : [],
                    nextCursor: listOk ? (listData?.nextCursor ?? null) : null,
                };

                cacheRef.current.set(videoId, packed);
                setPrefetched(packed);
            } else {
                setPrefetched(null);
            }

            setCommentOpen(true);
        } catch {
            setCommentOpen(true);
        } finally {
            if (prefetchTokenRef.current === token) {
                setPrefetching(false);
            }
        }
    };

    return (
        <>
            <div
                className="
                    absolute
                    right-3
                    bottom-24
                    z-[200]
                    pointer-events-auto
                    flex
                    flex-col
                    items-center
                    gap-4
                "
            >
                {/* 좋아요 */}
                <button
                    type="button"
                    onClick={() => handleReactionClick("LIKE")}
                    className="flex flex-col items-center gap-1"
                >
                    <div
                        className={`
                            flex h-12 w-12 items-center justify-center rounded-full text-xl
                            ${myReaction === "LIKE" ? "bg-red-500 text-white" : "bg-black/60 text-white"}
                        `}
                    >
                        👍
                    </div>
                    <span
                        className={`
                            text-xs drop-shadow
                            ${myReaction === "LIKE" ? "text-red-300" : "text-white"}
                        `}
                    >
                        {likeCount}
                    </span>
                </button>

                {/* 싫어요 */}
                <button
                    type="button"
                    onClick={() => handleReactionClick("DISLIKE")}
                    className="flex flex-col items-center gap-1"
                >
                    <div
                        className={`
                            flex h-12 w-12 items-center justify-center rounded-full text-xl
                            ${myReaction === "DISLIKE" ? "bg-slate-500 text-white" : "bg-black/60 text-white"}
                        `}
                    >
                        👎
                    </div>
                    <span
                        className={`
                            text-xs drop-shadow
                            ${myReaction === "DISLIKE" ? "text-slate-200" : "text-white"}
                        `}
                    >
                        {dislikeCount}
                    </span>
                </button>

                {/* 댓글 */}
                <button
                    type="button"
                    className="flex flex-col items-center gap-1"
                    onClick={openCommentsWithPrefetch}
                    disabled={prefetching}
                    title={prefetching ? "댓글 불러오는 중..." : "댓글 보기"}
                >
                    <div
                        className="
                            flex
                            h-12 w-12
                            items-center justify-center
                            rounded-full
                            bg-black/60
                            text-xl
                            text-white
                        "
                    >
                        {prefetching ? "⏳" : "💬"}
                    </div>
                    <span className="text-xs text-white drop-shadow">
                        {commentCount}
                    </span>
                </button>

                {/* 공유 */}
                <button type="button" className="flex flex-col items-center gap-1">
                    <div
                        className="
                            flex
                            h-12 w-12
                            items-center justify-center
                            rounded-full
                            bg-black/60
                            text-xl
                            text-white
                        "
                    >
                        ↗
                    </div>
                    <span className="text-xs text-white drop-shadow">공유</span>
                </button>

                {/* 작성자 프로필 */}
                <Link
                    href={creatorHref}
                    className={`mt-1 flex flex-col items-center gap-1 ${creator ? "" : "pointer-events-none opacity-60"}`}
                >
                    <div
                        className="
                            h-12 w-12
                            overflow-hidden
                            rounded-full
                            bg-white
                            flex items-center justify-center
                        "
                    >
                        <img
                            src={creatorProfileImage}
                            alt={creatorAlt}
                            className="h-full w-full"
                        />
                    </div>
                    <span
                        className="
                            text-xs text-white drop-shadow
                            max-w-[72px] truncate
                        "
                        title={creator ? `@${creator.username}` : "작성자"}
                    >
                        {creator ? creator.username : "작성자"}
                    </span>
                </Link>
            </div>

            <CommentDrawer
                open={commentOpen}
                videoId={videoId}
                onClose={() => setCommentOpen(false)}
                initialData={prefetched}
                onCountChange={handleCountChange}
            />
        </>
    );
}

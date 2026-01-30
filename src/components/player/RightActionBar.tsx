// src/components/player/RightActionBar.tsx
"use client";

import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CommentDrawer from "@/components/comments/CommentDrawer";

type RightActionBarProps = {
    videoId: string; // ✅ 기존 API용(id)
    videoUid: string; // ✅ 공유 링크용(uid)
    videoTitle?: string;
    commentCacheRef?: MutableRefObject<Map<string, Prefetched>>;
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

type ApiReaction = {
    likeCount?: number;
    dislikeCount?: number;
    myReaction?: MyReactionType;
} | null;

export default function RightActionBar({
    videoId,
    videoUid,
    videoTitle,
    commentCacheRef,
}: RightActionBarProps) {
    const router = useRouter();
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

    // ✅ 추가 캐시: 작성자/댓글카운트/리액션
    const creatorCacheRef = useRef(new Map<string, Creator>());
    const countCacheRef = useRef(new Map<string, number>());
    const reactionCacheRef = useRef(new Map<string, { like: number; dislike: number; my: MyReactionType }>());

    const inFlightCreatorRef = useRef(new Set<string>());
    const inFlightCountRef = useRef(new Set<string>());
    const inFlightReactionRef = useRef(new Set<string>());

    const sessionKey = useMemo(() => {
        const u = session?.user as { id?: string; appUserId?: string } | undefined;
        return u?.id ?? u?.appUserId ?? "anon";
    }, [session?.user]);

    const runIdle = useCallback((fn: () => void) => {
        if (typeof window === "undefined") return () => undefined;

        if ("requestIdleCallback" in window) {
            const id = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
                .requestIdleCallback(fn, { timeout: 800 });
            return () => {
                try {
                    (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
                } catch {
                    // ignore
                }
            };
        }

        const w = window as unknown as Window;

        const t = w.setTimeout(() => {
            fn();
        }, 200);

        return () => {
            w.clearTimeout(t);
        };
    }, []);

    // ✅ 공유 동작
    const shareNow = async () => {
        if (!videoUid) return;

        const origin = window.location.origin;

        // ✅ 상세페이지(/v/uid)가 아니라 메인(/?v=uid)으로 공유
        const url = `${origin}/?v=${encodeURIComponent(videoUid)}`;

        const payload = {
            title: videoTitle ?? "영상",
            text: "",
            url,
        };

        try {
            if ("share" in navigator) {
                await (navigator as Navigator & { share: (data: any) => Promise<void> }).share(payload);
                return;
            }
        } catch {
            // 사용자 취소/지원불안정 → 복사로 폴백
        }

        try {
            await navigator.clipboard.writeText(url);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = url;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }
    };

    // video 바뀌면 drawer 닫고 초기화 + 캐시값 즉시 반영
    useEffect(() => {
        setCommentOpen(false);
        setPrefetching(false);

        const cached = cacheRef.current.get(videoId) ?? null;
        setPrefetched(cached);

        if (cached) {
            setCommentCount(Number(cached.totalCount ?? 0));
        } else {
            const cachedCount = countCacheRef.current.get(videoId);
            setCommentCount(Number(cachedCount ?? 0));
        }
    }, [videoId, cacheRef]);

    // ✅ 작성자 링크 만들기
    const creatorHref = useMemo(() => {
        return creator ? `/u/${encodeURIComponent(creator.username)}` : "#";
    }, [creator]);

    // ✅ 작성자 페이지 미리 받기(creator가 잡히는 순간 + hover)
    useEffect(() => {
        if (creator) {
            router.prefetch(creatorHref);
        }
    }, [creator, creatorHref, router]);

    // ✅ 리액션 로드 (네비게이션 방해 줄이기 위해 idle에서 실행 + 캐시)
    useEffect(() => {
        if (!videoId) return;

        const key = `${videoId}:${sessionKey}`;

        const cached = reactionCacheRef.current.get(key);
        if (cached) {
            setLikeCount(cached.like);
            setDislikeCount(cached.dislike);
            setMyReaction(cached.my);
            return;
        }

        if (inFlightReactionRef.current.has(key)) return;
        inFlightReactionRef.current.add(key);

        const controller = new AbortController();

        const cancelIdle = runIdle(() => {
            const fetchReactions = async () => {
                try {
                    const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/reaction`, {
                        method: "GET",
                        signal: controller.signal,
                        cache: "no-store", // myReaction 포함 가능성 높아서 안전하게
                    });
                    if (!res.ok) return;

                    const data = (await res.json().catch(() => null)) as ApiReaction;
                    if (!data) return;

                    const like = Number(data.likeCount ?? 0);
                    const dislike = Number(data.dislikeCount ?? 0);
                    const my = (data.myReaction ?? null) as MyReactionType;

                    setLikeCount(like);
                    setDislikeCount(dislike);
                    setMyReaction(my);

                    reactionCacheRef.current.set(key, { like, dislike, my });
                } catch (err) {
                    if ((err as Error).name === "AbortError") return;
                } finally {
                    inFlightReactionRef.current.delete(key);
                }
            };

            void fetchReactions();
        });

        return () => {
            cancelIdle();
            controller.abort();
            inFlightReactionRef.current.delete(key);
        };
    }, [videoId, sessionKey, runIdle]);

    // ✅ 작성자(업로더) 로드 (idle + 캐시 + 중복방지)
    useEffect(() => {
        if (!videoId) return;

        const cachedCreator = creatorCacheRef.current.get(videoId);
        if (cachedCreator !== undefined) {
            setCreator(cachedCreator);
            return;
        }

        if (inFlightCreatorRef.current.has(videoId)) return;
        inFlightCreatorRef.current.add(videoId);

        const controller = new AbortController();

        const cancelIdle = runIdle(() => {
            const fetchCreator = async () => {
                try {
                    const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/creator`, {
                        method: "GET",
                        signal: controller.signal,
                    });
                    if (!res.ok) return;

                    const data = (await res.json().catch(() => null)) as { creator?: Creator } | null;
                    if (!data) return;

                    const next = data.creator ?? null;
                    setCreator(next);
                    creatorCacheRef.current.set(videoId, next);
                } catch (err) {
                    if ((err as Error).name === "AbortError") return;
                } finally {
                    inFlightCreatorRef.current.delete(videoId);
                }
            };

            void fetchCreator();
        });

        return () => {
            cancelIdle();
            controller.abort();
            inFlightCreatorRef.current.delete(videoId);
        };
    }, [videoId, runIdle]);

    // ✅ 댓글 카운트: (1) 캐시 있으면 즉시 표시 (2) idle에서 "한 번만" 갱신
    useEffect(() => {
        if (!videoId) return;

        const cached = cacheRef.current.get(videoId);
        if (cached) {
            setCommentCount(Number(cached.totalCount ?? 0));
            countCacheRef.current.set(videoId, Number(cached.totalCount ?? 0));
        } else {
            const cachedCount = countCacheRef.current.get(videoId);
            if (cachedCount !== undefined) {
                setCommentCount(Number(cachedCount ?? 0));
            }
        }

        if (inFlightCountRef.current.has(videoId)) return;
        inFlightCountRef.current.add(videoId);

        const controller = new AbortController();

        const cancelIdle = runIdle(() => {
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
                    countCacheRef.current.set(videoId, next);

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
                } finally {
                    inFlightCountRef.current.delete(videoId);
                }
            };

            void fetchCount();
        });

        return () => {
            cancelIdle();
            controller.abort();
            inFlightCountRef.current.delete(videoId);
        };
    }, [videoId, cacheRef, runIdle]);

    const creatorRawImage = creator?.image ?? "";
    const creatorProfileImage =
        creatorRawImage && creatorRawImage.trim() !== ""
            ? creatorRawImage
            : "/images/default-avatar.png";

    const creatorAlt = creator?.name ?? creator?.username ?? "작성자";

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

            const data = (await res.json().catch(() => null)) as ApiReaction;
            if (!data) return;

            const like = Number(data.likeCount ?? 0);
            const dislike = Number(data.dislikeCount ?? 0);
            const my = (data.myReaction ?? null) as MyReactionType;

            setLikeCount(like);
            setDislikeCount(dislike);
            setMyReaction(my);

            // ✅ 캐시 갱신
            const key = `${videoId}:${sessionKey}`;
            reactionCacheRef.current.set(key, { like, dislike, my });
        } catch {
            // ignore
        }
    };

    const handleCountChange = (n: number) => {
        setCommentCount(n);
        countCacheRef.current.set(videoId, n);

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

            const nextCount = countOk
                ? Number(countData?.totalCount ?? countData?.count ?? 0)
                : commentCount;

            if (countOk) {
                setCommentCount(nextCount);
                countCacheRef.current.set(videoId, nextCount);
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

    const handleCreatorMouseEnter = () => {
        if (!creator) return;
        router.prefetch(creatorHref);
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
                        className="
                            flex h-12 w-12 items-center justify-center rounded-full
                            bg-black/60
                        "
                        aria-label="좋아요"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 -960 960 960"
                            fill="currentColor"
                            className={myReaction === "LIKE" ? "text-red-500" : "text-white"}
                            aria-hidden="true"
                        >
                            <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z" />
                        </svg>
                    </div>

                    <span className="text-xs drop-shadow text-white">
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
                        className="
                            flex h-12 w-12 items-center justify-center rounded-full
                            bg-black/60
                        "
                        aria-label="싫어요"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 -960 960 960"
                            fill="currentColor"
                            className={myReaction === "DISLIKE" ? "text-slate-300" : "text-white"}
                            aria-hidden="true"
                        >
                            <path d="M481-83Q347-218 267.5-301t-121-138q-41.5-55-54-94T80-620q0-92 64-156t156-64q45 0 87 16.5t75 47.5l-62 216h120l-34 335 114-375H480l71-212q25-14 52.5-21t56.5-7q92 0 156 64t64 156q0 48-13 88t-55 95.5q-42 55.5-121 138T481-83Z" />
                        </svg>
                    </div>

                    <span className="text-xs drop-shadow text-white">
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
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FfF">
                            <path d="M240-400h480v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80Zm-80 400q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v720L720-240H160Z" />
                        </svg>
                    </div>
                    <span className="text-xs text-white drop-shadow">
                        {commentCount}
                    </span>
                </button>

                {/* ✅ 공유 */}
                <button
                    type="button"
                    className="flex flex-col items-center gap-1"
                    onClick={shareNow}
                    title="공유"
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
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FfF">
                            <path d="M680-80q-50 0-85-35t-35-85q0-6 3-28L282-392q-16 15-37 23.5t-45 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q24 0 45 8.5t37 23.5l281-164q-2-7-2.5-13.5T560-760q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-24 0-45-8.5T598-672L317-508q2 7 2.5 13.5t.5 14.5q0 8-.5 14.5T317-452l281 164q16-15 37-23.5t45-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z" />
                        </svg>
                    </div>
                    <span className="text-xs text-white drop-shadow">공유</span>
                </button>

                {/* 작성자 프로필 */}
                <Link
                    href={creatorHref}
                    prefetch
                    onMouseEnter={handleCreatorMouseEnter}
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
                            loading="lazy"
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

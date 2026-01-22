// src/components/VideoList.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "./VideoCard";
import { usePlayer } from "@/components/player/PlayerContext";
import RightActionBar from "@/components/player/RightActionBar";

type VideoItem = {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
};

// 댓글 프리패치용 타입
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

type PrefetchedComments = {
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

// 배열 셔플 (랜덤 순서)
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function VideoList() {
    const [items, setItems] = useState<VideoItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const isAnimatingRef = useRef(false);

    // loadMore 중복 호출 방지(클로저 stale 방지)
    const loadingRef = useRef(false);

    // 중복 제거/추가 개수 계산 안정화용
    const itemsRef = useRef<VideoItem[]>([]);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    // ★ 전역 플레이어 상태 (뮤트 토글만 사용)
    const { muted, toggleMute } = usePlayer();

    const isCommentOpen = () => {
        return document.body.classList.contains("comment-open");
    };

    // ✅ 댓글 프리패치 캐시(보이는 5개에 대해 미리 채워둠)
    const commentCacheRef = useRef(new Map<string, PrefetchedComments>());
    const commentInFlightRef = useRef(new Set<string>());
    const commentTokenMapRef = useRef(new Map<string, number>());

    const prefetchComments = useCallback(async (videoId: string) => {
        if (!videoId) return;

        // 이미 캐시에 있으면 스킵
        if (commentCacheRef.current.has(videoId)) return;

        // 이미 진행중이면 스킵
        if (commentInFlightRef.current.has(videoId)) return;

        commentInFlightRef.current.add(videoId);

        const nextToken = (commentTokenMapRef.current.get(videoId) ?? 0) + 1;
        commentTokenMapRef.current.set(videoId, nextToken);

        try {
            const qs = new URLSearchParams();
            qs.set("take", "20");

            const listUrl = `/api/videos/${encodeURIComponent(videoId)}/comments?${qs.toString()}`;
            const countUrl = `/api/videos/${encodeURIComponent(videoId)}/comment-count`;

            const [listRes, countRes] = await Promise.all([
                fetch(listUrl, { method: "GET", cache: "no-store" }),
                fetch(countUrl, { method: "GET", cache: "no-store" }),
            ]);

            const currentToken = commentTokenMapRef.current.get(videoId);
            if (currentToken !== nextToken) return;

            const listData = (await listRes.json().catch(() => null)) as ApiList | null;
            const countData = (await countRes.json().catch(() => null)) as ApiCount | null;

            const listOk = Boolean(listRes.ok && listData && listData.ok);
            const countOk = Boolean(countRes.ok && countData && countData.ok);

            const totalCount = countOk
                ? Number(countData?.totalCount ?? countData?.count ?? 0)
                : 0;

            const packed: PrefetchedComments = {
                videoId,
                totalCount,
                items: listOk && Array.isArray(listData?.items) ? listData.items : [],
                nextCursor: listOk ? (listData?.nextCursor ?? null) : null,
            };

            // ✅ listOk가 아니더라도 count가 성공했을 수 있으니 캐시에 저장(0 고정 방지)
            if (countOk || listOk) {
                commentCacheRef.current.set(videoId, packed);
            }
        } catch {
            // ignore
        } finally {
            commentInFlightRef.current.delete(videoId);
        }
    }, []);

    const loadMore = useCallback(async (): Promise<boolean> => {
        if (loadingRef.current || !hasMore) {
            return false;
        }

        loadingRef.current = true;
        setLoading(true);
        setErrorMsg(null);

        try {
            const params = new URLSearchParams();
            if (cursor) {
                params.set("cursor", cursor);
            }

            const res = await fetch(`/api/videos?${params.toString()}`, {
                cache: "no-store",
            });

            const text = await res.text().catch(() => "");

            if (!res.ok) {
                setErrorMsg(`영상 불러오기 실패 (${res.status})`);
                return false;
            }

            if (!text) {
                setErrorMsg("서버 응답이 비어있습니다.");
                return false;
            }

            let json: { videos: VideoItem[]; nextCursor: string | null };
            try {
                json = JSON.parse(text) as { videos: VideoItem[]; nextCursor: string | null };
            } catch {
                setErrorMsg("응답 JSON 파싱에 실패했습니다.");
                return false;
            }

            let newVideos = json.videos || [];
            if (newVideos.length === 0) {
                setHasMore(false);
                return false;
            }

            // 랜덤 순서로 섞기
            newVideos = shuffle(newVideos);

            // ✅ addedCount를 setItems 콜백 밖에서 안정적으로 계산
            const existingIds = new Set(itemsRef.current.map((v) => v.id));
            const uniqueNew = newVideos.filter((v) => !existingIds.has(v.id));

            if (uniqueNew.length === 0) {
                setCursor(json.nextCursor ?? null);
                if (!json.nextCursor) {
                    setHasMore(false);
                }
                return false;
            }

            setItems((prev) => [...prev, ...uniqueNew]);

            setCursor(json.nextCursor ?? null);
            if (!json.nextCursor) {
                setHasMore(false);
            }

            return true;
        } catch {
            setErrorMsg("네트워크 오류로 영상을 불러오지 못했습니다.");
            return false;
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [cursor, hasMore]);

    // 최초 1회 로딩
    useEffect(() => {
        void loadMore();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const goNext = useCallback(async () => {
        if (isAnimatingRef.current) {
            return;
        }
        if (items.length === 0) {
            return;
        }

        if (currentIndex < items.length - 1) {
            isAnimatingRef.current = true;
            setCurrentIndex((prev) => prev + 1);
            setTimeout(() => {
                isAnimatingRef.current = false;
            }, 350);
            return;
        }

        const added = await loadMore();
        if (added) {
            isAnimatingRef.current = true;
            setCurrentIndex((prev) => prev + 1);
            setTimeout(() => {
                isAnimatingRef.current = false;
            }, 350);
        }
    }, [currentIndex, items.length, loadMore]);

    const goPrev = useCallback(() => {
        if (isAnimatingRef.current) {
            return;
        }
        if (currentIndex <= 0) {
            return;
        }

        isAnimatingRef.current = true;
        setCurrentIndex((prev) => prev - 1);
        setTimeout(() => {
            isAnimatingRef.current = false;
        }, 350);
    }, [currentIndex]);

    // 휠 + 터치 + 마우스 드래그 스와이프 이벤트
    useEffect(() => {
        const el = containerRef.current;
        if (!el) {
            return;
        }

        const SWIPE_THRESHOLD = 50;

        let touchStartY = 0;
        let touchCurrentY = 0;
        let isTouching = false;

        let mouseStartY = 0;
        let mouseCurrentY = 0;
        let isMouseDown = false;

        const onWheel = (e: WheelEvent) => {
            // ✅ 댓글 서랍 열려있으면 VideoList 스와이프/휠 모두 막기
            if (isCommentOpen()) {
                return;
            }

            if (items.length === 0) {
                return;
            }

            e.preventDefault();

            if (e.deltaY > 0) {
                void goNext();
            } else if (e.deltaY < 0) {
                goPrev();
            }
        };

        const onTouchStart = (e: TouchEvent) => {
            if (isCommentOpen()) {
                return;
            }

            if (items.length === 0) {
                return;
            }
            if (e.touches.length > 1) {
                return;
            }

            isTouching = true;
            touchStartY = e.touches[0].clientY;
            touchCurrentY = touchStartY;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (isCommentOpen()) {
                return;
            }

            if (!isTouching) {
                return;
            }
            if (e.touches.length > 1) {
                return;
            }

            e.preventDefault();
            touchCurrentY = e.touches[0].clientY;
        };

        const onTouchEnd = () => {
            if (isCommentOpen()) {
                return;
            }

            if (!isTouching) {
                return;
            }
            isTouching = false;

            const deltaY = touchCurrentY - touchStartY;
            if (Math.abs(deltaY) < SWIPE_THRESHOLD) {
                return;
            }

            if (deltaY > 0) {
                goPrev();
            } else {
                void goNext();
            }
        };

        const onMouseDown = (e: MouseEvent) => {
            if (isCommentOpen()) {
                return;
            }

            if (items.length === 0) {
                return;
            }
            if (e.button !== 0) {
                return;
            }

            isMouseDown = true;
            mouseStartY = e.clientY;
            mouseCurrentY = e.clientY;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (isCommentOpen()) {
                return;
            }

            if (!isMouseDown) {
                return;
            }

            e.preventDefault();
            mouseCurrentY = e.clientY;
        };

        const onMouseUp = () => {
            if (isCommentOpen()) {
                return;
            }

            if (!isMouseDown) {
                return;
            }
            isMouseDown = false;

            const deltaY = mouseCurrentY - mouseStartY;
            if (Math.abs(deltaY) < SWIPE_THRESHOLD) {
                return;
            }

            if (deltaY > 0) {
                goPrev();
            } else {
                void goNext();
            }
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd, { passive: true });
        el.addEventListener("touchcancel", onTouchEnd, { passive: true });

        el.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove, { passive: false });
        window.addEventListener("mouseup", onMouseUp);

        return () => {
            el.removeEventListener("wheel", onWheel);
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
            el.removeEventListener("touchcancel", onTouchEnd);

            el.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [items.length, goNext, goPrev]);

    const total = items.length;
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(total - 1, currentIndex + 2);
    const visibleItems = items.slice(start, end + 1);
    const currentOffset = currentIndex - start;

    const activeVideoId = items[currentIndex]?.id ?? null;

    // ✅ 현재 기준 앞뒤 2개(총 5개) 영상에 대해 댓글(카운트+1페이지) 프리패치
    const visibleIdsKey = useMemo(() => {
        return visibleItems.map((v) => v.id).join("|");
    }, [visibleItems]);

    useEffect(() => {
        if (!visibleIdsKey) return;

        const ids = visibleIdsKey.split("|").filter(Boolean);
        for (const id of ids) {
            void prefetchComments(id);
        }
    }, [visibleIdsKey, prefetchComments]);

    return (
        <div
            ref={containerRef}
            className="h-full overflow-hidden relative select-none"
        >
            <div
                className="h-full transition-transform duration-300"
                style={{ transform: `translateY(-${currentOffset * 100}%)` }}
            >
                {visibleItems.map((v, idx) => {
                    const absoluteIndex = start + idx;
                    const isActive = absoluteIndex === currentIndex;

                    return (
                        <div key={v.id} className="h-full">
                            <VideoCard
                                videoId={v.id}
                                src={v.videoUrl}
                                poster={v.thumbnailUrl ?? undefined}
                                title={v.title}
                                isActive={isActive}
                            />
                        </div>
                    );
                })}
            </div>

            {/* ✅ transform(translateY) 영역 밖에서 1번만 렌더 */}
            {activeVideoId ? (
                <RightActionBar
                    videoId={activeVideoId}
                    commentCacheRef={commentCacheRef}
                />
            ) : null}

            <button
                type="button"
                onClick={toggleMute}
                className="absolute bottom-4 right-4 z-20 rounded-full border border-white/30 bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm"
            >
                {muted ? "🔇 음소거" : "🔊 소리 켜짐"}
            </button>

            {loading && (
                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-neutral-200">
                    불러오는 중...
                </div>
            )}

            {errorMsg && (
                <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-red-200">
                    {errorMsg}
                </div>
            )}
        </div>
    );
}

// src/components/VideoList.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VideoCard from "./VideoCard";
import { usePlayer } from "@/components/player/PlayerContext";

type VideoItem = {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
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
    // 지금까지 불러온 전체 영상
    const [items, setItems] = useState<VideoItem[]>([]);
    // 현재 보고 있는 영상 인덱스
    const [currentIndex, setCurrentIndex] = useState(0);
    // 페이지네이션 커서
    const [cursor, setCursor] = useState<string | null>(null);
    // 더 가져올 수 있는지
    const [hasMore, setHasMore] = useState(true);
    // 네트워크 로딩 상태
    const [loading, setLoading] = useState(false);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const isAnimatingRef = useRef(false);

    // ★ 전역 플레이어 상태 (뮤트 토글만 사용)
    const { muted, toggleMute } = usePlayer();

    // 서버에서 영상 추가로 가져오기
    const loadMore = useCallback(async (): Promise<boolean> => {
        if (loading || !hasMore) {
            return false;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (cursor) {
                params.set("cursor", cursor);
            }

            const res = await fetch(`/api/videos?${params.toString()}`, {
                cache: "no-store",
            });

            const text = await res.text();

            if (!res.ok) {
                console.error("/api/videos error:", res.status, text);
                return false;
            }

            if (!text) {
                console.warn("/api/videos empty response");
                return false;
            }

            const json = JSON.parse(text) as {
                videos: VideoItem[];
                nextCursor: string | null;
            };

            let newVideos = json.videos || [];
            if (newVideos.length === 0) {
                setHasMore(false);
                return false;
            }

            // 랜덤 순서로 섞기
            newVideos = shuffle(newVideos);

            let addedCount = 0;
            setItems((prev) => {
                const existingIds = new Set(prev.map((v) => v.id));
                const uniqueNew = newVideos.filter((v) => !existingIds.has(v.id));
                addedCount = uniqueNew.length;
                if (addedCount === 0) {
                    return prev;
                }
                return [...prev, ...uniqueNew];
            });

            setCursor(json.nextCursor ?? null);
            if (!json.nextCursor) {
                setHasMore(false);
            }

            return addedCount > 0;
        } catch (err) {
            console.error("load videos error:", err);
            return false;
        } finally {
            setLoading(false);
        }
    }, [cursor, hasMore, loading]);

    // 최초 1회 로딩
    useEffect(() => {
        void loadMore();
    }, [loadMore]);

    // 다음 / 이전 이동
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

        const SWIPE_THRESHOLD = 50; // px

        // 터치용
        let touchStartY = 0;
        let touchCurrentY = 0;
        let isTouching = false;

        // 마우스 드래그용
        let mouseStartY = 0;
        let mouseCurrentY = 0;
        let isMouseDown = false;

        const onWheel = (e: WheelEvent) => {
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

        // 터치 이벤트
        const onTouchStart = (e: TouchEvent) => {
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
            if (!isTouching) {
                return;
            }
            isTouching = false;

            const deltaY = touchCurrentY - touchStartY;
            if (Math.abs(deltaY) < SWIPE_THRESHOLD) {
                return;
            }

            if (deltaY > 0) {
                // 아래로 스와이프 → 이전
                goPrev();
            } else {
                // 위로 스와이프 → 다음
                void goNext();
            }
        };

        // 마우스 드래그 (PC)
        const onMouseDown = (e: MouseEvent) => {
            if (items.length === 0) {
                return;
            }
            if (e.button !== 0) {
                return; // 왼쪽 버튼만
            }

            isMouseDown = true;
            mouseStartY = e.clientY;
            mouseCurrentY = e.clientY;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isMouseDown) {
                return;
            }

            e.preventDefault(); // 텍스트 드래그 방지
            mouseCurrentY = e.clientY;
        };

        const onMouseUp = () => {
            if (!isMouseDown) {
                return;
            }
            isMouseDown = false;

            const deltaY = mouseCurrentY - mouseStartY;
            if (Math.abs(deltaY) < SWIPE_THRESHOLD) {
                return;
            }

            if (deltaY > 0) {
                // 아래로 드래그 → 이전
                goPrev();
            } else {
                // 위로 드래그 → 다음
                void goNext();
            }
        };

        // 리스너 등록
        el.addEventListener("wheel", onWheel, { passive: false });
        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd, { passive: true });
        el.addEventListener("touchcancel", onTouchEnd, { passive: true });

        el.addEventListener("mousedown", onMouseDown);
        // 드래그 중 커서가 영역 밖으로 나가도 동작하게 window에 바인딩
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

    // 현재 기준 -2 ~ +2만 렌더
    const total = items.length;
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(total - 1, currentIndex + 2);
    const visibleItems = items.slice(start, end + 1);
    const currentOffset = currentIndex - start;

    return (
        <div
            ref={containerRef}
            className="h-full overflow-hidden relative select-none"
        >
            {/* 슬라이드 영역 */}
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
                                src={v.videoUrl}
                                poster={v.thumbnailUrl ?? undefined}
                                title={v.title}
                                isActive={isActive}
                            />
                        </div>
                    );
                })}
            </div>

            {/* 전역 음소거 토글 버튼 (PlayerContext 사용) */}
            <button
                type="button"
                onClick={toggleMute}
                className="absolute bottom-4 right-4 z-20 rounded-full border border-white/30 bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm"
            >
                {muted ? "🔇 음소거" : "🔊 소리 켜짐"}
            </button>

            {/* 서버 요청 중일 때만 나오는 로딩 표시 */}
            {loading && (
                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-neutral-200">
                    불러오는 중...
                </div>
            )}
        </div>
    );
}

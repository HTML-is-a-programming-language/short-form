// src/app/mypage/shorts/MyShortsList.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type MyShortItem = {
    id: string;
    uid: string;
    title: string | null;
    thumbnailUrl: string | null;
    createdAt: string;
    isPublic: boolean;
    status: "PENDING" | "READY" | "FAILED";
};

type ApiResponse = {
    items: MyShortItem[];
    nextCursor: string | null;
};

export default function MyShortsList() {
    const [items, setItems] = useState<MyShortItem[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState<boolean>(false);

    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const canLoadMore = useMemo(() => {
        if (!initialized) return true;
        return nextCursor !== null;
    }, [initialized, nextCursor]);

    const fetchPage = async (cursor: string | null) => {
        if (loading) return;

        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.set("limit", "20");
            if (cursor) params.set("cursor", cursor);

            const res = await fetch(`/api/mypage/shorts?${params.toString()}`, {
                method: "GET",
                cache: "no-store",
            });

            if (!res.ok) {
                throw new Error(`목록 불러오기 실패 (${res.status})`);
            }

            const data = (await res.json()) as ApiResponse;

            setItems((prev) => {
                const merged = [...prev, ...data.items];
                const map = new Map<string, MyShortItem>();
                for (const it of merged) {
                    map.set(it.id, it);
                }
                return Array.from(map.values());
            });

            setNextCursor(data.nextCursor);
            setInitialized(true);
        } catch (e) {
            const message = e instanceof Error ? e.message : "알 수 없는 오류";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async (id: string) => {
        const ok = window.confirm("정말 삭제할까요? 삭제 후 복구가 어려울 수 있어요.");
        if (!ok) return;

        try {
            const res = await fetch(`/api/mypage/shorts/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error(`삭제 실패 (${res.status})`);
            }

            setItems((prev) => prev.filter((x) => x.id !== id));
        } catch (e) {
            const message = e instanceof Error ? e.message : "알 수 없는 오류";
            alert(message);
        }
    };

    useEffect(() => {
        fetchPage(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const io = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry?.isIntersecting) return;
                if (!canLoadMore) return;
                if (loading) return;

                fetchPage(nextCursor);
            },
            { root: null, rootMargin: "240px 0px", threshold: 0 }
        );

        io.observe(el);

        return () => {
            io.disconnect();
        };
    }, [canLoadMore, loading, nextCursor]);

    if (error) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-sm text-white/80">{error}</p>
                <button
                    type="button"
                    onClick={() => fetchPage(nextCursor)}
                    className="mt-3 w-full rounded-xl bg-white text-black py-2 font-medium"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    if (initialized && !loading && items.length === 0) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/70">
                아직 등록한 숏폼이 없어요.{" "}
                <Link href="/upload" className="text-white underline">
                    숏폼 등록하러 가기
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <ul className="space-y-3">
                {items.map((it) => (
                    <li
                        key={it.id}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4"
                    >
                        <div className="flex gap-3">
                            <div className="w-20 h-20 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
                                {it.thumbnailUrl ? (
                                    // next/image remote 설정이 이미 되어있지 않으면 여기만 img로 바꿔도 됨
                                    <img
                                        src={it.thumbnailUrl}
                                        alt={it.title ?? "thumbnail"}
                                        loading="lazy"
                                        className="w-full h-full object-cover block"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-white/50">
                                        No Image
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="font-medium truncate">
                                            {it.title ?? "제목 없음"}
                                        </div>
                                        <div className="text-xs text-white/50 mt-1">
                                            {new Date(it.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                    <Link
                                        href={`/v/${it.uid}`}
                                        className="text-xs px-3 py-2 rounded-xl border border-white/20 text-white/80 hover:bg-white/10"
                                    >
                                        보기
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(it.id)}
                                        className="text-xs px-3 py-2 rounded-xl bg-white text-black font-medium hover:bg-white/90"
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            <div ref={sentinelRef} className="h-px" />

            {loading && (
                <div className="text-sm text-white/60 py-2">
                    불러오는 중...
                </div>
            )}

            {initialized && !loading && nextCursor === null && items.length > 0 && (
                <div className="text-sm text-white/50 py-2">
                    끝까지 다 봤어요.
                </div>
            )}
        </div>
    );
}

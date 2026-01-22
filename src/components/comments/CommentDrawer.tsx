"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";

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

type ApiList = {
    ok: boolean;
    items: CommentItem[];
    nextCursor: string | null;
};

type ApiCount = {
    ok: boolean;
    totalCount: number;
};

type ApiCreate = {
    ok: boolean;
    item: CommentItem;
    totalCount: number;
};

type ApiDelete = {
    ok: boolean;
    totalCount: number;
};

type InitialData = {
    videoId: string;
    totalCount: number;
    items: CommentItem[];
    nextCursor: string | null;
};

export default function CommentDrawer(props: {
    open: boolean;
    videoId: string;
    onClose: () => void;
    onCountChange?: (count: number) => void;
    initialData?: InitialData | null;
}) {
    const { open, videoId, onClose, onCountChange, initialData } = props;
    const { data: session } = useSession();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const myUserId = useMemo(() => {
        const s = session as unknown as { user?: { id?: string; appUserId?: string } } | null;
        return s?.user?.id ?? s?.user?.appUserId ?? null;
    }, [session]);

    const [items, setItems] = useState<CommentItem[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [body, setBody] = useState("");

    // 요청 경합 방지(비디오 전환/열고닫기)
    const reqTokenRef = useRef(0);
    const listAbortRef = useRef<AbortController | null>(null);
    const countAbortRef = useRef<AbortController | null>(null);

    // initialData 반복 적용 방지(무한 렌더 루프 차단)
    const initialAppliedKeyRef = useRef<string | null>(null);

    function setCountAll(next: number) {
        setTotalCount(next);
        if (onCountChange) onCountChange(next);
    }

    function redirectToSignIn() {
        const current = encodeURIComponent(window.location.pathname);
        window.location.href = `/api/auth/signin?callbackUrl=${current}`;
    }

    async function fetchCountOnly(token: number) {
        if (!videoId) return;

        if (countAbortRef.current) {
            countAbortRef.current.abort();
        }
        const controller = new AbortController();
        countAbortRef.current = controller;

        try {
            const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/comment-count`, {
                method: "GET",
                cache: "no-store",
                signal: controller.signal,
            });

            const data = (await res.json().catch(() => null)) as ApiCount | null;
            if (reqTokenRef.current !== token) return;

            if (!res.ok || !data || !data.ok) {
                return;
            }

            setCountAll(Number(data.totalCount ?? 0));
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
        }
    }

    async function fetchPage(nextCursor: string | null, token: number) {
        if (loading) return;

        setLoading(true);
        setErrorMsg(null);

        if (listAbortRef.current) {
            listAbortRef.current.abort();
        }
        const controller = new AbortController();
        listAbortRef.current = controller;

        try {
            const qs = new URLSearchParams();
            qs.set("take", "20");
            if (nextCursor) qs.set("cursor", nextCursor);

            const res = await fetch(
                `/api/videos/${encodeURIComponent(videoId)}/comments?${qs.toString()}`,
                {
                    method: "GET",
                    cache: "no-store",
                    signal: controller.signal,
                }
            );

            const data = (await res.json().catch(() => null)) as ApiList | null;
            if (reqTokenRef.current !== token) return;

            if (!res.ok || !data || !data.ok) {
                setErrorMsg("댓글을 불러오지 못했습니다.");
                return;
            }

            setItems((prev) => {
                const merged = [...prev, ...data.items];
                const map = new Map<string, CommentItem>();
                for (const c of merged) map.set(c.id, c);
                return Array.from(map.values());
            });

            setCursor(data.nextCursor);
            setHasMore(Boolean(data.nextCursor));
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setErrorMsg("네트워크 오류로 댓글을 불러오지 못했습니다.");
        } finally {
            if (reqTokenRef.current === token) {
                setLoading(false);
            }
        }
    }

    async function refresh(token: number) {
        setErrorMsg(null);
        setItems([]);
        setCursor(null);
        setHasMore(true);

        await Promise.all([fetchCountOnly(token), fetchPage(null, token)]);
    }

    async function onSubmit() {
        const trimmed = body.trim();
        if (trimmed.length < 1) return;

        if (!session?.user) {
            redirectToSignIn();
            return;
        }

        if (posting) return;

        setPosting(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: trimmed }),
            });

            const data = (await res.json().catch(() => null)) as ApiCreate | null;
            if (!res.ok || !data || !data.ok) {
                setErrorMsg("댓글 작성에 실패했습니다.");
                return;
            }

            setItems((prev) => [data.item, ...prev]);
            setBody("");
            setCountAll(Number(data.totalCount ?? (totalCount + 1)));
        } catch {
            setErrorMsg("네트워크 오류로 댓글 작성에 실패했습니다.");
        } finally {
            setPosting(false);
        }
    }

    async function onDelete(commentId: string) {
        const ok = confirm("댓글을 삭제할까요?");
        if (!ok) return;

        setErrorMsg(null);

        const prev = items;
        setItems((cur) => cur.filter((c) => c.id !== commentId));

        try {
            const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
                method: "DELETE",
            });

            const data = (await res.json().catch(() => null)) as ApiDelete | null;
            if (!res.ok || !data || !data.ok) {
                setItems(prev);
                setErrorMsg("댓글 삭제에 실패했습니다.");
                return;
            }

            setCountAll(Number(data.totalCount ?? Math.max(totalCount - 1, 0)));
        } catch {
            setItems(prev);
            setErrorMsg("네트워크 오류로 댓글 삭제에 실패했습니다.");
        }
    }

    // ✅ open/videoId 바뀔 때: body class 처리 + 초기 로딩
    useEffect(() => {
        if (!open) return;

        const token = ++reqTokenRef.current;

        // open 시작 시점에는 초기 적용 키를 초기화(늦게 도착한 initialData를 1회만 반영하기 위함)
        initialAppliedKeyRef.current = null;

        document.body.classList.add("comment-open");
        document.body.style.overflow = "hidden";

        if (initialData && initialData.videoId === videoId) {
            const key = `${initialData.videoId}:${initialData.nextCursor ?? "null"}:${initialData.totalCount ?? 0}:${initialData.items?.length ?? 0}`;
            initialAppliedKeyRef.current = key;

            setErrorMsg(null);
            setItems(initialData.items ?? []);
            setCountAll(initialData.totalCount ?? 0);
            setCursor(initialData.nextCursor ?? null);
            setHasMore(Boolean(initialData.nextCursor));
        } else {
            void refresh(token); // ✅ 토큰 전달 필수
        }

        return () => {
            // 닫힐 때 진행 중 요청 중단 + 토큰 증가로 무효화
            if (listAbortRef.current) listAbortRef.current.abort();
            if (countAbortRef.current) countAbortRef.current.abort();
            reqTokenRef.current++;

            document.body.classList.remove("comment-open");
            document.body.style.overflow = "";

            initialAppliedKeyRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, videoId]);

    // ✅ open 상태에서 initialData가 "늦게 도착"해도 즉시 반영
    //    (initialData 객체 자체를 deps에 넣지 않고, 스칼라 값으로만 추적 + 1회 적용 가드)
    useEffect(() => {
        if (!open) return;
        if (!initialData) return;
        if (initialData.videoId !== videoId) return;

        const key = `${initialData.videoId}:${initialData.nextCursor ?? "null"}:${initialData.totalCount ?? 0}:${initialData.items?.length ?? 0}`;
        if (initialAppliedKeyRef.current === key) return;
        initialAppliedKeyRef.current = key;

        setErrorMsg(null);
        setItems(initialData.items ?? []);
        setCursor(initialData.nextCursor ?? null);
        setHasMore(Boolean(initialData.nextCursor));
        setCountAll(Number(initialData.totalCount ?? 0));
    }, [
        open,
        videoId,
        initialData?.videoId,
        initialData?.nextCursor,
        initialData?.totalCount,
        initialData?.items?.length,
    ]);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        if (!open) return;

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open || !mounted || typeof document === "undefined") return null;

    const ui = (
        <div className="fixed inset-0 z-[2147483647]">
            <button
                type="button"
                className="absolute inset-0 bg-black/60"
                aria-label="close comments"
                onClick={onClose}
            />

            <div
                className="
                    absolute
                    bottom-0
                    left-0
                    right-0
                    max-h-[78dvh]
                    rounded-t-2xl
                    bg-neutral-950
                    text-white
                    border-t border-white/10
                    flex flex-col
                "
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">댓글</div>
                        <div className="text-xs text-white/60">{totalCount}</div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-3 py-1 text-xs bg-white/10 hover:bg-white/15"
                    >
                        닫기
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {errorMsg && (
                        <div className="rounded-lg bg-red-500/15 border border-red-500/20 px-3 py-2 text-xs text-red-200">
                            {errorMsg}
                        </div>
                    )}

                    {items.length === 0 && loading && (
                        <div className="text-sm text-white/60 py-10 text-center">
                            불러오는 중...
                        </div>
                    )}

                    {items.length === 0 && !loading && (
                        <div className="text-sm text-white/60 py-10 text-center">
                            첫 댓글을 남겨보세요.
                        </div>
                    )}

                    {items.map((c) => {
                        const raw = c.user.image ?? "";
                        const avatar = raw && raw.trim() !== "" ? raw : "/images/default-avatar.png";
                        const name = c.user.name ?? c.user.username;
                        const isMine = Boolean(myUserId && c.userId === myUserId);

                        return (
                            <div key={c.id} className="flex gap-3">
                                <div className="h-9 w-9 rounded-full overflow-hidden bg-white/10 shrink-0">
                                    <img src={avatar} alt={name} className="h-full w-full object-cover" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-medium leading-none">
                                            {name}
                                            <span className="ml-2 text-xs text-white/40">
                                                {new Date(c.createdAt).toLocaleString()}
                                            </span>
                                        </div>

                                        {isMine && (
                                            <button
                                                type="button"
                                                className="text-xs text-white/60 hover:text-white"
                                                onClick={() => onDelete(c.id)}
                                            >
                                                삭제
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-1 text-sm whitespace-pre-wrap break-words text-white/90">
                                        {c.body}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {hasMore && (
                        <button
                            type="button"
                            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm hover:bg-white/10"
                            onClick={() => {
                                const token = reqTokenRef.current;
                                void fetchPage(cursor, token);
                            }}
                            disabled={loading}
                        >
                            {loading ? "불러오는 중..." : "더 보기"}
                        </button>
                    )}
                </div>

                <div className="border-t border-white/10 p-3">
                    <div className="flex gap-2">
                        <input
                            className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/20"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={session?.user ? "댓글을 입력하세요" : "로그인 후 댓글을 작성할 수 있어요"}
                            onFocus={() => {
                                if (!session?.user) redirectToSignIn();
                            }}
                        />
                        <button
                            type="button"
                            className="rounded-lg bg-white text-black px-4 py-2 text-sm font-semibold disabled:opacity-50"
                            onClick={onSubmit}
                            disabled={posting}
                        >
                            작성
                        </button>
                    </div>

                    <div className="mt-2 text-[11px] text-white/40">
                        최대 500자
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(ui, document.body);
}

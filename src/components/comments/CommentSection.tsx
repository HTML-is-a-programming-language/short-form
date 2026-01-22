"use client";

import React, { useEffect, useMemo, useState } from "react";

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

type ApiCreate = {
    ok: boolean;
    item: CommentItem;
};

export default function CommentSection(props: { videoId: string }) {
    const { videoId } = props;

    const [items, setItems] = useState<CommentItem[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    const [body, setBody] = useState("");

    const countText = useMemo(() => `${items.length}개`, [items.length]);

    async function fetchPage(nextCursor: string | null) {
        if (loading) return;

        setLoading(true);
        try {
            const qs = new URLSearchParams();
            qs.set("take", "20");
            if (nextCursor) qs.set("cursor", nextCursor);

            const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/comments?${qs.toString()}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json() as ApiList;
            if (!data.ok) throw new Error("Failed to fetch comments");

            setItems((prev) => {
                const merged = [...prev, ...data.items];
                const map = new Map<string, CommentItem>();
                for (const c of merged) map.set(c.id, c);
                return Array.from(map.values());
            });

            setCursor(data.nextCursor);
            setHasMore(Boolean(data.nextCursor));
        } finally {
            setLoading(false);
        }
    }

    async function onSubmit() {
        const trimmed = body.trim();
        if (trimmed.length < 1) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: trimmed }),
            });

            const data = await res.json() as ApiCreate;
            if (!data.ok) {
                alert("댓글 작성 실패(로그인 필요일 수 있어요).");
                return;
            }

            setItems((prev) => [data.item, ...prev]);
            setBody("");
        } finally {
            setLoading(false);
        }
    }

    async function onDelete(commentId: string) {
        const ok = confirm("댓글을 삭제할까요?");
        if (!ok) return;

        const prev = items;
        setItems((cur) => cur.filter((c) => c.id !== commentId));

        const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
        if (!res.ok) {
            alert("삭제 실패(권한 문제일 수 있어요).");
            setItems(prev);
        }
    }

    useEffect(() => {
        setItems([]);
        setCursor(null);
        setHasMore(true);
        void fetchPage(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]);

    return (
        <section className="w-full">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">댓글</h2>
                <span className="text-sm opacity-70">{countText}</span>
            </div>

            <div className="flex gap-2 mb-4">
                <input
                    className="flex-1 border rounded px-3 py-2 text-sm"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="댓글을 입력하세요"
                />
                <button
                    className="border rounded px-3 py-2 text-sm"
                    onClick={onSubmit}
                    disabled={loading}
                >
                    작성
                </button>
            </div>

            <div className="space-y-3">
                {items.map((c) => (
                    <div key={c.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-medium">
                                {c.user.name ?? c.user.username}
                            </div>

                            <button
                                className="text-xs opacity-70 hover:opacity-100"
                                onClick={() => onDelete(c.id)}
                            >
                                삭제
                            </button>
                        </div>

                        <div className="text-sm whitespace-pre-wrap">{c.body}</div>

                        <div className="text-xs opacity-60 mt-2">
                            {new Date(c.createdAt).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4">
                {hasMore ? (
                    <button
                        className="w-full border rounded px-3 py-2 text-sm"
                        onClick={() => fetchPage(cursor)}
                        disabled={loading}
                    >
                        {loading ? "로딩..." : "더 보기"}
                    </button>
                ) : (
                    <div className="text-center text-sm opacity-60">끝</div>
                )}
            </div>
        </section>
    );
}

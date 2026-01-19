// src/components/player/RightActionBar.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type RightActionBarProps = {
    videoId: string;
};

type MyReactionType = "LIKE" | "DISLIKE" | null;

type Creator = {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
} | null;

export default function RightActionBar({ videoId }: RightActionBarProps) {
    const { data: session } = useSession();

    // 내(세션) 프로필 (마이/로그인용)
    const myRawImage = session?.user?.image ?? "";
    const myProfileImage =
        myRawImage && myRawImage.trim() !== ""
            ? myRawImage
            : "/images/default-avatar.png";
    const myProfileAlt = session?.user?.name ?? "마이페이지";

    const callbackUrl = encodeURIComponent("/mypage");
    const myPageHref = session?.user
        ? "/mypage"
        : `/api/auth/signin?callbackUrl=${callbackUrl}`;

    // 작성자(업로더) 프로필
    const [creator, setCreator] = useState<Creator>(null);

    // 리액션
    const [likeCount, setLikeCount] = useState<number>(0);
    const [dislikeCount, setDislikeCount] = useState<number>(0);
    const [myReaction, setMyReaction] = useState<MyReactionType>(null);

    // ✅ 리액션 로드
    useEffect(() => {
        if (!videoId) return;

        const fetchReactions = async () => {
            try {
                const res = await fetch(`/api/videos/${videoId}/reaction`, {
                    method: "GET",
                });
                if (!res.ok) return;

                const data = await res.json();
                setLikeCount(data.likeCount ?? 0);
                setDislikeCount(data.dislikeCount ?? 0);
                setMyReaction(data.myReaction ?? null);
            } catch (err) {
                console.error("Failed to fetch reactions", err);
            }
        };

        fetchReactions();
    }, [videoId]);

    // ✅ 작성자(업로더) 로드
    useEffect(() => {
        if (!videoId) return;

        const controller = new AbortController();

        const fetchCreator = async () => {
            try {
                const res = await fetch(`/api/videos/${videoId}/creator`, {
                    method: "GET",
                    signal: controller.signal,
                });
                if (!res.ok) return;

                const data = await res.json();
                setCreator(data.creator ?? null);
            } catch (err) {
                if ((err as Error).name === "AbortError") return;
                console.error("Failed to fetch creator", err);
            }
        };

        fetchCreator();

        return () => controller.abort();
    }, [videoId]);

    const creatorRawImage = creator?.image ?? "";
    const creatorProfileImage =
        creatorRawImage && creatorRawImage.trim() !== ""
            ? creatorRawImage
            : "/images/default-avatar.png";

    const creatorAlt = creator?.name ?? creator?.username ?? "작성자";

    // ⚠️ 작성자 프로필 라우트는 프로젝트 규칙에 맞게 바꿔줘
    // 예: `/users/${creator.username}`, `/@${creator.username}`, `/profile/${creator.id}` 등
    const creatorHref = creator ? `/users/${encodeURIComponent(creator.username)}` : "#";

    // ✅ 좋아요/싫어요 버튼 공통 핸들러
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
            const res = await fetch(`/api/videos/${videoId}/reaction`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ type: newType }),
            });

            if (!res.ok) {
                console.error("Failed to update reaction");
                return;
            }

            const data = await res.json();
            setLikeCount(data.likeCount ?? 0);
            setDislikeCount(data.dislikeCount ?? 0);
            setMyReaction(data.myReaction ?? null);
        } catch (err) {
            console.error("Failed to update reaction", err);
        }
    };

    return (
        <div
            className="
                absolute
                right-3
                bottom-24
                z-20
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
                    💬
                </div>
                <span className="text-xs text-white drop-shadow">649</span>
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

            {/* ✅ 작성자(업로더) 프로필 */}
            <Link
                href={creatorHref}
                className={`mt-1 flex flex-col items-center gap-1 ${creator ? "" : "pointer-events-none opacity-60"}`}
            >
                <div
                    className="
                        h-12 w-12
                        overflow-hidden
                        rounded-full
                        border-2
                        border-white
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
    );
}

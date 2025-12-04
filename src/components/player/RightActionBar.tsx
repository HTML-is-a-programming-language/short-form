// src/components/player/RightActionBar.tsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function RightActionBar() {
    const { data: session } = useSession();

    const profileImage =
        session?.user?.image ?? "/images/default-avatar.png";
    const profileAlt = session?.user?.name ?? "마이페이지";

    return (
        <div className="
            absolute
            right-3
            bottom-24
            z-20
            flex
            flex-col
            items-center
            gap-4
        ">
            {/* 좋아요 */}
            <button
                type="button"
                className="flex flex-col items-center gap-1"
            >
                <div className="
                    flex
                    h-12 w-12
                    items-center justify-center
                    rounded-full
                    bg-black/60
                    text-xl
                    text-white
                ">
                    👍
                </div>
                <span className="text-xs text-white drop-shadow">
                    4.1만
                </span>
            </button>

            {/* 싫어요 */}
            <button
                type="button"
                className="flex flex-col items-center gap-1"
            >
                <div className="
                    flex
                    h-12 w-12
                    items-center justify-center
                    rounded-full
                    bg-black/60
                    text-xl
                    text-white
                ">
                    👎
                </div>
                <span className="text-xs text-white drop-shadow">
                    싫어요
                </span>
            </button>

            {/* 댓글 */}
            <button
                type="button"
                className="flex flex-col items-center gap-1"
            >
                <div className="
                    flex
                    h-12 w-12
                    items-center justify-center
                    rounded-full
                    bg-black/60
                    text-xl
                    text-white
                ">
                    💬
                </div>
                <span className="text-xs text-white drop-shadow">
                    649
                </span>
            </button>

            {/* 공유 */}
            <button
                type="button"
                className="flex flex-col items-center gap-1"
            >
                <div className="
                    flex
                    h-12 w-12
                    items-center justify-center
                    rounded-full
                    bg-black/60
                    text-xl
                    text-white
                ">
                    ↗
                </div>
                <span className="text-xs text-white drop-shadow">
                    공유
                </span>
            </button>

            {/* ───── 맨 아래: 마이페이지 버튼 ───── */}
            <Link
                href="/mypage"
                className="mt-1 flex flex-col items-center gap-1"
            >
                <div className="
                    h-12 w-12
                    overflow-hidden
                    rounded-full
                    border-2
                    border-white
                ">
                    <img
                        src={profileImage}
                        alt={profileAlt}
                        className="h-full w-full object-cover"
                    />
                </div>
                <span className="text-xs text-white drop-shadow">
                    마이
                </span>
            </Link>
        </div>
    );
}

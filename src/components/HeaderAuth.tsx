// src/components/HeaderAuth.tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

type SessionUser = {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username?: string;
};

export default function HeaderAuth() {
    const { data: session, status } = useSession();

    const isLoading = status === "loading";
    const user = session?.user as SessionUser | undefined;

    const label =
        user?.username
            ? `${user.username}`
            : user?.name || user?.email || "사용자";

    const profileImage =
        user?.image && user.image.trim() !== ""
            ? user.image
            : "/images/default-avatar.png";

    const myPageHref = user
        ? "/mypage"
        : `/api/auth/signin?callbackUrl=${encodeURIComponent("/mypage")}`;

    return (
        <header className="flex items-center justify-between px-4 py-3 text-white">
            <Link href="/" className="font-semibold">
                Shorts
            </Link>

            {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded-full bg-white/10" />
            ) : user ? (
                <div className="flex items-center gap-2">
                    {/* ✅ 닉네임 + 이미지 합친 클릭 영역 */}
                    <Link
                        href={myPageHref}
                        className="flex items-center gap-2 rounded-full hover:bg-white/10 px-2 py-1 transition"
                        aria-label="마이페이지로 이동"
                    >
                        <span className="text-sm text-white/80 max-w-[140px] truncate">
                            {label}
                        </span>

                        <img
                            src={profileImage}
                            alt="profile"
                            className="h-8 w-8 rounded-full object-cover border border-white/30"
                        />
                    </Link>

                    {/* 로그아웃 버튼은 클릭 영역 밖에 둬야 함 */}
                    <button
                        type="button"
                        onClick={() => signOut()}
                        className="rounded-full border border-white/30 px-3 py-1 text-xs hover:bg-white/10"
                    >
                        로그아웃
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => signIn()}
                    className="rounded-full border border-white/30 px-3 py-1 text-sm hover:bg-white/10"
                >
                    로그인
                </button>
            )}
        </header>
    );
}

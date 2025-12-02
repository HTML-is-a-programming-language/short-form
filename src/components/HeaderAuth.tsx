// src/components/HeaderAuth.tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function HeaderAuth() {
    const { data: session, status } = useSession();

    const isLoading = status === "loading";
    const user = session?.user;

    return (
        <header className="flex items-center justify-between px-4 py-3 text-white">
            <Link href="/" className="font-semibold">
                Shorts
            </Link>

            {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded-full bg-white/10" />
            ) : user ? (
                <div className="flex items-center gap-2">
                    {/* 유저 이름/이메일 노출 */}
                    <span className="text-sm text-white/80 max-w-[120px] truncate">
                        {user.name || user.email || "사용자"}
                    </span>

                    {/* 프로필 이미지 있으면 표시 */}
                    {user.image && (
                        <img
                            src={user.image}
                            alt="profile"
                            className="h-8 w-8 rounded-full object-cover border border-white/30"
                        />
                    )}

                    <button
                        onClick={() => signOut()}
                        className="rounded-full border border-white/30 px-3 py-1 text-xs hover:bg-white/10"
                    >
                        로그아웃
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => signIn()} // 기본 NextAuth 로그인 페이지로 이동
                    className="rounded-full border border-white/30 px-3 py-1 text-sm hover:bg-white/10"
                >
                    로그인
                </button>
            )}
        </header>
    );
}

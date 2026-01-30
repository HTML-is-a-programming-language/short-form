// src/components/HeaderAuth.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
    const router = useRouter();
    const { data: session, status } = useSession();

    const isLoading = status === "loading";
    const user = session?.user as SessionUser | undefined;

    const label = useMemo(() => {
        return user?.username
            ? `${user.username}`
            : user?.name || user?.email || "사용자";
    }, [user?.username, user?.name, user?.email]);

    const profileImage = useMemo(() => {
        return user?.image && user.image.trim() !== ""
            ? user.image
            : "/images/default-avatar.png";
    }, [user?.image]);

    const myPageHref = useMemo(() => {
        return user
            ? "/mypage"
            : `/api/auth/signin?callbackUrl=${encodeURIComponent("/mypage")}`;
    }, [user]);

    // ✅ 로그인 상태가 확인되면 마이페이지를 미리 당겨와서 전환 체감 개선
    useEffect(() => {
        if (user) {
            router.prefetch("/mypage");
        }
    }, [user, router]);

    const handleLogout = async () => {
        // ✅ 로그아웃 후 돌아갈 위치 명시 (원치 않으면 옵션 제거해도 됨)
        await signOut({ callbackUrl: "/" });
    };

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
                        prefetch
                        className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/10"
                        aria-label="마이페이지로 이동"
                    >
                        <span className="max-w-[140px] truncate text-sm text-white/80">
                            {label}
                        </span>

                        <img
                            src={profileImage}
                            alt="profile"
                            className="h-8 w-8 rounded-full border border-white/30 object-cover"
                            loading="lazy"
                        />
                    </Link>

                    {/* 로그아웃 버튼은 클릭 영역 밖에 둬야 함 */}
                    <button
                        type="button"
                        onClick={handleLogout}
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

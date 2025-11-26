// src/components/TopBar.tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function TopBar() {
    const { data: session, status } = useSession();

    const handleLogin = () => {
        // Google 로그인
        void signIn("google", { callbackUrl: "/" });
    };

    const handleLogout = () => {
        // 로그아웃 후 메인으로
        void signOut({ callbackUrl: "/" });
    };

    const isAuthenticated = status === "authenticated" && !!session?.user;

    const displayName =
        session?.user?.name ??
        session?.user?.email ??
        "";

    return (
        <header className="flex items-center justify-between px-4 py-2 text-sm border-b border-neutral-800">
            <span className="font-semibold">Short-form MVP</span>
            {isAuthenticated ? (
                <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-300">
                        {displayName}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="px-2 py-1 text-xs border rounded-md border-neutral-600 hover:bg-neutral-800"
                    >
                        로그아웃
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleLogin}
                    className="px-3 py-1 text-xs border rounded-md border-neutral-600 hover:bg-neutral-800"
                >
                    Google로 로그인
                </button>
            )}
        </header>
    );
}

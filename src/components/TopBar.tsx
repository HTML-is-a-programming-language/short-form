"use client";

import { useSession } from "next-auth/react";

export default function TopBar() {
    const { data: session } = useSession();

    const handleLogin = () => {
        window.location.href = "/api/auth/signin";
    };

    const handleLogout = () => {
        window.location.href = "/api/auth/signout";
    };

    return (
        <header className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="font-semibold">Short-form MVP</span>
            {session?.user ? (
                <button onClick={handleLogout}>
                    {(session.user as any).email ?? "로그아웃"}
                </button>
            ) : (
                <button onClick={handleLogin}>로그인</button>
            )}
        </header>
    );
}

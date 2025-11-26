"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginButton() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <button className="px-3 py-1 text-sm border rounded">
                로딩 중...
            </button>
        );
    }

    if (!session) {
        return (
            <button
                className="px-3 py-1 text-sm border rounded"
                onClick={() => signIn("google", { callbackUrl: "/" })}
            >
                Google로 로그인
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 text-sm">
            <span>{session.user?.email}</span>
            <button
                className="px-2 py-1 border rounded"
                onClick={() => signOut({ callbackUrl: "/" })}
            >
                로그아웃
            </button>
        </div>
    );
}

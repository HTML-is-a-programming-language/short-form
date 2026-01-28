"use client";

import { useMemo, useState } from "react";

type ShareButtonProps = {
    videoId: string;
    title?: string;
    text?: string;
    currentTimeSec?: number;
    className?: string;
    children: React.ReactNode;
};

function buildShareUrl(origin: string, videoId: string, t?: number) {
    const base = `${origin}/v/${videoId}`;
    if (!t || t <= 0) return base;

    const u = new URL(base);
    u.searchParams.set("t", String(t));
    return u.toString();
}

export default function ShareButton({
    videoId,
    title,
    text,
    currentTimeSec,
    className,
    children,
}: ShareButtonProps) {
    const [toast, setToast] = useState<string | null>(null);

    const origin = useMemo(() => {
        if (typeof window === "undefined") return "";
        return window.location.origin;
    }, []);

    const shareUrl = useMemo(() => {
        if (!origin || !videoId) return "";
        const t = currentTimeSec ? Math.floor(currentTimeSec) : undefined;
        return buildShareUrl(origin, videoId, t);
    }, [origin, videoId, currentTimeSec]);

    async function copyToClipboard(value: string) {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = value;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }

        setToast("링크를 복사했어요.");
        window.setTimeout(() => setToast(null), 1200);
    }

    async function onShare() {
        if (!shareUrl) return;

        const payload = {
            title: title ?? "영상 공유",
            text: text ?? "",
            url: shareUrl,
        };

        try {
            if (typeof navigator !== "undefined" && "share" in navigator) {
                await (navigator as Navigator & { share: (data: any) => Promise<void> }).share(payload);
                return;
            }
        } catch {
            // 사용자가 취소했거나 지원 불안정 → 복사로 폴백
        }

        await copyToClipboard(shareUrl);
    }

    return (
        <>
            <button type="button" onClick={onShare} className={className}>
                {children}
            </button>

            {toast && (
                <div className="fixed left-1/2 bottom-24 z-[9999] -translate-x-1/2 rounded-xl bg-black/80 px-4 py-2 text-white text-sm">
                    {toast}
                </div>
            )}
        </>
    );
}

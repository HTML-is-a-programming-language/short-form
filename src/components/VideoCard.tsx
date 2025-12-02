// src/components/VideoCard.tsx
"use client";

import { useEffect, useRef } from "react";

type VideoCardProps = {
    src: string;
    poster?: string;
    title: string;
    isActive: boolean; // 현재 활성 카드인가
    muted: boolean;    // 전역 음소거 상태
};

export default function VideoCard({
    src,
    poster,
    title,
    isActive,
    muted,
}: VideoCardProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // 활성 상태 / 음소거 상태가 바뀔 때마다 처리
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // 항상 전역 상태에 맞춰줌
        video.muted = muted;

        if (isActive) {
            // 현재 카드면 자동재생 시도
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.warn("video autoplay failed:", err);
                });
            }
        } else {
            // 비활성 카드는 일시정지
            video.pause();
        }
    }, [isActive, muted]);

    return (
        <div className="relative flex h-full w-full items-center justify-center">
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                playsInline
                loop
                autoPlay={false} // play()는 useEffect에서 처리
                muted={muted}
                className="h-full w-full object-cover"
            />

            {/* 제목 오버레이 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 p-4">
                <p className="line-clamp-2 text-sm text-white">{title}</p>
            </div>
        </div>
    );
}

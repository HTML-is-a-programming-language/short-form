// src/components/VideoCard.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/components/player/PlayerContext";

type VideoCardProps = {
    src: string;
    poster?: string;
    title: string;
    isActive: boolean; // 현재 활성 카드인가
};

export default function VideoCard({
    src,
    poster,
    title,
    isActive,
}: VideoCardProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const { muted, registerVideo } = usePlayer();

    // 1) 활성/비활성에 따라 재생/정지 + 전역 플레이어에 등록
    useEffect(() => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        if (isActive) {
            // 현재 카드가 활성 카드면, 전역 플레이어에 등록
            registerVideo(video);

            // 자동재생 시도
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.warn("video autoplay failed:", err);
                });
            }
        } else {
            // 비활성 카드는 정지
            video.pause();
        }
    }, [isActive, registerVideo]);

    // 2) 전역 mute 상태가 바뀔 때마다 mute만 반영
    useEffect(() => {
        const video = videoRef.current;
        if (!video) {
            return;
        }
        video.muted = muted;
    }, [muted]);

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
                <p className="line-clamp-2 text-sm text-white">
                    {title}
                </p>
            </div>
        </div>
    );
}

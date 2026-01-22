// src/components/VideoCard.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/components/player/PlayerContext";

type VideoCardProps = {
    videoId: string;
    src: string;
    poster?: string;
    title: string;
    isActive: boolean;
};

export default function VideoCard({
    videoId,
    src,
    poster,
    title,
    isActive,
}: VideoCardProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const { muted, registerVideo } = usePlayer();

    useEffect(() => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        if (isActive) {
            registerVideo(video);

            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.warn("video autoplay failed:", err);
                });
            }
        } else {
            video.pause();
        }
    }, [isActive, registerVideo]);

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
                autoPlay={false}
                muted={muted}
                className="h-full w-full object-cover"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 p-4">
                <p className="line-clamp-2 text-sm text-white">
                    {title}
                </p>
            </div>
        </div>
    );
}

// src/components/player/PlayerContext.tsx
'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";

type PlayerContextValue = {
    videoEl: HTMLVideoElement | null;
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    muted: boolean;
    registerVideo: (video: HTMLVideoElement | null) => void;
    togglePlay: () => void;
    seek: (time: number) => void;
    toggleMute: () => void;
};

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [muted, setMuted] = useState(true);

    // 현재 video의 이벤트 연결
    useEffect(() => {
        if (!videoEl) {
            return;
        }

        const handleTimeUpdate = () => {
            setCurrentTime(videoEl.currentTime || 0);
        };

        const handleLoadedMetadata = () => {
            setDuration(videoEl.duration || 0);
        };

        const handlePlay = () => {
            setIsPlaying(true);
        };

        const handlePause = () => {
            setIsPlaying(false);
        };

        videoEl.addEventListener("timeupdate", handleTimeUpdate);
        videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
        videoEl.addEventListener("play", handlePlay);
        videoEl.addEventListener("pause", handlePause);

        return () => {
            videoEl.removeEventListener("timeupdate", handleTimeUpdate);
            videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
            videoEl.removeEventListener("play", handlePlay);
            videoEl.removeEventListener("pause", handlePause);
        };
    }, [videoEl]);

    // 전역 mute 상태가 바뀌면 현재 video에도 반영
    useEffect(() => {
        if (!videoEl) {
            return;
        }
        videoEl.muted = muted;
    }, [videoEl, muted]);

    const registerVideo = useCallback((video: HTMLVideoElement | null) => {
        setVideoEl(video);
    }, []);

    const togglePlay = useCallback(() => {
        if (!videoEl) {
            return;
        }
        if (videoEl.paused) {
            videoEl.play().catch(() => {});
        } else {
            videoEl.pause();
        }
    }, [videoEl]);

    const seek = useCallback((time: number) => {
        if (!videoEl) {
            return;
        }
        videoEl.currentTime = time;
        setCurrentTime(time);
    }, [videoEl]);

    const toggleMute = useCallback(() => {
        setMuted((prev) => !prev);
    }, []);

    const value: PlayerContextValue = {
        videoEl,
        currentTime,
        duration,
        isPlaying,
        muted,
        registerVideo,
        togglePlay,
        seek,
        toggleMute,
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) {
        throw new Error("usePlayer must be used within PlayerProvider");
    }
    return ctx;
}

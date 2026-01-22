// src/components/player/PlayerContext.tsx
"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
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

    // ✅ 최신 videoEl 참조를 핸들러에서 안전하게 쓰기 위한 ref
    const videoRef = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
        videoRef.current = videoEl;
    }, [videoEl]);

    // 현재 video의 이벤트 연결
    useEffect(() => {
        if (!videoEl) {
            setCurrentTime(0);
            setDuration(0);
            setIsPlaying(false);
            return;
        }

        let alive = true;
        let rafId: number | null = null;

        const handleTimeUpdate = () => {
            if (!alive) return;

            // ✅ 이벤트가 "예전 video"에서 들어온 경우 무시
            const el = videoRef.current;
            if (!el || el !== videoEl) return;

            // ✅ 너무 잦은 setState 쓰로틀
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(() => {
                if (!alive) return;
                const cur = Number(el.currentTime ?? 0);
                setCurrentTime(cur);
            });
        };

        const handleLoadedMetadata = () => {
            if (!alive) return;

            const el = videoRef.current;
            if (!el || el !== videoEl) return;

            setDuration(Number(el.duration ?? 0));
            setCurrentTime(Number(el.currentTime ?? 0));
        };

        const handlePlay = () => {
            if (!alive) return;

            const el = videoRef.current;
            if (!el || el !== videoEl) return;

            setIsPlaying(true);
        };

        const handlePause = () => {
            if (!alive) return;

            const el = videoRef.current;
            if (!el || el !== videoEl) return;

            setIsPlaying(false);
        };

        videoEl.addEventListener("timeupdate", handleTimeUpdate);
        videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
        videoEl.addEventListener("play", handlePlay);
        videoEl.addEventListener("pause", handlePause);

        // 초기 반영
        handleLoadedMetadata();
        if (!videoEl.paused) {
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
        }

        return () => {
            alive = false;
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
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
        const el = videoRef.current;
        if (!el) {
            return;
        }
        if (el.paused) {
            el.play().catch(() => {});
        } else {
            el.pause();
        }
    }, []);

    const seek = useCallback((time: number) => {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        el.currentTime = time;
        setCurrentTime(time);
    }, []);

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

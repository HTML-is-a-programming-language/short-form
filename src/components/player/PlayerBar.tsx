'use client';

import React from "react";
import { usePlayer } from "./PlayerContext";

const formatTime = (sec: number) => {
    if (!sec || !isFinite(sec)) {
        return "0:00";
    }
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
        .toString()
        .padStart(2, "0");
    return `${m}:${s}`;
};

export function PlayerBar() {
    const {
        videoEl,
        currentTime,
        duration,
        isPlaying,
        muted,
        togglePlay,
        toggleMute,
        seek,
    } = usePlayer();

    const safeDuration = duration || 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        seek(value);
    };

    // 아직 활성 비디오 없으면 안 보이게
    if (!videoEl) {
        return null;
    }

    return (
        <div className="player-bar">
            <button
                type="button"
                className="player-btn"
                onClick={togglePlay}
            >
                {isPlaying ? "⏸" : "▶️"}
            </button>

            <div className="player-timeline">
                <span className="time-text">
                    {formatTime(currentTime)}
                </span>
                <input
                    type="range"
                    min={0}
                    max={safeDuration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={handleChange}
                    disabled={!safeDuration}
                />
                <span className="time-text">
                    {formatTime(safeDuration)}
                </span>
            </div>

            <button
                type="button"
                className="player-btn"
                onClick={toggleMute}
            >
                {muted ? "🔇" : "🔊"}
            </button>
        </div>
    );
}

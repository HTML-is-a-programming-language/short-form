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
                {isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FfF"><path d="M560-200v-560h160v560H560Zm-320 0v-560h160v560H240Z"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FfF"><path d="M320-200v-560l440 280-440 280Z"/></svg>}
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
                {muted ? <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FfF"><path d="M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-10t25.5-12L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56Zm-8-232-58-58q17-31 25.5-65t8.5-70q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 53-14.5 102T784-288ZM650-422l-90-90v-130q47 22 73.5 66t26.5 96q0 15-2.5 29.5T650-422ZM480-592 376-696l104-104v208Z"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FfF"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320Z"/></svg>}
            </button>
        </div>
    );
}

// src/components/VideoList.tsx
"use client";

import { useEffect, useState } from "react";
import VideoCard from "./VideoCard";

type VideoItem = {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
};

export default function VideoList() {
    const [items, setItems] = useState<VideoItem[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const params = new URLSearchParams();
            if (cursor) params.set("cursor", cursor);

            const res = await fetch(`/api/videos?${params.toString()}`, {
                cache: "no-store",
            });

            const text = await res.text();

            if (!res.ok) {
                console.error("/api/videos error:", res.status, text);
                return;
            }

            if (!text) {
                console.warn("/api/videos empty response");
                return;
            }

            const json = JSON.parse(text) as {
                videos: VideoItem[];
                nextCursor: string | null;
            };

            setItems((prev) => [...prev, ...(json.videos || [])]);
            setCursor(json.nextCursor ?? null);
        } catch (err) {
            console.error("load videos error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            {items.map((v) => (
                <VideoCard
                    key={v.id}
                    src={v.videoUrl}
                    poster={v.thumbnailUrl ?? undefined}
                    title={v.title}
                />
            ))}
            {loading && (
                <div className="p-4 text-center text-sm text-neutral-400">
                    불러오는 중...
                </div>
            )}
        </div>
    );
}

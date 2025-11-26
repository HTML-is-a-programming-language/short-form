// src/components/VideoCard.tsx
"use client";

type Props = {
    src: string;
    poster?: string;
    title?: string;
};

export default function VideoCard({ src, poster, title }: Props) {
    return (
        <div className="w-full h-dvh flex items-center justify-center bg-black relative">
            <video
                src={src}
                poster={poster}
                className="h-full"
                playsInline
                muted
                loop
                controls
            />
            {title && (
                <div className="absolute bottom-16 left-4 text-white font-semibold drop-shadow">
                    {title}
                </div>
            )}
        </div>
    );
}

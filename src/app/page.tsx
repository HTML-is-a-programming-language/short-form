// src/app/page.tsx
import VideoList from "@/components/VideoList";
import HeaderAuth from "@/components/HeaderAuth";
import { PlayerProvider } from "@/components/player/PlayerContext";
import { PlayerBar } from "@/components/player/PlayerBar";

type Props = {
    searchParams: Promise<{
        v?: string;
    }>;
};

export default async function HomePage({ searchParams }: Props) {
    const { v } = await searchParams;

    return (
        <PlayerProvider>
            <main className="h-dvh flex flex-col bg-black overflow-hidden">
                <HeaderAuth />
                <section className="flex-1 overflow-hidden">
                    <VideoList initialVideoUid={v} />
                </section>
                <PlayerBar />
            </main>
        </PlayerProvider>
    );
}

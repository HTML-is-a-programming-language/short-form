// src/app/page.tsx
import VideoList from "@/components/VideoList";
import HeaderAuth from "@/components/HeaderAuth";
import { PlayerProvider } from "@/components/player/PlayerContext";
import { PlayerBar } from "@/components/player/PlayerBar";

export default function HomePage() {
    return (
        <PlayerProvider>
            <main className="h-dvh flex flex-col bg-black overflow-hidden">
                <HeaderAuth />
                {/* 아래 플레이어바 높이만큼 실제 스크롤 영역에 여유를 주고 싶으면 pb-16 정도 추가 */}
                <section className="flex-1 overflow-hidden">
                    <VideoList />
                </section>
                <PlayerBar />
            </main>
        </PlayerProvider>
    );
}

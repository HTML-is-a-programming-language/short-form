// src/app/page.tsx
import VideoList from "@/components/VideoList";

export default function HomePage() {
    return (
        // 여기서는 높이만 잡고, 스크롤은 VideoList가 담당
        <main className="h-dvh bg-black">
            <VideoList />
        </main>
    );
}

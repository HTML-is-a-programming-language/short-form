// src/app/page.tsx
import VideoList from "@/components/VideoList";

export default function HomePage() {
    return (
        <main className="h-dvh overflow-y-scroll snap-y snap-mandatory bg-black">
            <VideoList />
        </main>
    );
}

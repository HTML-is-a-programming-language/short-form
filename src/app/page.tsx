// src/app/page.tsx
import VideoList from "@/components/VideoList";
import HeaderAuth from "@/components/HeaderAuth";

export default function HomePage() {
    return (
        <main className="h-dvh flex flex-col bg-black overflow-hidden">
            <HeaderAuth />
            <section className="flex-1 overflow-hidden">
                <VideoList />
            </section>
        </main>
    );
}

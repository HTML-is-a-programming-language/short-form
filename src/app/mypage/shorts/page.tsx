// src/app/mypage/shorts/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MyShortsList from "./MyShortsList";

export default async function MyShortsPage() {
    const session = await auth();

    if (!session?.user) {
        const callbackUrl = encodeURIComponent("/mypage/shorts");
        redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
    }

    return (
        <main className="min-h-dvh bg-black text-white flex justify-center">
            <div className="w-full max-w-md px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-semibold">내가 등록한 숏폼</h1>
                    <Link
                        href="/mypage"
                        className="text-sm text-white/70 hover:text-white"
                    >
                        마이페이지로
                    </Link>
                </div>

                <MyShortsList />
            </div>
        </main>
    );
}

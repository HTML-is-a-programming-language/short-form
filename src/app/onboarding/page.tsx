// src/app/onboarding/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
    const session = await auth();

    if (!session?.user) {
        const callbackUrl = encodeURIComponent("/onboarding");
        redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
    }

    const userId = (session.user as { id?: string }).id;

    if (!userId) {
        redirect("/"); // 세션에 id가 없으면 여기서 막는 게 안전
    }

    const me = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            bio: true,
            isOnboarded: true,
        },
    });

    if (!me) {
        redirect("/");
    }

    if (me.isOnboarded) {
        redirect("/mypage");
    }

    return (
        <main className="min-h-dvh bg-black text-white flex justify-center">
            <div className="w-full max-w-md px-4 py-8">
                <h1 className="text-xl font-semibold mb-2">회원가입</h1>
                <p className="text-sm text-white/60 mb-6">
                    서비스에서 사용할 닉네임을 설정해 주세요.
                </p>

                <OnboardingForm
                    initialUsername={me.username}
                    initialBio={me.bio ?? ""}
                />
            </div>
        </main>
    );
}

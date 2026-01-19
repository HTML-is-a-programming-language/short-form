// src/app/upload/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ShortFormUploadForm from "@/components/upload/ShortFormUploadForm";
import { db } from "@/lib/db";

export default async function UploadPage() {
    const session = await auth();

    if (!session?.user) {
        const callbackUrl = encodeURIComponent("/upload");
        redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
    }

    const userId = (session.user as { id?: string }).id;

    if (!userId) {
        redirect("/");
    }

    const me = await db.user.findUnique({
        where: { id: userId },
        select: {
            isOnboarded: true,
            id: true,
            username: true,
            name: true,
            image: true,
        },
    });

    if (!me?.isOnboarded) {
        redirect("/onboarding");
    }

    return (
        <main className="min-h-dvh bg-black text-white flex justify-center">
            <div className="w-full max-w-md px-4 py-8">
                <h1 className="text-xl font-semibold mb-6">숏폼 등록</h1>

                {/* ✅ 세션 대신 DB 기준의 user를 넘기는 게 안전 */}
                <ShortFormUploadForm
                    user={{
                        id: me.id,
                        username: me.username,
                        name: me.name,
                        image: me.image,
                    }}
                />
            </div>
        </main>
    );
}

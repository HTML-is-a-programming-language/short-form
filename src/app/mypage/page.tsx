// src/app/mypage/page.tsx
import { auth } from "@/auth";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function MyPage() {
    const session = await auth();

    if (!session?.user) {
        const callbackUrl = encodeURIComponent("/");
        redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
    }

    const user = session.user;

    return (
        <main className="min-h-dvh bg-black text-white flex justify-center">
            <div className="w-full max-w-md px-4 py-8">
                <h1 className="text-xl font-semibold mb-6">마이페이지</h1>

                <section className="bg-white/5 rounded-2xl p-5 flex items-center gap-4 mb-6">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                        {user.image ? (
                            <Image
                                src={user.image}
                                alt="프로필 이미지"
                                fill
                                sizes="64px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/10 text-lg">
                                {user.name?.[0] ?? "M"}
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="text-base font-medium">
                            {user.name ?? "이름 없음"}
                        </div>
                        <div className="text-xs text-white/60">
                            {user.email ?? "이메일 없음"}
                        </div>
                        <div className="text-xs text-white/40 mt-1">
                            @{user.username}
                        </div>
                    </div>
                </section>

                {/* 나중에 메뉴 붙일 자리 */}
            </div>
        </main>
    );
}

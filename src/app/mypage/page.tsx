// src/app/mypage/page.tsx
import { auth } from "@/auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

export default async function MyPage() {
    const session = await auth();

    if (!session?.user) {
        const callbackUrl = encodeURIComponent("/");
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
            username: true,
            name: true,
            email: true,
            image: true,
        },
    });

    if (!me?.isOnboarded) {
        redirect("/onboarding");
    }

    const profileImage =
        me.image && me.image.trim() !== ""
            ? me.image
            : "/images/default-avatar.png";

    return (
        <main className="min-h-dvh bg-black text-white flex justify-center">
            <div className="w-full max-w-md px-4 py-8">
                {/* ✅ 상단 바: 홈 버튼 + 타이틀 */}
                <header className="relative flex items-center mb-6">
                    <Link
                        href="/"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFF"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/></svg>
                    </Link>

                    <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">
                        마이페이지
                    </h1>
                </header>

                <section className="bg-white/5 rounded-2xl p-5 flex items-center gap-4 mb-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                        <Image
                            src={profileImage}
                            alt="프로필 이미지"
                            fill
                            sizes="64px"
                            className="object-cover"
                        />
                    </div>

                    <div className="flex-1">
                        <div className="text-base font-medium">
                            {me.name ?? "이름 없음"}
                        </div>
                        <div className="text-xs text-white/60">
                            {me.email ?? "이메일 없음"}
                        </div>
                        <div className="text-xs text-white/40 mt-1">
                            @{me.username}
                        </div>
                    </div>
                </section>

                <Link
                    href="/upload"
                    className="
                        block w-full rounded-2xl px-4 py-3 text-center font-medium
                        bg-white text-black hover:bg-white/90
                        transition
                    "
                >
                    + 숏폼 등록
                </Link>

                <section className="mt-6">
                    <h2 className="text-sm font-semibold text-white/70 mb-3">
                        메뉴
                    </h2>

                    <div className="space-y-2">
                        <Link
                            href="/mypage/shorts"
                            className="
                                block w-full rounded-2xl px-4 py-4
                                bg-white/5 border border-white/10
                                hover:bg-white/10 transition
                            "
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">
                                        내가 등록한 숏폼
                                    </div>
                                    <div className="text-xs text-white/60 mt-1">
                                        내가 업로드한 숏폼 목록/삭제 관리
                                    </div>
                                </div>
                                <span className="text-white/50">›</span>
                            </div>
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}

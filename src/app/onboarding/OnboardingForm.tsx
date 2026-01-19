// src/app/onboarding/OnboardingForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    initialUsername: string;
    initialBio: string;
};

type CheckResponse = {
    ok: boolean;
    available: boolean;
    message?: string;
};

export default function OnboardingForm({ initialUsername, initialBio }: Props) {
    const router = useRouter();

    const [username, setUsername] = useState<string>(initialUsername ?? "");
    const [bio, setBio] = useState<string>(initialBio ?? "");
    const [agree, setAgree] = useState<boolean>(false);

    const [checking, setChecking] = useState<boolean>(false);
    const [checkResult, setCheckResult] = useState<CheckResponse | null>(null);

    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const normalized = useMemo(() => username.trim().toLowerCase(), [username]);

    useEffect(() => {
        setError("");
        setCheckResult(null);

        if (normalized.length < 3) return;

        const t = setTimeout(async () => {
            try {
                setChecking(true);
                const res = await fetch(
                    `/api/onboarding/check-username?username=${encodeURIComponent(normalized)}`,
                    { method: "GET", cache: "no-store" }
                );

                const data = (await res.json()) as CheckResponse;
                setCheckResult(data);
            } catch {
                setCheckResult({ ok: false, available: false, message: "중복 확인 실패" });
            } finally {
                setChecking(false);
            }
        }, 350);

        return () => clearTimeout(t);
    }, [normalized]);

    const onSubmit = async () => {
        setError("");

        if (!agree) {
            setError("필수 약관 동의가 필요해요.");
            return;
        }

        if (!normalized) {
            setError("닉네임을 입력해 주세요.");
            return;
        }

        if (checkResult && checkResult.ok && !checkResult.available) {
            setError(checkResult.message ?? "이미 사용 중인 닉네임이에요.");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: normalized,
                    bio: bio.trim(),
                    agree,
                }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setError(data?.message ?? "회원가입 처리에 실패했어요.");
                return;
            }

            router.replace("/mypage");
            router.refresh();
        } catch {
            setError("회원가입 처리 중 오류가 발생했어요.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <label className="block">
                <div className="text-xs text-white/70 mb-1">닉네임(필수)</div>
                <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="닉네임"
                    className="
                        w-full rounded-xl px-3 py-2
                        bg-black/40 border border-white/10
                        outline-none focus:border-white/30
                    "
                />
                <div className="text-[11px] text-white/40 mt-1">
                    한글/영문/숫자/언더스코어만, 2~15자
                </div>

                <div className="text-xs mt-2">
                    {checking ? (
                        <span className="text-white/50">중복 확인 중...</span>
                    ) : checkResult?.ok ? (
                        checkResult.available ? (
                            <span className="text-green-300">사용 가능해요</span>
                        ) : (
                            <span className="text-red-300">{checkResult.message ?? "이미 사용 중이에요"}</span>
                        )
                    ) : null}
                </div>
            </label>

            <label className="block">
                <div className="text-xs text-white/70 mb-1">소개(bio, 선택)</div>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="간단 소개를 적어주세요."
                    rows={3}
                    className="
                        w-full rounded-xl px-3 py-2
                        bg-black/40 border border-white/10
                        outline-none focus:border-white/30
                        resize-none
                    "
                />
            </label>

            <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="accent-white"
                />
                (필수) 약관/개인정보 처리에 동의합니다.
            </label>

            {error ? <div className="text-xs text-red-300">{error}</div> : null}

            <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="
                    w-full rounded-2xl px-4 py-3 text-center font-medium
                    bg-white text-black hover:bg-white/90
                    disabled:opacity-60 disabled:cursor-not-allowed
                    transition
                "
            >
                {submitting ? "처리 중..." : "가입 완료"}
            </button>
        </section>
    );
}

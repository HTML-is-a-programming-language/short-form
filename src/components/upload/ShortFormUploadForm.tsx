// src/components/upload/ShortFormUploadForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

type UploadUser = {
    id?: string;
    name?: string | null;
    username: string;
    image?: string | null;
};

type Props = {
    user: UploadUser;
};

export default function ShortFormUploadForm({ user }: Props) {
    const router = useRouter();

    const profileImage = useMemo(() => {
        const raw = user.image ?? "";
        return raw && raw.trim() !== "" ? raw : "/images/default-avatar.png";
    }, [user.image]);

    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");

    // ✅ 파일 업로드용 상태
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // ✅ 썸네일 선택(프레임 캡처)용 상태
    const [duration, setDuration] = useState<number>(0);
    const [thumbTime, setThumbTime] = useState<number>(0);
    const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);
    const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string>("");

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    // objectURL 정리
    useEffect(() => {
        return () => {
            if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
            if (thumbPreviewUrl) URL.revokeObjectURL(thumbPreviewUrl);
        };
    }, [videoPreviewUrl, thumbPreviewUrl]);

    const handlePickVideo = (file: File | null) => {
        setError("");
        setThumbBlob(null);

        if (thumbPreviewUrl) {
            URL.revokeObjectURL(thumbPreviewUrl);
            setThumbPreviewUrl("");
        }

        if (videoPreviewUrl) {
            URL.revokeObjectURL(videoPreviewUrl);
            setVideoPreviewUrl("");
        }

        setDuration(0);
        setThumbTime(0);

        if (!file) {
            setVideoFile(null);
            return;
        }

        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
    };

    const onLoadedMetadata = () => {
        const video = videoRef.current;
        if (!video) return;

        const d = Number.isFinite(video.duration) ? video.duration : 0;
        setDuration(d);

        // 첫 프레임이 안 잡히는 경우가 있어서 살짝 앞으로
        const start = d > 1 ? 0.2 : 0;
        setThumbTime(start);
        video.currentTime = start;
    };

    const seekTo = (t: number) => {
        const video = videoRef.current;
        if (!video) return;

        const safe = Math.min(Math.max(t, 0), duration || 0);
        setThumbTime(safe);
        video.currentTime = safe;
    };

    const captureThumbnail = async () => {
        setError("");

        const video = videoRef.current;
        if (!video) {
            setError("비디오 미리보기가 준비되지 않았어요.");
            return;
        }

        // 영상 현재 프레임을 canvas로 캡처
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 0;
        const h = video.videoHeight || 0;

        if (!w || !h) {
            setError("썸네일을 캡처할 수 없어요. (영상 메타데이터가 없음)");
            return;
        }

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            setError("캔버스 컨텍스트 생성에 실패했어요.");
            return;
        }

        ctx.drawImage(video, 0, 0, w, h);

        const blob: Blob | null = await new Promise((resolve) => {
            canvas.toBlob(
                (b) => resolve(b),
                "image/jpeg",
                0.92
            );
        });

        if (!blob) {
            setError("썸네일 생성에 실패했어요.");
            return;
        }

        setThumbBlob(blob);

        if (thumbPreviewUrl) {
            URL.revokeObjectURL(thumbPreviewUrl);
        }
        setThumbPreviewUrl(URL.createObjectURL(blob));
    };

    const uploadToStorage = async (path: string, blobOrFile: Blob) => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blobOrFile);
        return await getDownloadURL(storageRef);
    };

    const onSubmit = async () => {
        setError("");

        if (!title.trim()) {
            setError("제목을 입력해 주세요.");
            return;
        }

        if (!videoFile) {
            setError("동영상 파일을 선택해 주세요.");
            return;
        }

        setIsSubmitting(true);

        try {
            // 썸네일을 아직 안 만들었으면 현재 시점으로 자동 생성
            if (!thumbBlob) {
                await captureThumbnail();
            }

            // captureThumbnail이 실패했으면 thumbBlob이 여전히 null일 수 있음
            if (!thumbBlob) {
                setError("썸네일을 생성해 주세요.");
                return;
            }

            const id = typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

            const ext = (videoFile.name.split(".").pop() || "mp4").toLowerCase();
            const safeUser = user.username || "user";

            // Storage 경로 규칙 (원하는 대로 바꿔도 됨)
            const videoPath = `videos/${safeUser}/${id}.${ext}`;
            const thumbPath = `thumbnails/${safeUser}/${id}.jpg`;

            // ✅ 1) 동영상 업로드
            const videoUrl = await uploadToStorage(videoPath, videoFile);

            // ✅ 2) 썸네일 업로드
            const thumbnailUrl = await uploadToStorage(thumbPath, thumbBlob);

            // ✅ 3) DB 등록 (authorId는 서버에서 세션으로 처리)
            const res = await fetch("/api/videos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description,
                    videoUrl,
                    thumbnailUrl,
                    storagePath: videoPath,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setError(data?.message ?? "등록에 실패했어요.");
                return;
            }

            const data = await res.json();
            const createdUid = data?.video?.uid as string | undefined;

            if (createdUid) {
                router.push(`/v/${createdUid}`);
            } else {
                router.push("/");
            }
        } catch (e) {
            setError("업로드/등록 중 오류가 발생했어요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* 작성자 정보(표시만) */}
            <section className="bg-white/5 rounded-2xl p-5 flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                    {/* next/image 외부 호스트 설정 귀찮으면 img로 두는 게 편함 */}
                    <img
                        src={profileImage}
                        alt="작성자 프로필"
                        className="h-full w-full object-cover"
                    />
                </div>

                <div className="flex-1">
                    <div className="text-sm font-medium">{user.name ?? "이름 없음"}</div>
                    <div className="text-xs text-white/60">@{user.username}</div>
                </div>
            </section>

            {/* 입력 폼 */}
            <section className="bg-white/5 rounded-2xl p-5 space-y-4">
                <label className="block">
                    <div className="text-xs text-white/70 mb-1">숏폼 제목</div>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예) 오늘의 운동 루틴"
                        className="
                            w-full rounded-xl px-3 py-2
                            bg-black/40 border border-white/10
                            outline-none focus:border-white/30
                        "
                    />
                </label>

                <label className="block">
                    <div className="text-xs text-white/70 mb-1">숏폼 내용</div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="설명/해시태그 등을 입력"
                        rows={4}
                        className="
                            w-full rounded-xl px-3 py-2
                            bg-black/40 border border-white/10
                            outline-none focus:border-white/30
                            resize-none
                        "
                    />
                </label>

                {/* ✅ 동영상 파일 선택 */}
                <label className="block">
                    <div className="text-xs text-white/70 mb-1">동영상 파일</div>
                    <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            handlePickVideo(file);
                        }}
                        className="block w-full text-xs text-white/80"
                    />
                    <div className="text-[11px] text-white/40 mt-1">
                        파일 선택 후 아래에서 원하는 지점으로 이동하고 썸네일을 캡처하세요.
                    </div>
                </label>

                {/* ✅ 비디오 미리보기 + 썸네일 선택 */}
                {videoPreviewUrl ? (
                    <div className="space-y-3">
                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                            <video
                                ref={videoRef}
                                src={videoPreviewUrl}
                                controls
                                playsInline
                                onLoadedMetadata={onLoadedMetadata}
                                className="w-full"
                            />
                        </div>

                        {/* 타임 슬라이더 */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-white/60">
                                <span>썸네일 위치</span>
                                <span>
                                    {thumbTime.toFixed(2)}s / {duration ? duration.toFixed(2) : "0.00"}s
                                </span>
                            </div>

                            <input
                                type="range"
                                min={0}
                                max={duration || 0}
                                step={0.05}
                                value={thumbTime}
                                onChange={(e) => seekTo(Number(e.target.value))}
                                className="w-full"
                                disabled={!duration}
                            />
                        </div>

                        {/* 캡처 버튼 + 미리보기 */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={captureThumbnail}
                                className="
                                    rounded-xl px-3 py-2 text-sm
                                    bg-white text-black hover:bg-white/90
                                    transition
                                "
                            >
                                현재 프레임으로 썸네일 만들기
                            </button>

                            {thumbPreviewUrl ? (
                                <div className="h-16 w-16 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                    <img
                                        src={thumbPreviewUrl}
                                        alt="썸네일 미리보기"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="text-xs text-white/50">
                                    아직 썸네일이 없어요
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                {error ? <div className="text-xs text-red-300">{error}</div> : null}

                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="
                        w-full rounded-2xl px-4 py-3 text-center font-medium
                        bg-white text-black hover:bg-white/90
                        disabled:opacity-60 disabled:cursor-not-allowed
                        transition
                    "
                >
                    {isSubmitting ? "등록 중..." : "등록하기"}
                </button>
            </section>
        </div>
    );
}

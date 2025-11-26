// src/app/upload/UploadClient.tsx
"use client";

import { useState } from "react";
import { uploadVideoToFirebase } from "@/lib/uploadVideo";

export default function UploadClient() {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        try {
            // 1) Firebase Storage 업로드
            const { storagePath, videoUrl } = await uploadVideoToFirebase(
                file,
                (p) => setProgress(p),
            );

            // 2) DB에 영상 정보 저장
            const res = await fetch("/api/videos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: crypto.randomUUID(),
                    title: title || file.name,
                    description,
                    storagePath,
                    videoUrl,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                console.error("create video failed:", res.status, data);
                throw new Error(data?.error ?? "failed to create video");
            }

            alert("업로드 완료!");
            setFile(null);
            setTitle("");
            setDescription("");
            setProgress(0);
        } catch (err) {
            console.error(err);
            alert("업로드 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="max-w-md mx-auto p-4 space-y-4">
            <h1 className="text-xl font-semibold">영상 업로드</h1>

            <input
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="설명"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />

            {loading && (
                <div className="text-sm text-neutral-500">
                    업로드 중... {progress.toFixed(0)}%
                </div>
            )}

            <button
                disabled={!file || loading}
                onClick={handleUpload}
                className="w-full py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
            >
                {loading ? "업로드 중..." : "업로드"}
            </button>
        </main>
    );
}

// src/lib/uploadVideo.ts
"use client";

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function uploadVideoToFirebase(
    file: File,
    onProgress?: (pct: number) => void
) {
    const storagePath = `videos/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<{ storagePath: string; videoUrl: string }>((resolve, reject) => {
        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress?.(progress);
            },
            (error) => reject(error),
            async () => {
                const videoUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({ storagePath, videoUrl });
            }
        );
    });
}

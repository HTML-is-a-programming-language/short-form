// src/app/upload/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import UploadClient from "./UploadClient";

export default async function UploadPage() {
    const session = await auth();

    // 로그인 안 했으면 구글 로그인 페이지로 리다이렉트
    if (!session?.user) {
        redirect("/api/auth/signin?callbackUrl=/upload");
    }

    // 로그인 되어 있으면 클라이언트 컴포넌트 렌더
    return <UploadClient />;
}

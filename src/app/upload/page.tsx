// src/app/upload/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ShortFormUploadForm from "@/components/upload/ShortFormUploadForm";

export default async function UploadPage() {
    const session = await auth();

    if (!session?.user) {
        const callbackUrl = encodeURIComponent("/upload");
        redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
    }

    return (
        <main className="min-h-dvh bg-black text-white flex justify-center">
            <div className="w-full max-w-md px-4 py-8">
                <h1 className="text-xl font-semibold mb-6">숏폼 등록</h1>
                <ShortFormUploadForm user={session.user} />
            </div>
        </main>
    );
}

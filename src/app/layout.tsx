import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./AuthProvider";

export const metadata: Metadata = {
    title: "Short-form MVP",
    description: "Next.js + Firebase short-form demo",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <body>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}

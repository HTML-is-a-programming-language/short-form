'use server';

export async function createDirectUploadURL(params?: {
    maxDurationSeconds?: number;
    requireSignedUrls?: boolean;
    meta?: Record<string, string>;
}) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
    const token = process.env.CLOUDFLARE_STREAM_API_TOKEN!;

    const body: any = {};
    if (params?.maxDurationSeconds) body.maxDurationSeconds = params.maxDurationSeconds;
    if (typeof params?.requireSignedUrls === 'boolean') body.requireSignedURLs = params.requireSignedUrls;
    if (params?.meta) body.meta = params.meta;

    const resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            cache: 'no-store',
        }
    );

    if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Cloudflare direct_upload 실패: ${resp.status} ${errorText}`);
    }

    const json = await resp.json();
    const uploadURL: string = json?.result?.uploadURL;
    const uid: string = json?.result?.uid;

    // ✅ 여기서는 DB에 아무것도 쓰지 않음
    return { uploadURL, uid };
}

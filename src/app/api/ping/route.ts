import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    const now = await db.$queryRaw`SELECT NOW()`;
    return NextResponse.json({ ok: true, now });
}

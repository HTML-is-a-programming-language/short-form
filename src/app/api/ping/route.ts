import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    return Response.json({
        ok: true,
        time: new Date().toISOString(),
    });
}

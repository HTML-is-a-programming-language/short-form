import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = {
    params: Promise<{ videoId: string }>;
};

export async function GET(_: Request, ctx: Ctx) {
    const { videoId } = await ctx.params;

    const count = await db.comment.count({
        where: { videoId },
    });

    return NextResponse.json({
        ok: true,
        count,
    });
}

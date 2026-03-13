import { NextRequest, NextResponse } from "next/server";
import { generateSignalBatch } from "@/lib/signalGenerator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.SIGNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const result = await generateSignalBatch();
  const duration = ((Date.now() - start) / 1000).toFixed(1);

  return NextResponse.json({ ...result, duration: `${duration}s` });
}

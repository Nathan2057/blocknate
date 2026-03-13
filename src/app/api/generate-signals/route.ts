import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSignalBatch } from "@/lib/signalGenerator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.SIGNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const force = req.nextUrl.searchParams.get("force") === "true";
  const start = Date.now();
  const result = await generateSignalBatch(force);
  const duration = ((Date.now() - start) / 1000).toFixed(1);

  await supabase.from("issue_logs").insert({
    level: result.success ? "INFO" : result.errors.length > 0 ? "ERROR" : "WARN",
    source: "signal-generator",
    message: result.message,
    details: {
      sessionId: result.sessionId,
      created: result.created,
      duration: `${duration}s`,
      force,
      skipped: result.skipped,
      errors: result.errors,
    },
  });

  return NextResponse.json({
    ...result,
    duration: `${duration}s`,
    debug: { skipped: result.skipped, errors: result.errors },
  });
}

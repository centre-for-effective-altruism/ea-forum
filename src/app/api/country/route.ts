import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const country =
    req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country");
  return NextResponse.json({
    country: country ?? null,
  });
}

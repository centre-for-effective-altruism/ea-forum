import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const country = req.headers.get("cf-ipcountry");
  return NextResponse.json({
    country: country ?? null,
  });
}

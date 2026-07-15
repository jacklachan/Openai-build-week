import { NextResponse } from "next/server";

import { getDemoReplan, getDemoTrip } from "@/lib/cache";

export function GET(request: Request) {
  const version = new URL(request.url).searchParams.get("version");
  if (version === null || version === "1") {
    return NextResponse.json({ trip: getDemoTrip(), source: "demo" });
  }
  if (version === "2") {
    return NextResponse.json({ trip: getDemoReplan(), source: "demo" });
  }
  return NextResponse.json(
    { error: "Demo version must be 1 or 2." },
    { status: 400 },
  );
}

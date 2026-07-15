import { NextResponse } from "next/server";
import { getHealthPayload } from "../../../lib/health";

export function GET() {
  return NextResponse.json(getHealthPayload());
}

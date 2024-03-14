import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/handleApiError";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function GET(req: Request) {
  return handleApiError("Unkown route", 404);
}

export async function POST(req: Request) {
  return handleApiError("Unkown route", 404);
}

import { handleApiError } from "@/lib/handleApiError";
import { NextResponse } from "next/server";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function GET(req: Request) {
  return handleApiError("Unkown route", 404);
}

export async function POST(req: Request) {
  return handleApiError("Unkown route", 404);
}

import { NextRequest, NextResponse } from "next/server";

import { authUser } from "@/lib/auth-user";
import { handleApiError } from "@/lib/handleApiError";

export function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function GET(req: NextRequest) {
  try {
    const user = await authUser();

    if (!user) {
      return handleApiError("Unauthorized user", 401);
    }
    return NextResponse.json(user);
  } catch (error) {
    return handleApiError("[COULDN'T GET USER]: Internal server error", 500);
  }
}

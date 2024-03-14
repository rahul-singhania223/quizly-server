import { NextResponse } from "next/server";

import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";

export async function GET(req: Request) {
  try {
    const user = await authUser();

    if (!user) return handleApiError("Unauthorized user", 401);

    const quizes = await db.quiz.findMany({
      where: {
        user_id: user.id,
      },
    });

    return NextResponse.json(quizes);
  } catch (error: any) {
    console.log("[ME_QUIZES_GET]", error);
    return handleApiError("Internal server error", 500);
  }
}

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";

export async function GET(
  req: Request,
  { params }: { params: { authorId: string } }
) {
  try {
    const { authorId } = params;

    if (!authorId) return handleApiError("Invalid author id", 400);

    const quizesFromAuthor = await db.quiz.findMany({
      where: {
        user_id: authorId,
      },
      include: {
        author: true,
      },
    });

    return NextResponse.json(quizesFromAuthor);
  } catch (error: any) {
    console.log("[QUIZ_BY_AUTHOR]", error);
    return handleApiError("Internal server error", 500);
  }
}

import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await authUser();

    if (!user) return handleApiError("Unauthorized user", 401);

    const quizId = params.quizId;

    if (!quizId) return handleApiError("Quiz id is required", 400);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 400);

    const updatedQuiz = await db.quiz.update({
      where: {
        id: quiz.id,
      },
      data: {
        plays_count: quiz.plays_count + 1,
      },
    });

    if (!updatedQuiz) {
      return handleApiError("Couldn't update quiz play count", 500);
    }

    return NextResponse.json(
      { message: "Updated play count and history" },
      { status: 200 }
    );
  } catch (error: any) {
    console.log("[PLAY_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

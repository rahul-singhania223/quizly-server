import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { Prisma, User } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const { quizId } = params;

    const play = req.nextUrl.searchParams.get("play");

    if (!quizId) return handleApiError("quiz id is required", 400);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    const questions = await db.question.findMany({
      where: {
        quiz_id: quizId,
      },
    });

    if (play) {
      const user = await authUser();

      const history = await db.history.findFirst({
        where: {
          user_id: user.id,
          quiz_id: quiz.id,
        },
      });

      if (!history) {
        const newHistory = await db.history.create({
          data: {
            user_id: user.id,
            quiz_id: quiz.id,
          },
        });
      }

      if (history) {
        const updatedHistory = await db.history.update({
          where: {
            id: history.id,
          },
          data: {
            points: 0,
          },
        });
      }
    }

    return NextResponse.json(questions);
  } catch (error: any) {
    console.log("[QUESTION_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const { quizId } = params;

    const { title, options, answer, exams } = await req.json();

    if (!quizId) return handleApiError("quiz id is required", 400);
    if (!title) return handleApiError("Title is required", 400);
    if (!options) return handleApiError("Options are required", 400);
    if (!answer) return handleApiError("answer is required", 400);

    const user = (await authUser()) as User;

    if (!user) return handleApiError("Unauthorized user", 401);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    const question = await db.question.create({
      data: {
        title,
        options,
        answer,
        exams,
        author_id: user.id,
        quiz_id: quizId,
      },
    });

    await db.quiz.update({
      where: {
        id: quizId,
      },
      data: {
        questionCount: quiz.questionCount + 1,
      },
    });

    if (!question) return handleApiError("couldn't create a question", 500);

    return NextResponse.json(question);
  } catch (error: any) {
    console.log("[QUESTION_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

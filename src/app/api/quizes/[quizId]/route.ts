import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { User } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = params.quizId;

    const withQuestions = req.nextUrl.searchParams.get("questions");

    if (!quizId) return handleApiError("Invalid quiz id", 400);

    if (withQuestions) {
      const quiz = await db.quiz.findUnique({
        where: {
          id: quizId,
        },
        include: {
          questions: true,
          author: {
            select: {
              id: true,
              name: true,
              image_url: true,
              bio: false,
              refresh_token: false,
              password: false,
            },
          },
        },
      });

      if (!quiz) return handleApiError("Quiz not found", 404);

      return NextResponse.json(quiz);
    }

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
      include: {
        author: true,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    return NextResponse.json(quiz);
  } catch (error: any) {
    console.log("[QUIZ_ID_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = params.quizId;

    const user = (await authUser()) as User;

    if (!user) return handleApiError("Unauthorized error", 401);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    const isAuthorOfThisQuiz = quiz.user_id === user.id;

    if (!isAuthorOfThisQuiz)
      return handleApiError("You cannot modify this quiz", 401);

    const deleteResponse = await db.quiz.delete({
      where: {
        id: quizId,
      },
    });

    if (!deleteResponse) return handleApiError("Couldn't delete a quiz", 500);

    return NextResponse.json(
      { message: "Quiz deleted successfully" },
      { status: 400 }
    );
  } catch (error: any) {
    console.log("[QUIZ_ID_DELETE]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function PATCH(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = params.quizId;

    const { title, description, thumbnail } = await req.json();

    if (!title) return handleApiError("Title is required", 400);
    if (!description) return handleApiError("Description is required", 400);
    if (!thumbnail) return handleApiError("Thumbnail is required", 400);

    const user = (await authUser()) as User;

    if (!user) return handleApiError("Unauthorized error", 401);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    const isAuthorOfThisQuiz = quiz.user_id === user.id;

    if (!isAuthorOfThisQuiz)
      return handleApiError("You cannot modify this quiz", 401);

    const updatedQuiz = await db.quiz.update({
      where: {
        id: quiz.id,
      },
      data: {
        title,
        description,
        thumbnail,
      },
    });

    if (!updatedQuiz) return handleApiError("Couldn't update quiz", 500);

    return NextResponse.json(updatedQuiz);
  } catch (error: any) {
    console.log("[QUIZ_ID_PATCH]", error);
    return handleApiError("Something went wrong", 500);
  }
}

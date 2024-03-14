import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { User } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const { questionId } = params;

    if (!questionId) return handleApiError("Question id is required", 400);

    const question = await db.question.findUnique({
      where: {
        id: questionId,
      },
    });

    if (!question) return handleApiError("Question not found", 404);

    return NextResponse.json(question);
  } catch (error: any) {
    console.log("[QUESTION_ID_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { questionId: string; quizId: string } }
) {
  try {
    const { questionId, quizId } = params;

    const user = (await authUser()) as User;

    if (!user) return handleApiError("Unauthorized user", 401);

    if (!questionId) return handleApiError("Question id is required", 400);
    if (!quizId) return handleApiError("Question id is required", 400);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    const question = await db.question.findUnique({
      where: {
        id: questionId,
      },
    });

    if (!question) return handleApiError("Question not found", 404);

    const isAuthorOfThisQuiz = question.author_id === user.id;

    if (!isAuthorOfThisQuiz)
      return handleApiError("You are not allowed to modify this resource", 400);

    const deleteResponse = await db.question.delete({
      where: {
        id: question.id,
      },
    });

    await db.quiz.update({
      where: {
        id: quizId,
      },
      data: {
        questionCount: quiz.questionCount - 1,
      },
    });

    if (!deleteResponse)
      return handleApiError("Couldn't delete a question", 500);

    return NextResponse.json(
      { message: "Delete one question " },
      { status: 200 }
    );
  } catch (error: any) {
    console.log("[QUESTION_ID_DELETE]", error);
    return handleApiError("something went wrong", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { questionId: string; quizId: string } }
) {
  try {
    const { questionId, quizId } = params;

    const { title, options, answer, exams } = await req.json();

    if (!questionId) return handleApiError("Question id is required", 400);
    if (!quizId) return handleApiError("Quiz id is required", 400);
    if (!title) return handleApiError("Title is required", 400);
    if (!options) return handleApiError("Options are required", 400);
    if (!answer) return handleApiError("Answer is required", 400);

    const user = (await authUser()) as User;

    if (!user) return handleApiError("Unauthorized user", 401);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    const question = await db.question.findUnique({
      where: {
        id: questionId,
      },
    });

    if (!question) return handleApiError("Question not found", 404);

    const isAuthorOfThisQuiz = question.author_id === user.id;

    if (!isAuthorOfThisQuiz)
      return handleApiError("You are not allowed to modify this resource", 400);

    const updatedQuestion = await db.question.update({
      where: {
        id: question.id,
      },
      data: {
        title,
        options,
        answer,
        exams,
      },
    });

    if (!updatedQuestion)
      return handleApiError("Couldn't update question", 500);

    return NextResponse.json(updatedQuestion);
  } catch (error: any) {
    console.log("[QUESTION_ID_PATCH]", error);
    return handleApiError("something went wrong", 500);
  }
}

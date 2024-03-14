import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { redis } from "@/lib/redis";
import { Saved, User } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function OPTION(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const { quizId } = await req.json();

    if (!quizId) return handleApiError("quiz id required", 400);

    const user = await authUser();

    if (!user) return handleApiError("Unauthorized user", 401);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    const saved = await db.saved.create({
      data: {
        user_id: user.id,
        quiz_id: quiz.id,
      },
    });

    if (!saved) return handleApiError("Couldn't save a quiz", 500);

    await db.quiz.update({
      where: {
        id: quiz.id,
      },
      data: {
        likes_count: quiz.likes_count + 1,
      },
    });

    const allSavedQuizes = [...user.saved_quizes, saved];

    await redis.set(
      user.id,
      JSON.stringify({ ...user, saved_quizes: allSavedQuizes })
    );

    return NextResponse.json(saved);
  } catch (error: any) {
    console.log("[SAVED_POST]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { quizId } = await req.json();

    if (!quizId) return handleApiError("quiz id required", 400);

    const user = await authUser();

    if (!user) return handleApiError("Unauthorized user", 401);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    const saved = await db.saved.findFirst({
      where: {
        user_id: user.id,
        quiz_id: quizId,
      },
    });

    if (!saved) return handleApiError("Couldn't find saved quiz", 400);

    const deleteResponse = await db.saved.delete({
      where: {
        id: saved.id,
      },
    });

    if (!deleteResponse) return handleApiError("Couldn't unsave quiz", 500);

    await db.quiz.update({
      where: {
        id: quiz.id,
      },
      data: {
        likes_count: quiz.likes_count - 1,
      },
    });

    const remainingSavedQuizes = user.saved_quizes.filter(
      (saved: Saved) => saved.quiz_id !== quizId
    );

    await redis.set(
      user.id,
      JSON.stringify({ ...user, saved_quizes: remainingSavedQuizes })
    );

    return NextResponse.json({ message: "Unsaved one quiz" }, { status: 200 });
  } catch (error: any) {
    console.log("[SAVED_POST]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await authUser();

    if (!user) return handleApiError("Unauthorized user", 401);

    const savedQuizes = await db.saved.findMany({
      where: {
        user_id: user.id,
      },
      include: {
        quiz: {
          include: {
            author: true,
          },
        },
      },
    });

    if (!savedQuizes) return handleApiError("Couldn't get saved quizes", 500);

    return NextResponse.json(savedQuizes);
  } catch (error: any) {
    console.log("[SAVED_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

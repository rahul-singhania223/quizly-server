import { NextRequest, NextResponse } from "next/server";
import { Saved, User } from "@prisma/client";

import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { redis } from "@/lib/redis";

export async function OPTIONS(req: Request) {
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

    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        saved_count: user.saved_count + 1,
      },
      include: {
        following: true,
        saved_quizes: true,
      },
    });

    await redis.set(user.id, JSON.stringify(updatedUser));

    return NextResponse.json(updatedUser);
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

    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        saved_count: user.saved_count - 1,
      },
    });

    await redis.set(user.id, JSON.stringify(updatedUser));

    return NextResponse.json(updatedUser);
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

import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { redis } from "@/lib/redis";
import { Like, User } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const { quizId } = params;

    const user = await authUser();

    if (!user) return handleApiError("Unauthorized error", 401);

    const quiz = await db.quiz.findUnique({
      where: {
        id: quizId,
      },
    });

    if (!quiz) return handleApiError("Quiz not found", 404);

    const likedQuizes = user.likedQuizes as Like[];

    const alreadyLiked = likedQuizes.find(
      (like) => like.userId === user.id
    ) as any;

    // DISLIKE
    if (alreadyLiked) {
      await db.like.delete({
        where: {
          id: alreadyLiked.id,
        },
      });

      await db.quiz.update({
        where: {
          id: quizId,
        },
        data: {
          likes: quiz.likes - 1,
        },
      });

      let cacheUser = JSON.parse((await redis.get(user.id)) as string);

      cacheUser.likedQuizes.splice(alreadyLiked.index, 1);

      await redis.set(user.id, JSON.stringify(cacheUser));

      return NextResponse.json(
        { success: true, message: "disliked a qize", data: null },
        { status: 200 }
      );
    }

    // LIKE THE QUIZ
    const newLike = await db.like.create({
      data: {
        userId: user.id,
        quizId: quizId,
        index: likedQuizes.length,
      },
    });

    const updatedQuiz = await db.quiz.update({
      where: {
        id: quizId,
      },
      data: {
        likes: quiz.likes + 1,
      },
    });

    let cacheUser = JSON.parse((await redis.get(user.id)) as string);

    const likedQuizesLength = cacheUser.likedQuizes.length;

    cacheUser.likedQuizes.push({
      ...newLike,
    });

    await redis.set(user.id, JSON.stringify(cacheUser));

    return NextResponse.json(
      { success: true, message: "liked a qize", data: null },
      { status: 200 }
    );
  } catch (error: any) {
    console.log("LIKE_GET", error);
    return handleApiError("Internal server", 500);
  }
}

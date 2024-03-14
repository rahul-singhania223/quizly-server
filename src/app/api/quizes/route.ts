import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { redis } from "@/lib/redis";
import { User } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const { title, description, thumbnail } = await req.json();

    if (!title) return handleApiError("Title is required", 400);
    if (!description) return handleApiError("Description is required", 400);
    if (!thumbnail) return handleApiError("Thumbnail is required", 400);

    const user = (await authUser()) as User;

    if (!user) return handleApiError("Unauthorized user", 401);

    const is_user_author = user.is_author;

    if (!is_user_author) {
      const updatedUser = await db.user.update({
        where: {
          id: user.id,
        },
        data: {
          is_author: true,
        },
      });

      if (!updatedUser) return handleApiError("Couldn't update user", 500);

      await redis.set(user.id, JSON.stringify(updatedUser));
    }

    const newQuiz = await db.quiz.create({
      data: {
        title,
        description,
        thumbnail,
        user_id: user.id,
      },
    });

    if (!newQuiz) return handleApiError("Couldn't create new quiz", 500);

    return NextResponse.json(newQuiz);
  } catch (error: any) {
    console.log("[QUIZ_POST]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("trending");

    if (type === "trending") {
      const quizes = await db.quiz.findMany({
        orderBy: {
          plays_count: "desc",
        },
        include: {
          author: {
            select: {
              name: true,
              id: true,
              email: true,
              image_url: true,
              refresh_token: false,
              password: false,
            },
          },
        },
      });

      return NextResponse.json(quizes);
    }

    if (type === "top") {
      const quizes = await db.quiz.findMany({
        orderBy: {
          plays_count: "desc",
        },
        take: 5,
        include: {
          author: {
            select: {
              name: true,
              id: true,
              email: true,
              image_url: true,
              refresh_token: false,
              password: false,
            },
          },
        },
      });

      return NextResponse.json(quizes);
    }

    const quizes = await db.quiz.findMany({
      include: {
        author: {
          select: {
            name: true,
            id: true,
            email: true,
            image_url: true,
            refresh_token: false,
            password: false,
          },
        },
      },
    });

    return NextResponse.json(quizes);
  } catch (error: any) {
    console.log("QUIZ_GET", error);
    return handleApiError("Internal server error", 500);
  }
}

import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { authorId: string } }
) {
  try {
    const { authorId } = params;

    if (!authorId) return handleApiError("autho id is required", 400);

    // FIND THE USER
    const user = await authUser();

    if (!user) return handleApiError("Unauthorized user", 401);

    // USER TRY TO FOLLOW HIMSELF
    if (authorId === user.id)
      return handleApiError("You can't follow yourself", 400);

    // FIND THE AUTHOR
    const author = await db.user.findFirst({
      where: {
        id: authorId,
        is_author: true,
      },
    });

    if (!author) return handleApiError("Author not found", 404);

    // FIND FOLLOWER
    const follower = await db.follower.findFirst({
      where: {
        user_id: user.id,
        author_id: author.id,
      },
    });

    if (follower)
      return handleApiError("You are already following this author", 400);

    // INCREASE FOLLOWING COUNT FOR USER
    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        following_count: user.following_count + 1,
        following: {
          create: {
            user_id: user.id,
            author_id: author.id,
          },
        },
      },
      include: {
        saved_quizes: true,
        following: true,
      },
    });

    if (!updatedUser)
      return handleApiError("Couldn't increase followings", 500);

    // INCREASE FOLLOWER COUNT FOR AUTHOR
    const updatedAuthor = await db.user.update({
      where: {
        id: author.id,
      },
      data: {
        followers_count: author.followers_count + 1,
      },
      include: {
        saved_quizes: true,
        following: true,
      },
    });

    if (!updatedAuthor)
      return handleApiError("Couldn't increase followers", 500);

    // UPDATE REDIS FOR USER
    await redis.set(
      user.id,
      JSON.stringify({
        ...updatedUser,
        refresh_token: undefined,
        password: undefined,
      })
    );

    // UPDATE REDIS FOR AUTHOR
    await redis.set(
      author.id,
      JSON.stringify({
        ...updatedAuthor,
        refresh_token: undefined,
        password: undefined,
      })
    );

    return NextResponse.json({ updatedUser });
  } catch (error: any) {
    console.log("[FOLLOW_POST]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { authorId: string } }
) {
  try {
    // FIND AUTHOR
    // FIND USER

    const { authorId } = params;

    if (!authorId) return handleApiError("Author id is required", 400);

    const user = await authUser();

    if (!user) return handleApiError("Unauthorized user", 401);

    const author = await db.user.findFirst({
      where: {
        id: authorId,
        is_author: true,
      },
    });

    if (!author) return handleApiError("Author not found", 404);

    // DELETE ONE FOLLOWER
    const follower = await db.follower.findFirst({
      where: {
        user_id: user.id,
        author_id: author.id,
      },
    });

    if (!follower) return handleApiError("Follower not found", 404);

    const deleteResponse = await db.follower.delete({
      where: {
        id: follower.id,
      },
    });

    if (!deleteResponse) return handleApiError("Couldn't delete follower", 500);

    // DECREASE FOLLOWING COUNT FOR USER
    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        following_count: user.following_count - 1,
      },
      include: {
        saved_quizes: true,
        following: true,
      },
    });
    // DECREASE FOLLOWERS COUNT FOR AUTHOR
    const updatedAuthor = await db.user.update({
      where: {
        id: author.id,
      },
      data: {
        followers_count: author.followers_count - 1,
      },
      include: {
        saved_quizes: true,
        following: true,
      },
    });

    // UPDATE REDIS FOR USER
    await redis.set(
      user.id,
      JSON.stringify({
        ...updatedUser,
        password: undefined,
        refresh_token: undefined,
      })
    );

    // UPDATE REDIS FOR AUTHOR
    await redis.set(
      author.id,
      JSON.stringify({
        ...updatedAuthor,
        password: undefined,
        refresh_token: undefined,
      })
    );

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.log("[FOLLOW_POST]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function GET(req: Request) {
  try {
    const data = await db.follower.findMany({});

    return NextResponse.json(data);
  } catch (error: any) {
    return handleApiError("Something went wrong", 500);
  }
}

import { NextResponse } from "next/server";
import { User } from "@prisma/client";

import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { redis } from "@/lib/redis";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function GET(req: Request) {
  try {
    const user = await authUser();

    if (!user) return handleApiError("Unauthorized user", 401);

    return NextResponse.json(user);
  } catch (error: any) {
    console.log("[USER_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const { name, bio, is_private, imageUrl } = await req.json();

    const user = (await authUser()) as User;

    if (!name || !bio) return handleApiError("name and bio is required", 400);

    if (!user) return handleApiError("Unauthorized user", 401);

    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        name,
        bio,
        image_url: imageUrl ? imageUrl : undefined,
        is_private,
      },
      include: {
        saved_quizes: true,
        following: true,
      },
    });

    if (!updatedUser) return handleApiError("Couldn't update profile", 500);

    await redis.set(updatedUser.id, JSON.stringify(updatedUser));

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.log("[USER_PATCH]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = (await authUser()) as User;

    if (!user) return handleApiError("Unauthorized error", 401);

    const deleteResponse = await db.user.delete({
      where: {
        id: user.id,
      },
    });

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.log("[USER_DELETE]", error);
  }
}

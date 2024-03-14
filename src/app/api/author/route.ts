import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";

export async function GET(req: Request) {
  try {
    const authors = await db.user.findMany({
      where: {
        is_author: true,
      },
      orderBy: {
        followers_count: "desc",
      },
      take: 20,
      select: {
        id: true,
        image_url: true,
        name: true,
        refresh_token: false,
        password: false,
      },
    });

    return NextResponse.json(authors);
  } catch (error: any) {
    console.log("[AUTHOR_GET]", error);
    return handleApiError("Internal server error", 500);
  }
}

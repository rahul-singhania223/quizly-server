import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");

    if (type === "top") {
      const authors = await db.user.findMany({
        where: {
          is_author: true,
        },
        orderBy: {
          followers_count: "desc",
        },
        take: 10,
        select: {
          id: true,
          image_url: true,
          name: true,
          refresh_token: false,
          password: false,
        },
      });

      return NextResponse.json(authors);
    }

    const authors = await db.user.findMany({
      where: {
        is_author: true,
      },
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

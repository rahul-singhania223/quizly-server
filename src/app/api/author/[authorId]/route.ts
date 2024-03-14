import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";

export async function GET(
  req: Request,
  { params }: { params: { authorId: string } }
) {
  try {
    const authorId = params.authorId;

    if (!authorId) return handleApiError("Invalid author id", 400);

    const author = await db.user.findUnique({
      where: {
        id: authorId,
      },
      include: {
        quizes: {
          include: {
            author: true,
          },
        },
      },
    });

    if (!author) return handleApiError("Author not found", 404);

    return NextResponse.json(author);
  } catch (error: any) {
    console.log("[AUTHOR_ID_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

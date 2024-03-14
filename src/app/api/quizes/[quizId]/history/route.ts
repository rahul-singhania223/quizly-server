import { authUser } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function GET(req: Request) {
  try {
    const user = await authUser();

    if (!user) return handleApiError("Unauthorized user", 401);

    const history = await db.history.findMany({
      where: {
        user_id: user.id,
      },
      include: {
        quiz: true,
      },
    });

    return NextResponse.json(history);
  } catch (error: any) {
    console.log("[HISTORY_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const { quizId } = params;

    const reset = req.nextUrl.searchParams.get("reset");

    if (!quizId) return handleApiError("Quiz id is required", 400);

    const user = await authUser();

    if (!user) return handleApiError("Unauthorized error", 401);

    const history = await db.history.findFirst({
      where: {
        user_id: user.id,
        quiz_id: quizId,
      },
    });

    if (!history) return handleApiError("History not found", 404);

    if (reset) {
      const resetedHistory = await db.history.update({
        where: {
          id: history.id,
        },
        data: {
          points: 0,
        },
      });

      return NextResponse.json(
        { message: "History reset successfull" },
        { status: 200 }
      );
    }

    const updatedHistory = await db.history.update({
      where: {
        id: history.id,
      },
      data: {
        points: history.points + 1,
      },
    });

    if (!updatedHistory) return handleApiError("Couldn't update history", 500);

    return NextResponse.json({ message: "History updated" }, { status: 200 });
  } catch (error: any) {
    console.log("[HISTORY_PATCH]", error);
    return handleApiError("Something went wrong", 500);
  }
}

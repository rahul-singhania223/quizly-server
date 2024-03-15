import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/handleApiError";
import { redis } from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const access_token = cookies().get("access_token")?.value;

    if (!access_token) return handleApiError("Unauthorized user", 401);

    const decoded = jwt.verify(
      access_token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as JwtPayload;

    if (!decoded)
      return handleApiError("Token is either invalid or expired", 400);

    await redis.del(decoded.id);

    cookies().set("access_token", "", {
      expires: new Date(0),
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
      domain: process.env.DOMAIN as string,
      sameSite: "none",
      path: "/",
    });
    cookies().set("refresh_token", "", {
      expires: new Date(0),
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
      domain: process.env.DOMAIN as string,
      sameSite: "none",
      path: "/",
    });

    return NextResponse.json(
      { success: true, message: "Logged out successfully", data: null },
      { status: 200 }
    );
  } catch (error) {
    console.log("[LOG-OUT]", error);
    return handleApiError("Something went wrong", 500);
  }
}

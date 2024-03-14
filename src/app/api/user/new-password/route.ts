import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/handleApiError";
import { db } from "@/lib/db";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const { otp: formOTP, newPassword } = await req.json();

    if (!formOTP || !newPassword)
      return handleApiError("All input fields are required!", 400);

    if (newPassword.length < 6)
      return handleApiError("Password must be atleast 6 characters long", 400);

    const forgot_password_token = cookies().get("forgot_password_token")?.value;

    if (!forgot_password_token) return handleApiError("Token not found", 400);

    const decoded = jwt.verify(
      forgot_password_token,
      process.env.FORGOT_PASSWORD_TOKEN_SECRET as string
    ) as JwtPayload;

    if (!decoded) return handleApiError("Session expired!", 400);

    const user = await db.user.findUnique({
      where: {
        email: decoded.email,
      },
    });

    if (!user) return handleApiError("User not found!", 404);

    const validOTP = formOTP === decoded.otp;

    if (!validOTP) return handleApiError("Invalid OTP", 400);

    const hash = await bcrypt.hash(newPassword, 8);

    const newUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hash,
      },
    });

    if (!newUser) return handleApiError("Couldn't change password", 500);

    cookies().delete("forgot_password_token");

    return NextResponse.redirect(new URL("/sign-in", req.url));
  } catch (error) {
    return handleApiError(
      "[Coudn't change password], something went wrong",
      500
    );
  }
}

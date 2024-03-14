import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { generateOTP } from "@/lib/generate-otp";
import { handleApiError } from "@/lib/handleApiError";
import { sendMail } from "@/lib/send-mail";
import { db } from "@/lib/db";

export function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const { email, newPassword, confirmPassword } = await req.json();

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email || !emailPattern.test(email))
      return handleApiError("Please enter valid email", 400);

    if (newPassword !== confirmPassword)
      return handleApiError("Passwords do not match", 400);

    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (!existingUser || !existingUser.email)
      return handleApiError(`${email} is not registered`, 400);

    const otp = generateOTP();

    const forgot_password_token = jwt.sign(
      { otp, email, newPassword },
      process.env.FORGOT_PASSWORD_TOKEN_SECRET as string,
      { expiresIn: "5m" }
    );

    try {
      await sendMail({
        subject: "Forgot password verification",
        template: "forgot-password-mail",
        data: { otp },
        email: existingUser.email,
      });
    } catch (error) {
      return handleApiError("Couldn't send log-in mail", 500);
    }

    cookies().set("cp_token", forgot_password_token, {
      expires: new Date(Date.now() + 1000 * 60 * 5),
      secure: process.env.NODE_ENV === "production",
      domain: process.env.CLIENT_URL as string,
      httpOnly: true,
    });

    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    return handleApiError("[FORGOT_PASSWORD] something went wrong", 500);
  }
}

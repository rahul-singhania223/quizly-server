import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { generateOTP } from "@/lib/generate-otp";
import { sendMail } from "@/lib/send-mail";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(req: Request, res: Response) {
  try {
    const { name, password, email } = await req.json();

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // verify data

    if (!name || name.length > 20)
      return handleApiError("Please enter valid name", 400);

    if (!email || !emailPattern.test(email))
      return handleApiError("Please enter valid email address", 400);

    if (!password || password.length < 6)
      return handleApiError("Password must be atleas 6 characters long", 400);

    // check existing user

    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser)
      return handleApiError(`${email} is already registered`, 400);

    const otp = generateOTP();

    try {
      await sendMail({
        email,
        data: { otp, name },
        subject: "Actvate account",
        template: "activation-mail",
      });
    } catch (error) {
      console.log(error);
      return handleApiError("Couldn't send OTP mail", 500);
    }

    const activation_token = jwt.sign(
      { userData: { name, email, password }, otp },
      process.env.ACTIVATION_TOKEN_SECRET as string,
      { expiresIn: "5m" }
    );

    cookies().set("activation_token", activation_token, {
      secure: process.env.NODE_ENV === "production",
      domain: process.env.DOMAIN as string,
      sameSite: "none",
      path: "/",
      maxAge: 1000 * 60 * 5,
      expires: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes after generation
    });

    return NextResponse.json(
      { message: "OTP has been sent", data: null, success: true },
      { status: 200 }
    );
  } catch (error) {
    console.log("[SIGN_UP_POST]", error);
    return handleApiError("Something went wrong", 500);
  }
}

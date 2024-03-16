import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";

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

    const hash = await bcrypt.hash(password, 8);

    const adminEmails = ["rahulsinghania406@gmail.com"];

    let newUser = await db.user.create({
      data: {
        email,
        name,
        password: hash,
        isAdmin: adminEmails.includes(email),
      },
    });

    const refresh_token = jwt.sign(
      { ...newUser, password: undefined },
      process.env.REFRESH_TOKEN_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    const access_token = jwt.sign(
      { ...newUser, password: undefined },
      process.env.ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: "3h",
      }
    );

    cookies().set("access_token", access_token, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 3),
      httpOnly: true,
      domain: process.env.DOMAIN as string,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    cookies().set("refresh_token", refresh_token, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      httpOnly: true,
      domain: process.env.DOMAIN as string,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.log("[SIGN_UP_POST]", error);
    return handleApiError("Something went wrong", 500);
  }
}

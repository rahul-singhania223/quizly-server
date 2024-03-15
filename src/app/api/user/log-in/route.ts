import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { handleApiError } from "@/lib/handleApiError";
import { redis } from "@/lib/redis";
import { sendMail } from "@/lib/send-mail";

export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!password) return handleApiError("Password is required", 400);

    if (!email || !emailPattern.test(email))
      return handleApiError("Please enter valid email address", 400);

    const user = await db.user.findUnique({
      where: {
        email,
      },
      select: {
        password: true,
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        refresh_token: false,
      },
    });

    if (!user || !user.password || !user.email)
      return handleApiError(`${email} is not registered!`, 400);

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) return handleApiError("Invalid credentials", 400);

    const userData = { ...user, password: undefined };

    const refresh_token = jwt.sign(
      { ...userData },
      process.env.REFRESH_TOKEN_SECRET as string,
      {
        expiresIn: "7d",
      }
    );
    const access_token = jwt.sign(
      { ...userData },
      process.env.ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: "3h",
      }
    );

    const newUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        refresh_token: refresh_token,
      },
      include: {
        saved_quizes: true,
        following: true,
      },
    });

    await redis.set(
      newUser.id,
      JSON.stringify({
        ...newUser,
        password: undefined,
        refresh_token: undefined,
      })
    );

    try {
      await sendMail({
        subject: "Login Successfull on quizly",
        template: "login-success-mail",
        data: { name: user.name },

        email: user.email,
      });
    } catch (error) {
      return handleApiError("Couldn't send log-in mail", 500);
    }

    cookies().set("access_token", access_token, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 3),
      maxAge: 1000 * 60 * 60 * 3,
      secure: process.env.NODE_ENV === "production",
      domain: "quizly-server-raone.vercel.app",
      sameSite: "none",
      path: "/",
    });

    cookies().set("refresh_token", refresh_token, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
      domain: "quizly-server-raone.vercel.app",
      sameSite: "none",
      path: "/",
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.log("[LOG_IN_POST]", error);
    return handleApiError("Something went wrong", 500);
  }
}

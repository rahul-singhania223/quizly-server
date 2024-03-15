import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";

import { handleApiError } from "@/lib/handleApiError";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sendMail } from "@/lib/send-mail";

export function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const { otp } = await req.json();

    const action = req.nextUrl.searchParams.get("action");

    if (!action) return handleApiError("No action was triggered!", 400);
    if (!otp) return handleApiError("OTP is required", 400);
    if (otp.length !== 6)
      return handleApiError("OTP must contain 6 characters", 400);

    // VERIFY - CHANGE PASSWORD
    if (action === "change-password") {
      const cp_token = req.cookies.get("cp_token")?.value;

      if (!cp_token) return handleApiError("Token not found!", 400);

      const decoded = jwt.verify(
        cp_token,
        process.env.FORGOT_PASSWORD_TOKEN_SECRET as string
      ) as JwtPayload;

      if (!decoded)
        return handleApiError("Token is either expired or invalid", 400);

      const validOTP = otp === decoded.otp;

      if (!validOTP) return handleApiError("Invalid OTP", 400);

      const hash = await bcrypt.hash(decoded.newPassword, 8);

      const updatedUser = await db.user.update({
        where: {
          email: decoded.email,
        },
        data: {
          password: hash,
        },
      });

      req.cookies.delete("cp_token");

      return NextResponse.json(updatedUser);
    }

    // VERIFY - REGISTRATION

    if (action === "sign-up") {
      const activation_token = req.cookies.get("activation_token")?.value;

      if (!activation_token) return handleApiError("Token not found", 400);

      const decoded = jwt.verify(
        activation_token,
        process.env.ACTIVATION_TOKEN_SECRET as string
      ) as JwtPayload;

      if (!decoded)
        return handleApiError("Token is either expired or invalid", 400);

      const validOTP = decoded.otp === otp;

      if (!validOTP) return handleApiError("Invalid otp", 400);

      const { name, email, password } = decoded.userData;

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

      newUser = await db.user.update({
        where: {
          id: newUser.id,
        },
        data: {
          refresh_token: refresh_token,
        },
        include: {
          following: true,
          saved_quizes: true,
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
          subject: "Registration Successfull on quizly",
          template: "registration-success-mail",
          data: { name: newUser.name },
          email: newUser.email || "",
        });
      } catch (error) {
        return handleApiError("Couldn't send registration mail", 500);
      }

      cookies().delete("activation_token");

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
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      return NextResponse.json(newUser);
    }
  } catch (error: any) {
    console.log("[VERIFY_POST]", error);

    return handleApiError("Internal server error", 500);
  }
}

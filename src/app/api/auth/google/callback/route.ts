import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/handleApiError";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");

    // // Exchange authorization code for an access token
    const { data } = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIET_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URL,
      grant_type: "authorization_code",
    });

    if (!data) return handleApiError("Couldn't sign in with google", 500);

    const google_access_token = data.access_token;

    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${google_access_token}`
    );

    const googleUser: {
      name: string;
      email: string;
      id: string;
      picture: string;
    } = response.data;

    if (!googleUser) return handleApiError("Coudln't google data of user", 500);

    const user = await db.user.findUnique({
      where: {
        google_id: googleUser.id,
      },
    });

    // IF USER EXIST WITH GOOGLE ID

    if (user) {
      const access_token = jwt.sign(
        { id: user.id, name: user.name },
        process.env.ACCESS_TOKEN_SECRET as string,
        { expiresIn: "3h" }
      );

      const refresh_token = jwt.sign(
        { id: user.id, name: user.name },
        process.env.REFRESH_TOKEN_SECRET as string,
        { expiresIn: "7d" }
      );

      const updatedUser = await db.user.update({
        where: {
          id: user.id,
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
        user.id,
        JSON.stringify({
          ...updatedUser,
          refresh_token: undefined,
          password: undefined,
        })
      );

      cookies().set("access_token", access_token, {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 3),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      cookies().set("refresh_token", refresh_token, {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }

    // IF GOOGLE ID DOES NOT EXIST

    if (!user) {
      const newUser = await db.user.create({
        data: {
          google_email: googleUser.email,
          google_id: googleUser.id,
          name: googleUser.name,
          image_url: googleUser.picture,
        },
      });

      if (!newUser)
        return handleApiError(
          "Couldn't create new user while signing in with google",
          500
        );

      const access_token = jwt.sign(
        { id: newUser.id, name: newUser.name },
        process.env.ACCESS_TOKEN_SECRET as string,
        { expiresIn: "3h" }
      );

      const refresh_token = jwt.sign(
        { id: newUser.id, name: newUser.name },
        process.env.REFRESH_TOKEN_SECRET as string,
        { expiresIn: "7d" }
      );

      const updatedUser = await db.user.update({
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
          ...updatedUser,
          refresh_token: undefined,
          password: undefined,
        })
      );

      cookies().set("access_token", access_token, {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 3),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      cookies().set("refresh_token", refresh_token, {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }

    return NextResponse.redirect(process.env.CLIENT_URL as string);
  } catch (error: any) {
    console.log("[GOOGLE_CALLBACK_GET]", error);
    return handleApiError("Something went wrong", 500);
  }
}

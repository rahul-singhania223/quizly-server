import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";

import { db } from "./db";
import { redis } from "./redis";
import { tree } from "next/dist/build/templates/app-page";

export const authUser = async () => {
  try {
    let access_token = cookies().get("access_token")?.value;

    let refresh_token = cookies().get("refresh_token")?.value;

    if (!access_token && !refresh_token) return null;

    if (!access_token) {
      if (refresh_token) {
        // get the user with refresh token

        const user = await db.user.findFirst({
          where: {
            refresh_token,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image_url: true,
            password: false,
            refresh_token: false,
          },
        });

        if (!user) return null;

        refresh_token = jwt.sign(
          user,
          process.env.REFRESH_TOKEN_SECRET as string,
          {
            expiresIn: "7d",
          }
        );

        access_token = jwt.sign(
          user,
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
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            image_url: true,
            is_private: true,
            isAdmin: true,
            followers_count: true,
            following_count: true,
            saved_count: true,
            refresh_token: false,
            password: false,
            saved_quizes: true,
            following: true,
          },
        });

        await redis.set(user.id, JSON.stringify(newUser));

        cookies().set("access_token", access_token, {
          expires: new Date(Date.now() + 1000 * 60 * 60 * 3),
        });

        cookies().set("refresh_token", refresh_token, {
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        });

        return { ...newUser, password: undefined, refresh_token: undefined };
      }
    }

    if (access_token) {
      const decoded = jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as JwtPayload;

      const cacheUser = JSON.parse((await redis.get(decoded.id)) as string);

      if (cacheUser) return cacheUser;

      const dbUser = await db.user.findUnique({
        where: {
          id: decoded.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          image_url: true,
          is_private: true,
          followers_count: true,
          following_count: true,
          saved_count: true,
          refresh_token: false,
          password: false,
          isAdmin: true,
          saved_quizes: true,
          following: true,
        },
      });

      if (!dbUser) return null;

      // save in cache
      await redis.set(dbUser.id, JSON.stringify(dbUser));

      return dbUser;
    }
  } catch (error) {
    console.log("[AUTH-USER]", error);
    return null;
  }
};

import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";

import { handleApiError } from "@/lib/handleApiError";
import { generateOTP } from "@/lib/generate-otp";
import { sendMail } from "@/lib/send-mail";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("activation_token")?.value;

    if (!token) return handleApiError("Token not found!", 400);

    // gives { userData, otp }
    const decoded = jwt.verify(
      token,
      process.env.ACTIVATION_TOKEN_SECRET as string
    ) as JwtPayload;

    if (!decoded)
      return handleApiError("Token is either invalid or expired!", 400);

    const OTP = generateOTP();

    const { userData } = decoded;

    const { email, name, password } = userData;

    try {
      await sendMail({
        email,
        data: { otp: OTP, name },
        subject: "Actvate account",
        template: "activation-mail",
      });
    } catch (error) {
      console.log(error);
      return handleApiError("Couldn't send activation mail", 500);
    }

    const activation_token = jwt.sign(
      { userData: { name, email, password }, otp: OTP },
      process.env.ACTIVATION_TOKEN_SECRET as string,
      { expiresIn: "5m" }
    );

    cookies().set("activation_token", activation_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes after generation
    });

    return NextResponse.json(
      { message: "OTP has been sent", data: null, success: true },
      { status: 200 }
    );
  } catch (error: any) {
    console.log("[RESEND_OTP]", error);
    return handleApiError("Internal server error", 500);
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  res.headers.append("Access-Control-Allow-Credentials", "true");
  // res.headers.append(
  //   "Access-Control-Allow-Origin",
  //   process.env.ALLOWED_ORIGIN || ""
  // );
  res.headers.append("Access-Control-Allow-Origin", "http://localhost:3001");
  res.headers.append(
    "Access-Control-Allow-Methods",
    "GET,DELETE,PATCH,POST,PUT,OPTIONS"
  );
  res.headers.append(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  return res;
}

// specify the path regex to apply the middleware to
export const config = {
  matcher: ["/api/:path*"],
};

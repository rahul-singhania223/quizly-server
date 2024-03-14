import { NextResponse } from "next/server";

export const handleApiError = (message: string, status: number) => {
  return new NextResponse(message, { status})
};

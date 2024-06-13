import { NextResponse } from "next/server";
import { passport } from "@/app/passport";

export async function GET(req: Request) {
  return new Response(`Hello, world!, ${req.url}`);
}

export async function POST(req: Request) {
  const payload = await req.json();

  await passport.setupEncryption();
  const data = await passport.delegatedRegisterAccount({
    username: payload.emailAddress,
  });

  return NextResponse.json(data);
}

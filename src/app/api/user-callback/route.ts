import { WebhookEvent } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  console.log(req);
  return new Response("Hello, world!");
}

export async function POST(request: Request) {
  const payload: WebhookEvent = await request.json();
  console.log(payload);
  return NextResponse.json({ message: "User signed in!" });
}

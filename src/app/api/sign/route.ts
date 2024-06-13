import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { stringToHex } from "viem";
import { passport } from "@/app/passport";

export async function POST(req: Request) {
  const payload = await req.json();
  const { type, data } = payload;

  const user = await currentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  passport.setUserData({ username: user.emailAddresses[0].emailAddress });
  await passport.setupEncryption();

  if (type === "message") {
    const signature = await passport.signMessage(stringToHex(data));
    return NextResponse.json({ signature });
  } else if (type === "transaction") {
    const signature = await passport.signTransaction(data);
    return NextResponse.json({ signature });
  } else {
    return new Response("Invalid type", { status: 400 });
  }
}

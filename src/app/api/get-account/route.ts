import { currentUser } from "@clerk/nextjs/server";
import { passport } from "@/app/passport";

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    passport.setUserData({ username: user.emailAddresses[0].emailAddress });
    await passport.setupEncryption();
    const addresses = await passport.getAddresses();

    return new Response(JSON.stringify(addresses), { status: 200 });
  } catch (error) {
    return new Response("Something went wrong", { status: 500 });
  }
}

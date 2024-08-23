import { KeySigner } from "@0xpass/key-signer";
import { Network, Passport } from "@0xpass/passport";

const keySigner = new KeySigner(process.env.PRIVATE_KEY!, true);

export const passport = new Passport({
  network:
    process.env.NODE_ENV === "production" ? Network.MAINNET : Network.LOCAL,
  scopeId: process.env.NEXT_PUBLIC_SCOPE_ID!,
  signer: keySigner,
});

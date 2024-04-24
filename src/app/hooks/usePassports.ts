import { useRef, useMemo } from "react";
import { WebauthnSigner } from "@0xpass/webauthn-signer";
import { KeySigner } from "@0xpass/key-signer";
import { Passport } from "@0xpass/passport";

interface PassportAuthProps {
  ENCLAVE_PUBLIC_KEY: string;
  scope_id: string;
  signerType?: "doa" | "passkeys";
  endpoint?: string;
}

export function usePassport({
  ENCLAVE_PUBLIC_KEY,
  scope_id,
  signerType = "passkeys",
  endpoint = "https://tiramisu.0xpass.io",
}: PassportAuthProps): {
  passport: Passport | null,
  signer: WebauthnSigner | KeySigner | null
} {
  const signerRef = useRef<WebauthnSigner | KeySigner | null>(null);
  const passportRef = useRef<Passport | null>(null);

  useMemo(() => {
    if (!signerRef.current) {
      if (signerType === "passkeys") {
        signerRef.current = new WebauthnSigner({
          rpId: process.env.NEXT_PUBLIC_RP_ID || "",
          rpName: "0xPass",
        });
      } else if (signerType === "doa") {
        signerRef.current = new KeySigner(process.env.DOA_PRIVATE_KEY || "", true);
      }
    }

    if (!passportRef.current && signerRef.current) {
      passportRef.current = new Passport({
        scope_id: scope_id,
        signer: signerRef.current,
        enclave_public_key: ENCLAVE_PUBLIC_KEY,
        endpoint: endpoint,
      });
    }
  }, [ENCLAVE_PUBLIC_KEY, scope_id, signerType, endpoint]);

  return {
    passport: passportRef.current,
    signer: signerRef.current,
  };
}

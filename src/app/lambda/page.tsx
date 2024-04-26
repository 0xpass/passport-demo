"use client";
import { useState } from "react";

import dynamic from "next/dynamic";
import { usePassport } from "@/app/hooks/usePassport";

const JsonViewer = dynamic(
  () => import("@textea/json-viewer").then((mod) => mod.JsonViewer),
  { ssr: false }
);

export default function LambdaPage() {
  const [firstLambdaOutput, setfirstLambdaOutput] = useState<{
    signature: string;
    timeExecuting: number;
  } | null>(null);

  const [secondLambdaOutput, setSecondLambdaOutput] = useState<{
    signature: string;
    timeExecuting: number;
  } | null>(null);

  const [thirdLambdaOutput, setThirdLambdaOutput] = useState<{
    signature: string;
    timeExecuting: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [guess1, setGuess1] = useState("");
  const [guess2, setGuess2] = useState("");
  const [guess3, setGuess3] = useState("");

  const endpoint = process.env.NEXT_PUBLIC_ENDPOINT;
  const enclavePublicKey = process.env.NEXT_PUBLIC_ENCLAVE_PUBLIC_KEY;
  const scopeId = process.env.NEXT_PUBLIC_SCOPE_ID;

  const { passport } = usePassport({
    ENCLAVE_PUBLIC_KEY: enclavePublicKey!,
    scope_id: scopeId!,
    endpoint: endpoint,
  });

  const triviaJson = {
    data: {
      authorization: {
        type: "none",
      },
      verifications: {
        count: 1,
      },
      envs: [],
      max_executions: 0,
      conditions: [
        {
          type: "code",
          code: "if ( '<<inputs.0>>' === ##redacted##){ return true; } else { return false; }",
          output_type: "integer",
          substitution: true,
        },
      ],
      actions: {
        type: "personal_sign",
        check: "",
        data: "0x000000",
        substitution: true,
      },
      postHook: [],
    },
  };

  const triviaLambdaId = "7d4e282c-c60c-4d58-b14e-2008666f1c58";

  const ethPriceJson = {
    data: {
      authorization: {
        type: "none",
      },
      verifications: {
        count: 1,
      },
      envs: [],
      max_executions: 0,
      conditions: [
        {
          type: "fetch",
          endpoint:
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
          protocol: "GET",
          headers: { "content-type": "application/json" },
          body: {},
          substitution: false,
        },
        {
          type: "code",
          code: "let ethPriceJson=<<conditions.0>>;if( ethPriceJson['output']['ethereum']['usd'] >= parseFloat('<<inputs.0>>')){ return true; } else { return false; }",
          output_type: "integer",
          substitution: true,
        },
      ],
      actions: {
        type: "personal_sign",
        check: "",
        data: "0x000000",
        substitution: true,
      },
      postHook: [],
    },
  };

  const ethPriceUuid = "a30262fb-2f48-4054-93b6-fde88b3af89a";

  const jwtDelegationJson = {
    data: {
      authorization: {
        type: "none",
      },
      verifications: {
        count: 1,
      },
      envs: [],
      max_executions: 0,
      conditions: [
        {
          type: "code",
          code: "const jwt = await import('https://deno.land/x/djwt@v3.0.2/mod.ts');\nconst publicKeyBase64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2h3xg5bbXjzCKhRAvBbP5xHSFT8fpx8jXtDgy3th6wSymA8FItvJza01ditfd2vdQ+8WMspKufxpQLDIW5l27AWhYUWYA0cZu+gYOL9MBsUN1XUSnfaSRvKUTpDIgJox0iE+7WzZh6rfOyit9ibmfwqtBWkqgPUKVAuE67jHK9Ai2mD+IRBOvpEtMLzm65z6v2RrRshvX+P2JDgQeNCqfDGZlkfatOcf5w4mcvDpGtTn5g2ICTuNSdotFVBX9+RqfdaG48OfKKYfNiiWbOaBC86hGx71LDO/L8n+HUqi6E+71MmRjAuz2uRwBOBcYe4JmuMmVjZP2+62K9mDBI2lSQIDAQAB';\ntry {\n  const spki = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));\n  const publicKey = await crypto.subtle.importKey('spki', spki.buffer, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, true, ['verify']);\n  const isValid = await jwt.verify('<<inputs.0>>', publicKey, 'RS256');\n  return true;\n} catch (e) {\n return false;\n}",
          output_type: "integer",
          substitution: true,
        },
      ],
      actions: {
        type: "personal_sign",
        check: "",
        data: "0x000000",
        substitution: true,
      },
      postHook: [],
    },
  };

  const jwtDelegationUuid = "a50036c6-92b1-43ff-93cd-255010883c50";

  const pemJson = {
    publicKey:
      "-----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmSnDN6uifbHRKHPh03zLLFHndhh7SA698vHqUvqogrPvTbYBdQbgW1jXYXx/CEIe/1SdiLTHVbck8i5XbOC9GoqfuNP0hgFAXSd8BS9+HgaDerOe5ilmhPPkGKSSejxclff1LQiTE/Fpru5DR9mNGTxSIV0XDVUto1bARoJUHnNZD+P3kdyJZ+F0B8rZynkFOK1Svci1wkYXBDPc8F+4xVoikCuIqN+5LIHpm3+7zTsVkDIBnYLhG/ac2CPAjNtfS1MkcrPRToWqGV+udQW4I79eBp+kyCcoUahi/s6AJx2eBk/I8grGiuBNNosSn9/kiIydu+iewjwowIE1qS3v8wIDAQAB-----END PUBLIC KEY-----",
    privateKey:
      "-----BEGIN PRIVATE KEY-----" +
      "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDaHfGDlttePMIq" +
      "FEC8Fs/nEdIVPx+nHyNe0ODLe2HrBLKYDwUi28nNrTV2K193a91D7xYyykq5/GlA" +
      "sMhbmXbsBaFhRZgDRxm76Bg4v0wGxQ3VdRKd9pJG8pROkMiAmjHSIT7tbNmHqt87" +
      "KK32JuZ/Cq0FaSqA9QpUC4TruMcr0CLaYP4hEE6+kS0wvObrnPq/ZGtGyG9f4/Yk" +
      "OBB40Kp8MZmWR9q05x/nDiZy8Oka1OfmDYgJO41J2i0VUFf35Gp91objw58oph82" +
      "KJZs5oELzqEbHvUsM78vyf4dSqLoT7vUyZGMC7Pa5HAE4Fxh7gma4yZWNk/b7rYr" +
      "2YMEjaVJAgMBAAECggEAXz1w7kUKf6EnJSmXxKlvWZXZ9mYMQ7SghK/PYHp9HJp+" +
      "A1CXrQtsmE8YB4PT2TjzskytFDtpmsGBEfq/WePuXgvtViSFxnSe44JqRSkeoNwd" +
      "eMX4fZojcDBPGuk0a5coxvi2WgTMDWXKuLHAGDoPLozyVOkBYrLcsisffLA/47xd" +
      "elEbTEk1F/2vxBBJ7uCLkuEJJDbK48Gi/zB98aJDPctP1vnhWLGfF/x9WZMR6QaM" +
      "q473LTuJnZj1c4Mp+tfDZwDOsQkLYiZqKFj4heXGlZ9xRXujQFVeJ6cKnXT6Tm7y" +
      "Xi3ZQNxKdjOyebHC5ddbFp00ymw0G0iPbjZ3zWg86wKBgQDxfBrAu1yxjNy+32GT" +
      "ZSRgWq8vwkQUEVPQTDjVg4v57oXvECPzjXgcyY4Gi6xkwIrdgG/nupvKAepHvECa" +
      "L41mDJRR47OlbDs9JzPRJn8xAfCTjPN1+zpr6hiXjdIQ5t8n5vetJxvxg++ksGEn" +
      "mrJNYTI3y+OLG1mbVlqNBRTwtwKBgQDnOkMO/KnWVrYg24sbNZ0oDDf9aJj1R1I2" +
      "kvh6vJXX6QsbzHiJf7ZCVbmCbahwMBQSopgav2qYI2R5SnA7VEBdOlw84grYhczZ" +
      "5uLoJbL+uc5RbbAuHpSCe+YZNJIrzdsCRDVZQvEZH7ELo3gVnCAUZXOoZPu0+Mrc" +
      "++/00FAZ/wKBgArQiwYsnecZrt0hdeY69lkWVpgl9BSN/hnq//SX8pHb28WsDGAg" +
      "6ssnP6QNZ0gP02g+E0Tmd4mhclOKG76L+KIkWBQexXHYGgMQGWL5fWK9en+xJUoY" +
      "WTJyBm3rHQhCvqWz002+3aKATSAsAf3bELckbjJPgD4/mFC7mkyMeLabAoGAKngL" +
      "+wOzGfgBKZXJPe0h+UoNOpDsjxhTZEyoMLrUdryJ2sg6V17KlfJyyR7k8f4Sob2V" +
      "XExOArV1bcWbSXpW/AiNCm2l+lDQ6DC8+lB6SMjNuS0BT+cz9adWAskiE8OSdx8a" +
      "AVQHPksQ1IdotedgCP79OC+b/4g2klH/p6JfI/cCgYEAtKBn51f/SiU022FTv4o9" +
      "WrkfX39uALqhkR9z9ZCkh5vqr7PvJhh95eDJxSzrOm1VxourYjXAwR1MvzF38xQm" +
      "yARhdoE64grLO6UuIaKtj7mktmhwZdqPIgKATIHSnbmgN5pJisiGNQAYqh+A2b2d" +
      "IHxGfCrkhZZiyFsmGZDx7Xw=" +
      "-----END PRIVATE KEY-----",
    algo: "RS256",
  };
  return (
    <div className="p-4 md:p-12">
      <h1 className="text-6xl font-bold">Passport Lambda</h1>
      <div className="flex flex-col md:flex-row md:space-x-9">
        <p className="max-w-[40ch] leading-7 mt-8 text-sm">
          Lambda Actions are programmable conditions that automate your
          authentication and signing workflows. You can use both on/off-chain
          data and arbitrary code to provide specific signature conditions by
          simple use of APIs.
        </p>
      </div>
      <br />
      <br />
      <h2 className="text-4xl font-bold">Bitcoin Trivia Example </h2>
      <p className="leading-7 mt-8 text-md">
        <b>Question:</b>
        <br />
        What was the hash of first bitcoin genesis block? If you get it right,
        the input will return a signature{" "}
        <a
          className="text-blue-600 underline"
          href="https://btcscan.org/block/000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
        >
          (Hint)
        </a>
      </p>
      <div className="flex flex-col-reverse md:flex-row p-12">
        <br />
        <div className="flex flex-col items-center w-full md:w-1/2 mb-4 md:mb-0">
          <JsonViewer
            style={{ backgroundColor: "black", width: "100%" }}
            displayDataTypes={false}
            theme={"dark"}
            displaySize={true}
            rootName={false}
            value={triviaJson}
          />
        </div>
        <div className="flex flex-col items-center w-full md:w-1/2 mb-12">
          <input
            type="text"
            value={guess1}
            onChange={(e) => {
              setGuess1(e.target.value);
            }}
            placeholder="Enter the block hash"
            className="border border-1 bg-[#161618] border-gray-600 focus:outline-black rounded p-2 w-4/5 mb-8 text-center"
          />
          <button
            className="w-4/5 border border-1 rounded p-2"
            onClick={async () => {
              try {
                setLoading(true);

                const t1 = performance.now();
                const response = await passport.executeLambda({
                  data: {
                    id: triviaLambdaId,
                    params: [guess1],
                  },
                });
                const t2 = performance.now();

                const timeExecutingLambda = t2 - t1;

                setfirstLambdaOutput({
                  signature: response.result,
                  timeExecuting: timeExecutingLambda,
                });
              } catch (e) {
                console.log(e);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Loading..." : "Trigger Lambda"}
          </button>
          {firstLambdaOutput && (
            <div className="mt-4 space-y-2 text-sm w-full overflow-x-auto">
              <p className="break-words">
                Output: {firstLambdaOutput.signature}
              </p>

              <p>
                Time taken executing lambda:{" "}
                {firstLambdaOutput.timeExecuting.toFixed(2)} ms
              </p>
            </div>
          )}
        </div>
      </div>
      <br /> <br />
      <h2 className="text-4xl font-bold">Sign based on Live Ethereum Price </h2>
      <p className="leading-7 mt-8 text-md">
        <b>How it works:</b>
        <br />
        In the input, enter a price target for ETH. If current ETH Price is
        greater than your price target, lambda returns a signature otherwise it
        doesn't.
      </p>
      <div className="flex flex-col-reverse md:flex-row p-12">
        <br />
        <div className="flex flex-col items-center w-full md:w-1/2 mb-4 md:mb-0">
          <JsonViewer
            style={{ backgroundColor: "black", width: "100%" }}
            displayDataTypes={false}
            theme={"dark"}
            displaySize={true}
            rootName={false}
            value={ethPriceJson}
          />
        </div>
        <div className="flex flex-col items-center w-full md:w-1/2 mb-12">
          <input
            type="text"
            value={guess2}
            onChange={(e) => {
              setGuess2(e.target.value);
            }}
            placeholder="Enter your ETH Price Target"
            className="border border-1 bg-[#161618] border-gray-600 focus:outline-black rounded p-2 w-4/5 mb-8 text-center"
          />
          <button
            className="w-4/5 border border-1 rounded p-2"
            onClick={async () => {
              try {
                setLoading(true);

                const t1 = performance.now();
                const response = await passport.executeLambda({
                  data: {
                    id: ethPriceUuid,
                    params: [guess2],
                  },
                });
                const t2 = performance.now();

                const timeExecutingLambda = t2 - t1;

                setSecondLambdaOutput({
                  signature: response.result,
                  timeExecuting: timeExecutingLambda,
                });
              } catch (e) {
                console.log(e);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Loading..." : "Trigger Lambda"}
          </button>
          {secondLambdaOutput && (
            <div className="mt-4 space-y-2 text-sm w-full overflow-x-auto">
              <p className="break-words">
                Output: {secondLambdaOutput.signature}
              </p>

              <p>
                Time taken executing lambda:{" "}
                {secondLambdaOutput.timeExecuting.toFixed(2)} ms
              </p>
            </div>
          )}
        </div>
      </div>
      <br /> <br />
      <h2 className="text-4xl font-bold">Delegate Auth using JWTs </h2>
      <p className="leading-7 mt-8 text-md">
        <b>How it works:</b>
        <br />
        You as developer owns the JWT Private Key. You register a verification
        lambda with us and you issue JWTs to your users allowing them to get
        signatures on your behalf.
        <br />
        <a
          className="text-blue-600 underline"
          href="https://jwt.io/"
          target="_blank"
        >
          Generate a JWT here
        </a>
        <br />
        Make sure you remove "" when you paste these keys
        <br />
        <div className="flex flex-col items-center w-full md:w-1/2 mb-4 md:mb-0">
          <JsonViewer
            style={{ backgroundColor: "black", width: "100%" }}
            displayDataTypes={false}
            theme={"dark"}
            displaySize={true}
            rootName={false}
            value={pemJson}
          />
        </div>
      </p>
      <div className="flex flex-col-reverse md:flex-row p-12">
        <br />
        <div className="flex flex-col items-center w-full md:w-1/2 mb-4 md:mb-0">
          <JsonViewer
            style={{ backgroundColor: "black", width: "100%" }}
            displayDataTypes={false}
            theme={"dark"}
            displaySize={true}
            rootName={false}
            value={jwtDelegationJson}
          />
        </div>
        <div className="flex flex-col items-center w-full md:w-1/2 mb-12">
          <input
            type="text"
            value={guess3}
            onChange={(e) => {
              setGuess3(e.target.value);
            }}
            placeholder="Input the JWT"
            className="border border-1 bg-[#161618] border-gray-600 focus:outline-black rounded p-2 w-4/5 mb-8 text-center"
          />
          <button
            className="w-4/5 border border-1 rounded p-2"
            onClick={async () => {
              try {
                setLoading(true);

                const t1 = performance.now();
                const response = await passport.executeLambda({
                  data: {
                    id: jwtDelegationUuid,
                    params: [guess3],
                  },
                });
                const t2 = performance.now();

                const timeExecutingLambda = t2 - t1;

                setThirdLambdaOutput({
                  signature: response.result,
                  timeExecuting: timeExecutingLambda,
                });
              } catch (e) {
                console.log(e);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Loading..." : "Trigger Lambda"}
          </button>
          {thirdLambdaOutput && (
            <div className="mt-4 space-y-2 text-sm w-full overflow-x-auto">
              <p className="break-words">
                Output: {thirdLambdaOutput.signature}
              </p>

              <p>
                Time taken executing lambda:{" "}
                {thirdLambdaOutput.timeExecuting.toFixed(2)} ms
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

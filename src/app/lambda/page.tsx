"use client";
import { useEffect, useState } from "react";
import { Passport } from "@0xpass/passport";

import dynamic from "next/dynamic";

const JsonViewer = dynamic(
  () => import("@textea/json-viewer").then((mod) => mod.JsonViewer),
  { ssr: false }
);

export default function LambdaPage() {
  const [signature, setsignature] = useState<{
    signature: string;
    timeCreating: number;
    timeExecuting: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [guess, setGuess] = useState("");

  const passport = new Passport();

  useEffect(() => {
    (() => {
      const session = sessionStorage.getItem("session");
      if (!session) {
        window.location.href = "/";
      }
    })();
  }, []);

  const lambdaData = {
    authorization: {
      type: "none",
    },
    verifications: {
      count: 1,
    },
    conditions: [
      {
        type: "code",
        code: `return ${guess} == 8;`,
        output_type: "boolean",
        substitution: false,
      },
    ],
    actions: {
      type: "personal_sign",
      check: "",
      data: "0x000000",
      substitution: true,
    },
    postHook: [],
  };

  return (
    <div className="p-4 md:p-12">
      <h1 className="text-6xl font-bold">Passport Lambda</h1>
      <div className="flex flex-col md:flex-row md:space-x-9">
        <p className="max-w-[40ch] leading-7 mt-8 text-sm">
          Lambda Actions are programmable conditions that can be used to specify
          signing and authentication logic for specific wallets. You can use
          both on and off-chain data to provide specific signature conditions by
          simple use of APIs.
        </p>

        <br />
        <p className="max-w-[40ch] leading-7 mt-8 text-sm">
          Here we have an example of a very simple lambda function, that does
          some computation, and then signs a message.
          <br />
          <br />
          You can try it out by clicking on the trigger lambda button, with your
          number guess, if it matches the number 8, a message is signed,
          otherwise the condition is not met.
        </p>
      </div>

      <div className="flex flex-col-reverse md:flex-row p-12">
        <div className="flex flex-col items-center w-full md:w-1/2 mb-4 md:mb-0">
          <JsonViewer
            style={{ backgroundColor: "black", width: "100%" }}
            displayDataTypes={false}
            theme={"dark"}
            displaySize={true}
            rootName={false}
            value={{
              authorization: {
                type: "none",
              },
              verifications: {
                count: 1,
              },
              conditions: [
                {
                  type: "code",
                  code: "return ${guess} == 8;",
                  output_type: "boolean",
                  substitution: false,
                },
              ],
              actions: {
                type: "personal_sign",
                check: "",
                data: "0x000000",
                substitution: true,
              },
              postHook: [],
            }}
          />
        </div>
        <div className="flex flex-col items-center w-full md:w-1/2 mb-12">
          <input
            type="text"
            value={guess}
            onChange={(e) => {
              setGuess(e.target.value);
            }}
            placeholder="Enter a number"
            className="border border-1 bg-[#161618] border-gray-600 focus:outline-black rounded p-2 w-4/5 mb-8 text-center"
          />
          <button
            className="w-4/5 border border-1 rounded p-2"
            onClick={async () => {
              try {
                setLoading(true);
                const session = sessionStorage.getItem("session");

                const t1 = performance.now();
                const uuid = await passport.lambdaNew({
                  data: lambdaData,
                  session: JSON.parse(session!),
                });
                const t2 = performance.now();

                const timeCreatingLambda = t2 - t1;

                const t3 = performance.now();
                const response = await passport.lambdaCall({
                  lambda_uuiid: uuid.result,
                });
                const t4 = performance.now();

                const timeExecutingLambda = t4 - t3;

                setsignature({
                  signature: response.result,
                  timeCreating: timeCreatingLambda,
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
          {signature && (
            <div className="mt-4 space-y-2 text-sm w-full overflow-x-auto">
              <p className="break-words">Signature: {signature.signature}</p>

              <p>
                Time taken creating lambda: {signature.timeCreating.toFixed(2)}{" "}
                ms
              </p>
              <p>
                Time taken executing lambda:{" "}
                {signature.timeExecuting.toFixed(2)} ms
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

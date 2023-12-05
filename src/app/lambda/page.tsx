"use client";
import { JsonViewer } from "@textea/json-viewer";
import { useEffect, useState } from "react";
import { Passport } from "@0xpass/passport";

export default function Page() {
  const [signature, setsignature] = useState<{
    signature: string;
    timeCreating: number;
    timeExecuting: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const passport = new Passport();

  useEffect(() => {
    (() => {
      const session = sessionStorage.getItem("session");
      if (!session) {
        window.location.href = "/";
      }
    })();
  }, []);

  return (
    <div className="p-12">
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
          some computation, and then signs a message. You can try it out by
          clicking on the trigger lambda button
        </p>
      </div>

      <div className="mt-8 flex flex-col-reverse md:flex-row p-12">
        <div className="flex flex-col items-center w-full md:w-1/2 mb-4 md:mb-0">
          <JsonViewer
            style={{ backgroundColor: "black", width: "100%" }}
            displayDataTypes={false}
            theme={"dark"}
            quotesOnKeys={false}
            displaySize={true}
            rootName={false}
            value={lambdaData}
            // sx={{ width: "100%" }}
          />
        </div>
        <div className="flex flex-col items-center w-full md:w-1/2 mb-4">
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
      code: "return 3;",
      output_type: "integer",
      substitution: false,
    },
    {
      type: "code",
      code: "return true;",
      output_type: "integer",
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

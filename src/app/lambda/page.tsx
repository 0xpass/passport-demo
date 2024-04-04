"use client";
import { useState } from "react";

import dynamic from "next/dynamic";
import {usePassport} from "@/app/hooks/usePassports";

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

    const [loading, setLoading] = useState(false);
    const [guess1, setGuess1] = useState("");
    const [guess2, setGuess2] = useState("");


    const endpoint = process.env.NEXT_PUBLIC_ENDPOINT;
    const enclavePublicKey = process.env.NEXT_PUBLIC_ENCLAVE_PUBLIC_KEY;
    const scopeId = process.env.NEXT_PUBLIC_SCOPE_ID;

    const { passport } = usePassport({
        ENCLAVE_PUBLIC_KEY: enclavePublicKey!,
        scope_id: scopeId!,
        endpoint: endpoint,
    });


    const triviaJson = {
        "data": {
            "authorization": {
                "type": "none"
            },
            "verifications": {
                "count": 1
            },
            "envs": [],
            "max_executions": 0,
            "conditions": [
                {
                    "type": "code",
                    "code": "if ( '<<inputs.0>>' === ##redacted##){ return true; } else { return false; }",
                    "output_type": "integer",
                    "substitution": true
                }
            ],
            "actions": {
                "type": "personal_sign",
                "check": "",
                "data": "0x000000",
                "substitution": true
            },
            "postHook": []
        }
    }

    const triviaLambdaId = "d0bb7eca-9666-4d71-a010-0722a96d824d"

    const ethPriceJson = {
        "data": {
            "authorization": {
                "type": "none"
            },
            "verifications": {
                "count": 1
            },
            "envs": [],
            "max_executions": 0,
            "conditions": [
                {
                    "type": "fetch",
                    "endpoint": "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
                    "protocol": "GET",
                    "headers": {"content-type":"application/json"},
                    "body": {},
                    "substitution": false
                },
                {
                    "type": "code",
                    "code": "let ethPriceJson=<<conditions.0>>;if( ethPriceJson['output']['ethereum']['usd'] >= parseFloat('<<inputs.0>>')){ return true; } else { return false; }",
                    "output_type": "integer",
                    "substitution": true
                }
            ],
            "actions": {
                "type": "personal_sign",
                "check": "",
                "data": "0x000000",
                "substitution": true
            },
            "postHook": []
        }
    }

    const ethPriceUuid = "a14e368f-f48d-4685-a889-9650250f39e6"


    return (
        <div className="p-4 md:p-12">
            <h1 className="text-6xl font-bold">Passport Lambda</h1>
            <div className="flex flex-col md:flex-row md:space-x-9">
                <p className="max-w-[40ch] leading-7 mt-8 text-sm">
                    Lambda Actions are programmable conditions that automate your authentication and signing workflows. You can use
                    both on/off-chain data and arbitrary code to provide specific signature conditions by
                    simple use of APIs.
                </p>
            </div>

            <br/><br/>
            <h2 className="text-4xl font-bold">Bitcoin Trivia Example </h2>
            <p className="leading-7 mt-8 text-md">
                <b>Question:</b>
                <br/>
                What was the hash of first bitcoin genesis block? If you get it right, the input will return a signature <a className="text-blue-600 underline" href="https://btcscan.org/block/000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f">(Hint)</a>
            </p>
            <div className="flex flex-col-reverse md:flex-row p-12">
                <br/>
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
                                        params: [guess1]
                                    }
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
                            <p className="break-words">Output: { firstLambdaOutput.signature}</p>

                            <p>
                                Time taken executing lambda:{" "}
                                {firstLambdaOutput.timeExecuting.toFixed(2)} ms
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <br/> <br/>
            <h2 className="text-4xl font-bold">Sign based on Live Ethereum Price </h2>
            <p className="leading-7 mt-8 text-md">
                <b>How it works:</b>
                <br/>
                In the input, enter a price target for ETH. If current ETH Price is greater than your price target, lambda returns a signature otherwise it doesn't.
            </p>
            <div className="flex flex-col-reverse md:flex-row p-12">
                <br/>
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
                                        params: [guess2]
                                    }
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
                            <p className="break-words">Output: { secondLambdaOutput.signature}</p>

                            <p>
                                Time taken executing lambda:{" "}
                                {secondLambdaOutput.timeExecuting.toFixed(2)} ms
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
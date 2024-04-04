"use client";
import { useEffect, useState } from "react";
import { createPassportClient } from "@0xpass/passport-viem";
import { mainnet } from "viem/chains";
import { http, WalletClient } from "viem";
import { JsonViewer } from "@textea/json-viewer";

export default function Home() {
  const [authenticatedHeader, setAuthenticatedHeader] = useState({});
  const [signMessageLoading, setSignMessageLoading] = useState(false);
  const [signTxLoading, setSignTxLoading] = useState(false);
  const [address, setAddress] = useState<any>("");

  const [message, setMessage] = useState("");
  const [messageSignature, setMessageSignature] = useState<{
    signature: string;
    timeTaken: number;
  } | null>(null);

  const [transactionSignature, setTransactionSignature] = useState<{
    signature: string;
    timeTaken: number;
    prepareTransactionTimeTaken: number;
  } | null>(null);

  const endpoint = process.env.NEXT_PUBLIC_ENDPOINT;

  useEffect(() => {
    async function fetchAddress() {
      const client: WalletClient = createWalletClient();
      const response = await client.requestAddresses();
      setAddress(response);
    }

    if (Object.keys(authenticatedHeader).length > 0) {
      fetchAddress();
    }
  }, [authenticatedHeader]);

  const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;
  const fallbackProvider = http(alchemyUrl);

  function createWalletClient() {
    return createPassportClient(
      authenticatedHeader,
      fallbackProvider,
      mainnet,
      endpoint
    );
  }

  async function signMessage(message: string) {
    try {
      setSignMessageLoading(true);
      const client: WalletClient = createWalletClient();

      const startTime = performance.now();
      const response = await client.signMessage({
        account: "0x00",
        message,
      });
      const endTime = performance.now();

      const timeTaken = endTime - startTime;
      setMessageSignature({ signature: response, timeTaken });
      setSignMessageLoading(false);
    } catch (error) {
      console.error(error);
    }
  }

  async function signTx() {
    try {
      setSignTxLoading(true);
      const client: WalletClient = createWalletClient();

      const prepareTransactionStart = performance.now();
      const transaction = await client.prepareTransactionRequest({
        account: "0x4A67aED1aeE7c26b7063987E7dD226f5f5207ED2",
        to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        value: BigInt(1000000000000000),
        chain: mainnet,
      });
      const prepareTransactionEnd = performance.now();

      const prepareTransactionTimeTaken =
        prepareTransactionEnd - prepareTransactionStart;

      const startTime = performance.now();
      const response = await client.signTransaction(transaction);
      const endTime = performance.now();

      const timeTaken = endTime - startTime;
      setTransactionSignature({
        signature: response,
        timeTaken,
        prepareTransactionTimeTaken,
      });

      setSignTxLoading(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <main>
      <div className="p-12">
        <h1 className="text-6xl font-bold">Passport Demo</h1>
        <p className="max-w-[40ch] leading-7 mt-8">
          Effortlessly set up your self-custody wallet with a few simple taps /
          clicks, by creating a passkey, with a unique username say goodbye to
          passwords, seed phrases, and private keys.{" "}
          <a
            className="italic leading-8 underline underline-offset-4"
            href="https://passport.0xpass.io"
            target="_blank"
          >
            Learn more here
          </a>
        </p>
      </div>

      <div className="flex space-y-5 flex-col items-center max-w-xl mx-auto mt-16">
        <div className="p-6 w-full">
          <p>Connected account: {address} </p>
          <br />
          <br />
          <form
            className="flex space-x-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await signMessage(message);
            }}
          >
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
              }}
              className="flex-grow border border-1 bg-[#161618] border-gray-600 focus:outline-black rounded p-2"
            />
            <button
              className="flex-grow border border-1 rounded p-2"
              type="submit"
              disabled={signMessageLoading}
            >
              {signMessageLoading ? "Loading..." : "Sign Message"}
            </button>
          </form>
          {messageSignature && (
            <div className="mt-4 space-y-2 text-sm">
              <p className="break-words">
                Signature: {messageSignature.signature}
              </p>
              <p>Time taken: {messageSignature.timeTaken.toFixed(2)} ms</p>
            </div>
          )}
          <br />
          <br />
          <form
            className="flex space-y-4 flex-col"
            onSubmit={async (e) => {
              e.preventDefault();
              await signTx();
            }}
          >
            <JsonViewer
              style={{ backgroundColor: "black", width: "100%" }}
              displayDataTypes={false}
              theme={"dark"}
              displaySize={true}
              rootName={false}
              value={{
                to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
                value: BigInt(1000000000000000),
                gas: BigInt(21000),
                maxFeePerGas: BigInt(25832617675),
                maxPriorityFeePerGas: BigInt(11269117),
              }}
            />

            {transactionSignature && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="break-words text">
                  Signature: {transactionSignature.signature}
                </p>
                <p>
                  Time taken preparing transaction with{" "}
                  <code>prepareTransaction</code>{" "}
                  {transactionSignature.prepareTransactionTimeTaken.toFixed(2)}{" "}
                  ms
                </p>
                <p>
                  Time taken: {transactionSignature.timeTaken.toFixed(2)} ms
                </p>
              </div>
            )}

            <button
              className="border border-1 rounded p-2 w-full h-12 self-center"
              type="submit"
              disabled={signTxLoading}
            >
              {signTxLoading ? "Loading..." : "Sign Transaction"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Passport } from "@0xpass/passport";
import { WebauthnSigner } from "@0xpass/webauthn-signer";
import axios from "axios";
import { createPassportClient } from "@0xpass/passport-viem";
import { mainnet } from "viem/chains";
import { http, WalletClient } from "viem";
import { enqueueSnackbar } from "notistack";
import { JsonViewer } from "@textea/json-viewer";
import { ENCLAVE_PUBLIC_KEY } from "./helpers";

export default function Home() {
  const [username, setUsername] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticatedHeader, setAuthenticatedHeader] = useState({});

  const [signMessageLoading, setSignMessageLoading] = useState(false);
  const [signTxLoading, setSignTxLoading] = useState(false);
  const [authenticateSetup, setAuthenticateSetup] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const [address, setAddress] = useState<any>("");

  const [keygenTime, setKeygenTime] = useState<number | null>(null);

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

  const [signer, setSigner] = useState<null | WebauthnSigner>(null);

  useEffect(() => {
    const signer = new WebauthnSigner({
      rpId: window.location.hostname,
      rpName: "0xPass",
    });

    setSigner(signer);
  }, []);

  const passport = new Passport({
    scope_id: "6cb8a0cd-0925-4347-a4f7-96a25032d3ee",
    signer: signer!,
    endpoint: "https://waffle.0xpass.io",
    enclave_public_key: ENCLAVE_PUBLIC_KEY,
  });

  useEffect(() => {
    async function fetchAddress() {
      const client: WalletClient = createWalletClient();
      const response = await client.requestAddresses();
      console.log("response from fetchAddress", response);
      setAddress(response);
    }

    if (Object.keys(authenticatedHeader).length > 0) {
      fetchAddress();
    }
  }, [authenticatedHeader]);

  const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;
  const fallbackProvider = http(alchemyUrl);

  const userInput = {
    username: username,
    userDisplayName: username,
  };

  async function register() {
    if (username.trim().length === 0) {
      enqueueSnackbar("Username cannot be empty", { variant: "error" });
      return;
    }

    // The `passport.register` method triggers a passkey modal flow and the time taken
    // to complete the modal by the user is included in the keygen time. So we intercept
    // the request and response to get the actual time taken specific to the keygen process.

    let requestStartTime = 0;
    const requestInterceptor = axios.interceptors.request.use((request) => {
      if (
        request.url === "https://waffle.0xpass.io" &&
        request.data &&
        request.data.method === "completeRegistration"
      ) {
        console.log("Completing registration request:", request);
        requestStartTime = performance.now();
      }
      return request;
    });

    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        if (
          response.config.url === "https://waffle.0xpass.io" &&
          response.config.data
        ) {
          const requestData = JSON.parse(response.config.data);
          if (requestData.method === "completeRegistration") {
            console.log("Completing registration response:", response);
            const timeTaken = performance.now() - requestStartTime;
            setKeygenTime(timeTaken);
          }
        }
        return response;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    try {
      await passport.setupEncryption();

      const res = await passport.register(userInput);
      console.log(res);
      //@ts-ignore
      if (res.result.account_id) {
        setAuthenticating(true);
        await authenticate();
        setAuthenticating(false);
      }
    } catch (error) {
      console.error("Error registering:", error);
      enqueueSnackbar(
        "Error registering, make sure you are registering a unique username",
        { variant: "error" }
      );
    } finally {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    }
  }

  async function authenticate() {
    try {
      await passport.setupEncryption();
      const [authenticatedHeader, address] = await passport.authenticate(
        userInput
      );
      setAuthenticatedHeader(authenticatedHeader);
      console.log(address);
      setAddress(address);
      setAuthenticated(true);
    } catch (error) {
      console.error("Error registering:", error);
    }
  }

  function createWalletClient() {
    return createPassportClient(
      authenticatedHeader,
      fallbackProvider,
      mainnet,
      "https://waffle.0xpass.io"
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
        {authenticated ? (
          <div className="p-6 w-full">
            <p>Connected account: {address} </p>
            {keygenTime && (
              <p>
                Took: {keygenTime.toFixed(2)} ms - to generate key & session
              </p>
            )}
            <br />
            <br />
            <div className="flex space-x-2">
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
                onClick={async () => await signMessage(message)}
              >
                {signMessageLoading ? "Loading..." : "Sign Message"}
              </button>
            </div>
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
            <div className="flex space-y-4 flex-col">
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
                    {transactionSignature.prepareTransactionTimeTaken.toFixed(
                      2
                    )}{" "}
                    ms
                  </p>
                  <p>
                    Time taken: {transactionSignature.timeTaken.toFixed(2)} ms
                  </p>
                </div>
              )}

              <button
                className="border border-1 rounded p-2 w-full h-12 self-center"
                onClick={async () => await signTx()}
              >
                {signTxLoading ? "Loading..." : "Sign Transaction"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-stretch space-y-8 w-full">
            <div className="flex flex-col items-center space-y-5 w-full">
              <input
                type="text"
                placeholder="Enter a unique username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
                className="w-4/6 border border-1 bg-[#161618] border-gray-600 focus:outline-black rounded p-3 text-center"
              />
              <button
                className="w-4/6 border border-1 rounded p-3"
                onClick={authenticateSetup ? authenticate : register}
              >
                {authenticateSetup
                  ? "Authenticate"
                  : authenticating
                  ? "Authenticating..."
                  : "Register"}
              </button>

              <span
                onClick={() => setAuthenticateSetup(!authenticateSetup)}
                className="cursor-pointer"
              >
                {authenticateSetup
                  ? "Register a Passkey?"
                  : "Already have a passkey?"}
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

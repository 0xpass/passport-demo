"use client";
import { useEffect, useState } from "react";
import { createPassportClient } from "@0xpass/passport-viem";
import { mainnet } from "viem/chains";
import { http, WalletClient } from "viem";
import { enqueueSnackbar } from "notistack";
import { JsonViewer } from "@textea/json-viewer";
import { usePassport } from "./hooks/usePassport";
import { SignUpButton, useUser } from "@clerk/nextjs";
import axios from "axios";

export default function Home() {
  const [username, setUsername] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticatedHeader, setAuthenticatedHeader] = useState({});
  const { isSignedIn, isLoaded } = useUser();

  const [addressLoading, setAddressLoading] = useState(false);

  const [signMessageLoading, setSignMessageLoading] = useState(false);
  const [signTxLoading, setSignTxLoading] = useState(false);
  const [authenticateSetup, setAuthenticateSetup] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);
  const [completingRegistration, setCompletingRegistration] = useState(false);
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

  const endpoint = process.env.NEXT_PUBLIC_ENDPOINT;
  const enclavePublicKey = process.env.NEXT_PUBLIC_ENCLAVE_PUBLIC_KEY;
  const scopeId = process.env.NEXT_PUBLIC_SCOPE_ID;

  const { passport } = usePassport({
    ENCLAVE_PUBLIC_KEY: enclavePublicKey!,
    scope_id: scopeId!,
    endpoint: endpoint,
  });

  useEffect(() => {
    async function fetchAddress() {
      const client: WalletClient = createWalletClient();
      const response = await client.requestAddresses();
      setAddress(response);
    }

    if (Object.keys(authenticatedHeader).length > 0) {
      fetchAddress();
    }

    const fetchDelegatedAddress = async () => {
      setAddressLoading(true);
      try {
        const response = await fetch("/api/get-account", {
          method: "GET",
        });

        if (response.ok) {
          const addresses = await response.json();
          setAddress(addresses.result[0]);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setAddressLoading(false);
      }
    };

    if (isSignedIn) {
      fetchDelegatedAddress();
      setAuthenticated(true);
    }
  }, [authenticatedHeader, isSignedIn]);

  const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;
  const fallbackProvider = http(alchemyUrl);

  const userInput = {
    username: username,
    userDisplayName: username,
  };

  async function register() {
    setRegistering(true);
    let requestStartTime = 0;
    const requestInterceptor = axios.interceptors.request.use((request) => {
      if (
        request.url === endpoint &&
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
        if (response.config.url === endpoint && response.config.data) {
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

    if (username.trim().length === 0) {
      enqueueSnackbar("Username cannot be empty", { variant: "error" });
      return;
    }
    setDuplicateError(false);

    try {
      await passport.setupEncryption();
      const res = await passport.register(userInput);
      console.log(res);
      setCompletingRegistration(false);
      if (res.result.account_id) {
        setRegistering(false);
        setAuthenticating(true);
        await authenticate();
        setAuthenticating(false);
      }
    } catch (error: any) {
      console.error("Error registering:", error);
      if (error.message.includes("Duplicate registration")) {
        setDuplicateError(true);
        return;
      }
      enqueueSnackbar(`Error registering: ${error}`, { variant: "error" });
    } finally {
      setRegistering(false);
      setAuthenticating(false);
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    }
  }

  async function authenticate() {
    setAuthenticating(true);
    try {
      await passport.setupEncryption();
      const [authenticatedHeader, address] = await passport.authenticate(
        userInput
      );
      setAuthenticatedHeader(authenticatedHeader);
      sessionStorage.setItem("session", JSON.stringify(authenticatedHeader));
      setAddress(address);
      setAuthenticated(true);
    } catch (error) {
      console.error("Error registering:", error);
    } finally {
      setAuthenticating(false);
    }
  }

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
      const [account] = await client.requestAddresses();

      const startTime = performance.now();
      const response = await client.signMessage({
        account: account,
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

      const [account] = await client.requestAddresses();
      const startTime = performance.now();
      const response = await client.signTransaction({
        ...transaction,
        account: account,
      });
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

  async function delegatedSignTx() {
    setSignTxLoading(true);
    try {
      const transaction = {
        from: "0x078352189fEDC08a20A904C7effB2bE7438f901e",
        nonce: "1",
        gasPrice: "0x9184E72A000", // Example: 1 Gwei in hex
        to: "0xb89FF4E9AD6B33F69153fa710F9849f51712eEc4",
        gas: "0x7530", // 30,000
        value: "0x2386F26FC10000", // 0.01 ETH in Wei
        chainId: "0x5", // Goerli's chain ID
        type: "0x00",
      };

      const startTime = performance.now();
      const response = await fetch("/api/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "transaction",
          data: transaction,
        }),
      });

      if (response.ok) {
        const { signature } = await response.json();
        const timeTaken = performance.now() - startTime;
        console.log({ signature });

        setTransactionSignature({
          prepareTransactionTimeTaken: 0,
          signature: signature.result,
          timeTaken,
        });
      } else {
        throw new Error(
          `HTTP error: ${response.status} ${response.statusText}`
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSignTxLoading(false);
    }
  }

  async function delegatedSignMessage(message: string) {
    setSignMessageLoading(true);
    try {
      const startTime = performance.now();
      let response = await fetch("/api/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "message",
          data: message,
        }),
      });

      if (response.ok) {
        const { signature } = await response.json();
        console.log(signature);
        const timeTaken = performance.now() - startTime;
        setMessageSignature({
          signature: signature.result,
          timeTaken: timeTaken,
        });
      } else {
        throw Error(`HTTP error: ${response}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSignMessageLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <svg
          className="animate-spin h-12 w-12 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M22 12c0-5.522-4.477-10-10-10-1.065 0-2.098.166-3.051.47l1.564 1.564A8 8 0 0112 4c4.418 0 8 3.582 8 8h-2z"
          ></path>
        </svg>
      </div>
    );
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
        {authenticated || isSignedIn ? (
          <div className="p-6 w-full">
            <p>Connected account: {addressLoading ? "Loading..." : address} </p>
            {keygenTime && (
              <p>
                Took: {keygenTime.toFixed(2)} ms - to generate key & session
              </p>
            )}
            <br />
            <br />
            <form
              className="flex space-x-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSignedIn) {
                  await delegatedSignMessage(message);
                } else {
                  await signMessage(message);
                }
              }}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                }}
                required
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
              className="flex space-y-2 flex-col"
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSignedIn) {
                  await delegatedSignTx();
                } else {
                  await signTx();
                }
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
                  {transactionSignature.prepareTransactionTimeTaken > 0 && (
                    <p>
                      Time taken preparing transaction with{" "}
                      <code>prepareTransaction</code>{" "}
                      {transactionSignature.prepareTransactionTimeTaken.toFixed(
                        2
                      )}{" "}
                      ms
                    </p>
                  )}
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
              <br />
            </form>
            <a href="/lambda" type="submit">
              <button className="border border-1 rounded p-2 w-full h-12 self-center">
                Try Passport Lambda
              </button>
            </a>
          </div>
        ) : (
          <>
            <SignUpButton
              mode="modal"
              afterSignInUrl="/auth/callback"
              afterSignUpUrl="/auth/callback"
            >
              <button className="w-4/6 border border-1 rounded p-3 cursor-pointer">
                Sign Up / In With Clerk
              </button>
            </SignUpButton>
            <div className="w-full pt-8">
              <h2 className="text-center pb-4">Sign Up / In With Passkeys</h2>
              <form
                className="flex flex-col items-stretch space-y-8 w-full"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (authenticateSetup) {
                    await authenticate();
                  } else {
                    await register();
                  }
                }}
              >
                <div className="flex flex-col items-stretch space-y-8 w-full">
                  <div className="flex flex-col items-center space-y-4 w-full">
                    <input
                      type="text"
                      placeholder="Enter a unique username"
                      disabled={completingRegistration}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                      }}
                      className={`w-4/6 border border-1 bg-[#161618] ${
                        duplicateError ? "border-red-600" : "border-gray-600"
                      } focus:outline-black rounded p-3 text-center`}
                    />
                    {duplicateError && (
                      <span className="text-red-600 text-xs">
                        Username already exists, please choose another
                      </span>
                    )}
                    <button
                      className="w-4/6 border border-1 rounded p-3 cursor-pointer"
                      type="submit"
                      disabled={
                        registering || authenticating || username.length === 0
                      }
                    >
                      {authenticateSetup
                        ? authenticating
                          ? "Authenticating..."
                          : "Authenticate"
                        : registering
                        ? "Registering..."
                        : authenticating
                        ? "Authenticating..."
                        : " Register"}
                    </button>

                    <span
                      onClick={() => setAuthenticateSetup(!authenticateSetup)}
                      className="cursor-pointer"
                    >
                      {authenticateSetup
                        ? "Register an Account?"
                        : "Already have an Account?"}
                    </span>
                    <br />
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

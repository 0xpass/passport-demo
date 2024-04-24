"use client";
import { useEffect, useState } from "react";
import { createPassportClient } from "@0xpass/passport-viem";
import { mainnet } from "viem/chains";
import { http, WalletClient } from "viem";
import { enqueueSnackbar } from "notistack";
import { JsonViewer } from "@textea/json-viewer";
import { usePassport } from "./hooks/usePassports";
import axios from "axios";

export default function Home() {
  const [username, setUsername] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticatedHeader, setAuthenticatedHeader] = useState({});

  const [signMessageLoading, setSignMessageLoading] = useState(false);
  const [signTxLoading, setSignTxLoading] = useState(false);
  const [authenticateSetup, setAuthenticateSetup] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authenticationMethod, setAuthenticationMethod] = useState('passkeys');
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

  const {passportDoa}  = usePassport({
    ENCLAVE_PUBLIC_KEY: enclavePublicKey!,
    scope_id: scopeId!,
    endpoint: endpoint,
    signerType: 'doa'
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
  }, [authenticatedHeader]);

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
      if(authenticationMethod === "passkeys") {
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

      } else {
        await passportDoa.setupEncryption();
        passportDoa.setUser(userInput)
        const res = await passportDoa.delegateRegister(userInput);
        setCompletingRegistration(false);
        if (res.result.account_id) {
          setRegistering(false);
          setAuthenticating(true);
          await authenticate();
          setAuthenticating(false);
        }
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
      if(authenticationMethod === "passkeys") {
        await passport.setupEncryption();
        const [authenticatedHeader, address] = await passport.authenticate(
          userInput
        );
        setAuthenticatedHeader(authenticatedHeader);
        sessionStorage.setItem("session",JSON.stringify(authenticatedHeader))
        setAddress(address);
        setAuthenticated(true);
      } else {
        await passportDoa.setupEncryption();
        passportDoa.setUser(userInput)
        const [authenticatedHeader, address] = await passportDoa.authenticate(
          userInput
        );
        setAuthenticatedHeader(authenticatedHeader);
        sessionStorage.setItem("session",JSON.stringify(authenticatedHeader))
        setAddress(address);
        setAuthenticated(true);
      }
      
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

      const startTime = performance.now();
      const response = await client.signMessage({
        account: "0x0000000000000000000000000000000000000000",
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
                type="submit"
                disabled={signTxLoading}
              >
                {signTxLoading ? "Loading..." : "Sign Transaction"}
              </button>
              <br/>
              <h2 className="text-lg">
                Programmatic Singing
                <a href="/lambda">
                  <div className="w-full border border-1 rounded p-2 mt-2 hover:cursor-pointer text-center">
                    Try Passport Lambda
                  </div>
                </a>
              </h2>

            </form>
          </div>
        ) : (
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
                <div className="flex justify-start items-center mb-4">
                  <label htmlFor="authenticationMethod" className="mr-2 text-lg">Method:</label>
                  <div className="flex-grow">
                    <select
                        id="authenticationMethod"
                        onChange={(e) => setAuthenticationMethod(e.target.value)}
                        className="w-full border border-gray-600 bg-[#161618] text-white rounded p-2 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      >
                        <option value="passkey">Passkeys</option>
                        <option value="doa">DOA</option>
                    </select>
                  </div>
                </div>
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
                      : "Authenticate with " + authenticationMethod.toUpperCase()
                    : registering
                    ? "Registering..."
                    : authenticating
                    ? "Authenticating..."
                    : " Register with " + authenticationMethod.toUpperCase()}
                </button>

                <span
                  onClick={() => setAuthenticateSetup(!authenticateSetup)}
                  className="cursor-pointer"
                >
                  {authenticateSetup
                    ? "Register an Account?"
                    : "Already have an Account?"}
                </span>
                <br/>
                <a href="/lambda">
                  <div className="w-full border border-1 rounded p-2 mt-2 hover:cursor-pointer text-center">
                    Try Passport Lambda
                  </div>
                </a>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

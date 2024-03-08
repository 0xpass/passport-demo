"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { createPassportClient } from "@0xpass/passport-viem";
import { mainnet } from "viem/chains";
import { http, WalletClient } from "viem";
import { enqueueSnackbar } from "notistack";
import { JsonViewer } from "@textea/json-viewer";
import { usePassport } from "./hooks/usePassports";

export default function Home() {
  const [username, setUsername] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticatedHeader, setAuthenticatedHeader] = useState({});

  const [signMessageLoading, setSignMessageLoading] = useState(false);
  const [signTxLoading, setSignTxLoading] = useState(false);
  const [authenticateSetup, setAuthenticateSetup] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const [duplicateError, setDuplicateError] = useState(false);
  const [challengeId, setChallengeId] = useState<string | undefined>();
  const [credentialCreationOptions, setCredentialCreationOptions] =
    useState<any>({});
  const [encryptedUser, setEncryptedUser] = useState<any>();

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
  }, [authenticatedHeader]);

  const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;
  const fallbackProvider = http(alchemyUrl);

  const userInput = {
    username: username,
    userDisplayName: username,
  };

  async function initiateRegistration() {
    setRegistering(true);
    if (username.trim().length === 0) {
      enqueueSnackbar("Username cannot be empty", { variant: "error" });
      return;
    }
    setDuplicateError(false);

    try {
      await passport.setupEncryption();
      const res = await passport.initiateRegistration(userInput);
      console.log(res);

      setChallengeId(res.challenge_id);
      setEncryptedUser(res.encrypted_user);
      setCredentialCreationOptions(res.cco_json);
      setCompletingRegistration(true);
    } catch (error: any) {
      if (error.message.includes("Duplicate registration")) {
        setDuplicateError(true);
        return;
      }
      console.error("Error registering:", error);
      enqueueSnackbar(`Error ${error}`, {
        variant: "error",
      });
    } finally {
      setRegistering(false);
    }
  }

  async function completeRegistration() {
    setRegistering(true);
    // The `passport.register` method triggers a passkey modal flow and the time taken
    // to complete the modal by the user is included in the keygen time. So we intercept
    // the request and response to get the actual time taken specific to the keygen process.

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
    try {
      await passport.setupEncryption();
      const res = await passport.completeRegistration(
        encryptedUser,
        challengeId,
        credentialCreationOptions
      );
      console.log(res);
      setCompletingRegistration(false);
      if (res?.result.account_id) {
        setRegistering(false);
        setAuthenticating(true);
        await authenticate();
        setAuthenticating(false);
      }
    } catch (error) {
      console.error("Error registering:", error);
      enqueueSnackbar(`Error ${error}`, {
        variant: "error",
      });
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
                className="w-4/6 border border-1 rounded p-3"
                onClick={() => {
                  if (authenticateSetup) {
                    authenticate();
                  } else if (completingRegistration) {
                    completeRegistration();
                  } else {
                    initiateRegistration();
                  }
                }}
                disabled={registering || authenticating}
              >
                {authenticateSetup
                  ? authenticating
                    ? "Authenticating..."
                    : "Authenticate"
                  : completingRegistration
                  ? registering
                    ? "Finalizing Registration..."
                    : "Click to complete registration"
                  : registering
                  ? "Setting up registration..."
                  : authenticating
                  ? "Authenticating..."
                  : "Initiate Registration"}
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

"use client";
import { useGoogleLogin } from "@react-oauth/google";
import { Passport } from "@0xpass/passport";
import { useCallback, useEffect, useState } from "react";
import OTPInput from "./components/OTPInput";
import axios from "axios";
import { createPassportClient } from "@0xpass/passport-viem";
import { mainnet } from "viem/chains";
import { http, WalletClient } from "viem";
import { enqueueSnackbar } from "notistack";

export default function Home() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState("");
  const [oauthLoading, setoauthLoading] = useState(false);

  const [address, setAddress] = useState<any>("");

  const [message, setMessage] = useState("");
  const [signatureData, setSignatureData] = useState<{
    signature: string;
    timeTaken: number;
  } | null>(null);

  useEffect(() => {
    async function fetchAddress() {
      const client: WalletClient = createWalletClient();
      const response = await client.requestAddresses();
      setAddress(response);
    }

    if (session) {
      fetchAddress();
    }
  }, [session]);

  const passport = new Passport();

  const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;

  const fallbackProvider = http(alchemyUrl);

  const handleOTPChange = useCallback((otp: any) => {
    setOtp(otp);
  }, []);

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      setoauthLoading(true);
      const token = await getAccessTokenFromCode(codeResponse.code);

      const session = await passport.getSession({
        scope_id: "1",
        verifier_type: "google",
        code: token.toString(),
      });

      setSession(JSON.stringify(session.result));
      setoauthLoading(false);
    },
    onError: (errorResponse) => console.log(errorResponse),
  });

  function createWalletClient() {
    return createPassportClient(session, fallbackProvider, mainnet);
  }

  async function signMessage(message: string) {
    const client: WalletClient = createWalletClient();

    const startTime = performance.now();
    const response = await client.signMessage({
      account: "0x00",
      message,
    });
    const endTime = performance.now();

    const timeTaken = endTime - startTime;
    setSignatureData({ signature: response, timeTaken });
  }

  async function signTx() {
    const client: WalletClient = createWalletClient();

    const transaction = await client.prepareTransactionRequest({
      account: "0x4A67aED1aeE7c26b7063987E7dD226f5f5207ED2",
      to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      value: BigInt(1000000000000000),
      chain: mainnet,
    });

    const response = await client.signTransaction(transaction);
    alert(JSON.stringify(response));
  }

  async function getAccessTokenFromCode(code: any): Promise<String> {
    const tokenUrl = "https://oauth2.googleapis.com/token";

    const data = {
      code: code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: "http://localhost:3000",
      grant_type: "authorization_code",
    };

    try {
      const response = await axios.post(tokenUrl, data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // Extract the access token (and optionally the refresh token)
      return response.data.access_token;
    } catch (error) {
      console.error("Error fetching access token");
      throw error;
    }
  }

  return (
    <main>
      <div className="p-12">
        <h1 className="text-6xl font-bold">Passport Demo</h1>
        <p className="max-w-[40ch] leading-7 mt-8">
          Effortlessly set up your self-custody wallet with a few simple taps, your favorite OAuth
          Providers or email OTP, all while maintaining complete self-custody through an MPC
          network. Say goodbye to passwords, seed phrases, and private keys
        </p>
      </div>

      <div className="flex space-y-5 flex-col items-center">
        {session ? (
          <div className="p-12">
            <p>Connected account: {address} </p>
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
                onClick={() => signMessage(message)}
              >
                Sign Message
              </button>
            </div>
            {signatureData && (
              <div className="mt-4">
                <p>Signature: {signatureData.signature}</p>
                <p>Time taken: {signatureData.timeTaken.toFixed(2)} ms</p>
              </div>
            )}
            <br />
            <br />
            <button onClick={signTx}>Click Me to Sign Transaction</button>
          </div>
        ) : (
          <div className="flex flex-col items-stretch space-y-8">
            <button onClick={googleLogin} className="p-2 border border-1 border-gray-600 rounded">
              {oauthLoading ? "Loading..." : " Login with Google ✨"}
            </button>
            <div className="flex space-x-2">
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                className="flex-grow border border-1 bg-[#161618] border-gray-600 focus:outline-black rounded p-2"
              />
              <button
                className="flex-grow border border-1 rounded p-2"
                onClick={async () => {
                  await passport.sendOtp({
                    scope_id: "1",
                    channel_type: "mailto",
                    destination: email,
                  });

                  enqueueSnackbar("", {
                    content: () => (
                      <div className="p-4 bg-[#20242A] text-white rounded-lg text-sm">
                        OTP Sent successfully <br />
                      </div>
                    ),
                  });
                }}
              >
                Send an OTP
              </button>
            </div>
            <div>
              <OTPInput length={6} onChange={handleOTPChange} />
              <button
                className="w-full border border-1 rounded p-2 mt-10"
                onClick={async () => {
                  const response = await passport.getSession({
                    scope_id: "1",
                    verifier_type: "mailto",
                    code: otp,
                  });

                  console.log(response);
                  setSession(JSON.stringify(response.result));
                }}
              >
                Submit OTP
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

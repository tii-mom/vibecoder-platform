import './polyfill';

import { mnemonicToPrivateKey, keyPairFromSeed } from "@ton/crypto";
import { TonClient, WalletContractV4, internal } from "@ton/ton";
import { Address } from "@ton/core";

export interface Env {
  PLATFORM_PAYMASTER_PRIVATE_KEY: string; // Mnemonic (24 words) or 64-char Hex Seed
  TON_NETWORK: string;
  TONCENTER_API_KEY?: string;
  SIGNER_SECRET_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      const signerSecret = env.SIGNER_SECRET_KEY;
      if (!signerSecret) {
        return new Response(JSON.stringify({ success: false, error: "Server misconfiguration: SIGNER_SECRET_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
      const providedSecret = request.headers.get("X-Signer-Secret-Key");
      if (providedSecret !== signerSecret) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized: Invalid signer secret key" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }

      const clientNetwork = env.TON_NETWORK || "testnet";
      const secret = env.PLATFORM_PAYMASTER_PRIVATE_KEY;
      const isMockMode = !secret || !env.TONCENTER_API_KEY || env.TONCENTER_API_KEY.includes("mock");
      return new Response(JSON.stringify({
        success: true,
        data: {
          network: clientNetwork,
          isMock: isMockMode,
          canBroadcast: !isMockMode,
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (request.method !== "POST" || url.pathname !== "/sign-and-broadcast") {
      return new Response(JSON.stringify({ success: false, error: "Not Found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // 0. Verify Secret Token / Header for internal authentication
    const signerSecret = env.SIGNER_SECRET_KEY;
    if (!signerSecret) {
      return new Response(JSON.stringify({ success: false, error: "Server misconfiguration: SIGNER_SECRET_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const providedSecret = request.headers.get("X-Signer-Secret-Key");
    if (providedSecret !== signerSecret) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized: Invalid signer secret key" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    try {
      const { destination, amountNano } = await request.json() as any;

      if (!destination || !amountNano) {
        return new Response(JSON.stringify({ success: false, error: "destination and amountNano are required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }

      // 1. Check and parse the private key
      const secret = env.PLATFORM_PAYMASTER_PRIVATE_KEY;
      const clientNetwork = env.TON_NETWORK || "testnet";
      const isMainnet = clientNetwork === "mainnet";
      const isDev = !isMainnet;

      if (!secret || secret.trim() === "") {
        if (!isDev) {
          return new Response(JSON.stringify({ success: false, error: "Server misconfiguration: PLATFORM_PAYMASTER_PRIVATE_KEY not set (required in production)" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      }

      // Mainnet safeguard: reject weak/mock-like API keys before any signing
      if (isMainnet) {
        if (!env.TONCENTER_API_KEY || env.TONCENTER_API_KEY.includes("mock") || env.TONCENTER_API_KEY.includes("testing") || env.TONCENTER_API_KEY.includes("12345")) {
          return new Response(JSON.stringify({ success: false, error: "Mocking is disabled on mainnet" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      }

      let keyPair;
      if (!secret || secret.trim() === "") {
        console.warn("[Signer] No PLATFORM_PAYMASTER_PRIVATE_KEY configured. Using ephemeral mock key for dev/testnet.");
        const mockSeed = Buffer.alloc(32, 1);
        keyPair = await keyPairFromSeed(mockSeed);
      } else if (secret.includes(" ")) {
        // Treat as 24-word mnemonic
        keyPair = await mnemonicToPrivateKey(secret.split(/\s+/));
      } else {
        // Treat as 32-byte hex seed
        const seedBuffer = Buffer.from(secret, "hex");
        keyPair = await keyPairFromSeed(seedBuffer);
      }

      // 2. Setup TonClient & Wallet Contract
      const toncenterUrl = `https://${clientNetwork === "mainnet" ? "" : "testnet."}toncenter.com/api/v2/jsonRPC`;
      const tonClient = new TonClient({
        endpoint: toncenterUrl,
        apiKey: env.TONCENTER_API_KEY,
      });

      const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });

      console.log(`[Signer] Using wallet address: ${wallet.address.toString()}`);

      // 3. Mock logic for development or if TON network requests fail
      const isMockMode = !secret || !env.TONCENTER_API_KEY || env.TONCENTER_API_KEY.includes("mock");

      if (isMockMode && isMainnet) {
        return new Response(JSON.stringify({ success: false, error: "Mock signing is disabled on mainnet" }), { status: 500, headers: { "Content-Type": "application/json" } });
      }

      if (isMockMode) {
        console.log(`[Signer] Mock Mode enabled. Constructing transfer to ${destination} for ${amountNano} nanoTON without real network broadcast.`);

        // Simulating the transaction hashing/signing
        const mockSeqno = 42;
        const transfer = wallet.createTransfer({
          seqno: mockSeqno,
          secretKey: keyPair.secretKey,
          messages: [
            internal({
              to: Address.parse(destination),
              value: BigInt(amountNano),
              body: "VibeCoder Stars Paymaster",
              bounce: false,
            })
          ]
        });

        const mockHash = Buffer.alloc(32, Math.floor(Math.random() * 256)).toString("hex");
        return new Response(JSON.stringify({
          success: true,
          data: {
            walletAddress: wallet.address.toString(),
            seqno: mockSeqno,
            txHash: mockHash,
            isMock: true
          }
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // 4. Real network broadcast
      const contract = tonClient.open(wallet);
      const seqno = await contract.getSeqno();

      const transfer = wallet.createTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
          internal({
            to: Address.parse(destination),
            value: BigInt(amountNano),
            body: "VibeCoder Stars Paymaster",
            bounce: false,
          })
        ]
      });

      await contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
          internal({
            to: Address.parse(destination),
            value: BigInt(amountNano),
            body: "VibeCoder Stars Paymaster",
            bounce: false,
          })
        ]
      });

      // Simple wait & polling to verify seqno increment (best effort)
      let currentSeqno = seqno;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const newSeq = await contract.getSeqno();
        if (newSeq > currentSeqno) {
          console.log(`[Signer] Transfer broadcasted successfully. Seqno incremented to ${newSeq}`);
          break;
        }
      }

      // Compute tx hash from external message cell
      const messageCell = transfer;
      const txHash = messageCell.hash().toString("hex");

      return new Response(JSON.stringify({
        success: true,
        data: {
          walletAddress: wallet.address.toString(),
          seqno,
          txHash,
          isMock: false
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error: any) {
      console.error("[Signer] Transaction signing or broadcast failed:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};

/**
 * Test: Alice (Borrower) tạo khoản vay
 * Yêu cầu: Alice đã có NFT collateral (chạy mint-collateral-nft.ts trước)
 */

import "dotenv/config";
import { MeshWallet } from "@meshsdk/wallet";
import { resolvePaymentKeyHash } from "@meshsdk/core-cst";
import { NETWORK_ID, provider, getAliceMnemonic } from "../src/config.js";
import { createLoan } from "../src/lendingFunctions.js";

async function main() {
  console.log("=== Test: Create Loan ===\n");

  const nftPolicyId = process.env.NFT_POLICY_ID;
  const nftAssetNameHex = Buffer.from(process.env.NFT_ASSET_NAME ?? "CollateralNFT").toString("hex");

  if (!nftPolicyId) throw new Error("NFT_POLICY_ID not set. Run mint-collateral-nft.ts first.");

  const alice = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: getAliceMnemonic() },
  });

  const aliceAddress = await alice.getChangeAddress();
  console.log("Alice address:", aliceAddress);

  const txHash = await createLoan(alice, {
    principal: 10_000_000,       // 10 ADA
    interestRate: 500,           // 5%
    loanDuration: 60 * 60 * 1000, // 1 giờ (ms) — ngắn để test liquidate
    collateralPolicyId: nftPolicyId,
    collateralAssetName: nftAssetNameHex,
  });

  console.log("\n✅ Loan created!");
  console.log("Tx Hash:", txHash);
  console.log(`\nLưu txHash để dùng trong test-fund.ts: LOAN_TX_HASH=${txHash}`);
  console.log(`Xem: https://preview.cexplorer.io/tx/${txHash}`);
}

main().catch(console.error);

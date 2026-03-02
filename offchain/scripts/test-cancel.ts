/**
 * Test Kịch bản 3: Alice (Borrower) hủy khoản vay chưa có lender
 * Yêu cầu: LOAN_TX_HASH từ test-create.ts (khoản vay chưa được fund)
 */

import "dotenv/config";
import { MeshWallet } from "@meshsdk/wallet";
import { NETWORK_ID, provider, getAliceMnemonic } from "../src/config.js";
import { fetchLoans, cancelLoan } from "../src/lendingFunctions.js";

async function main() {
  console.log("=== Test: Cancel Loan (Kịch bản 3) ===\n");

  const targetTxHash = process.env.LOAN_TX_HASH;
  if (!targetTxHash) throw new Error("LOAN_TX_HASH not set. Run test-create.ts first.");

  const alice = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: getAliceMnemonic() },
  });

  const aliceAddress = await alice.getChangeAddress();
  console.log("Alice address:", aliceAddress);

  const loans = await fetchLoans(process.env.BLOCKFROST_API_KEY!);
  const loanUtxo = loans.find((l) => l.txHash === targetTxHash);
  if (!loanUtxo) throw new Error(`Loan UTxO ${targetTxHash} not found.`);
  if (loanUtxo.datum.status.type !== "Pending") {
    throw new Error(`Loan status is ${loanUtxo.datum.status.type}, not Pending. Cannot cancel.`);
  }

  console.log("Khoản vay đang ở Pending, tiến hành cancel...");

  const txHash = await cancelLoan(alice, loanUtxo);

  console.log("\n✅ Loan cancelled! Alice nhận lại collateral NFT.");
  console.log("Tx Hash:", txHash);
  console.log(`Xem: https://preview.cexplorer.io/tx/${txHash}`);
}

main().catch(console.error);

/**
 * Test: Bob (Lender) fund khoản vay của Alice
 * Yêu cầu: LOAN_TX_HASH từ test-create.ts
 */

import "dotenv/config";
import { MeshWallet } from "@meshsdk/wallet";
import { NETWORK_ID, provider, getBobMnemonic } from "../src/config.js";
import { fetchLoans, fundLoan } from "../src/lendingFunctions.js";

async function main() {
  console.log("=== Test: Fund Loan ===\n");

  const targetTxHash = process.env.LOAN_TX_HASH;
  if (!targetTxHash) throw new Error("LOAN_TX_HASH not set. Run test-create.ts first.");

  const bob = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: getBobMnemonic() },
  });

  const bobAddress = await bob.getChangeAddress();
  console.log("Bob address:", bobAddress);

  // Fetch loan từ script address
  const loans = await fetchLoans(process.env.BLOCKFROST_API_KEY!);
  const loanUtxo = loans.find((l) => l.txHash === targetTxHash);
  if (!loanUtxo) throw new Error(`Loan UTxO ${targetTxHash} not found. Wait for confirmation.`);

  console.log("\nLoan details:");
  console.log("  Status:    ", loanUtxo.datum.status.type);
  console.log("  Principal: ", loanUtxo.datum.principal / 1_000_000, "ADA");
  console.log("  Interest:  ", loanUtxo.datum.interest_rate / 100, "%");
  console.log("  Duration:  ", loanUtxo.datum.loan_duration / 3600000, "hours");

  const txHash = await fundLoan(bob, loanUtxo);

  console.log("\n✅ Loan funded!");
  console.log("Tx Hash:", txHash);
  console.log(`\nLưu để dùng trong test-repay.ts: ACTIVE_LOAN_TX_HASH=${txHash}`);
  console.log(`Xem: https://preview.cexplorer.io/tx/${txHash}`);
}

main().catch(console.error);

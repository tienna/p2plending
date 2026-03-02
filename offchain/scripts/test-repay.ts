/**
 * Test Kịch bản 1: Alice (Borrower) trả nợ trước deadline
 * Yêu cầu: ACTIVE_LOAN_TX_HASH từ test-fund.ts
 */

import "dotenv/config";
import { MeshWallet } from "@meshsdk/wallet";
import { NETWORK_ID, provider, getAliceMnemonic } from "../src/config.js";
import { fetchLoans, repayLoan } from "../src/lendingFunctions.js";

async function main() {
  console.log("=== Test: Repay Loan (Kịch bản 1) ===\n");

  const targetTxHash = process.env.ACTIVE_LOAN_TX_HASH;
  if (!targetTxHash) throw new Error("ACTIVE_LOAN_TX_HASH not set. Run test-fund.ts first.");

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

  const now = Date.now();
  const dueDate = loanUtxo.datum.due_date!;
  const timeLeft = Math.round((dueDate - now) / 60000);
  console.log(`Deadline: ${new Date(dueDate).toISOString()} (còn ${timeLeft} phút)`);
  if (now >= dueDate) throw new Error("Loan is already overdue! Cannot repay.");

  const interest = Math.floor(loanUtxo.datum.principal * loanUtxo.datum.interest_rate / 10000);
  console.log(`Tổng cần trả: ${(loanUtxo.datum.principal + interest) / 1_000_000} ADA`);

  const txHash = await repayLoan(alice, loanUtxo);

  console.log("\n✅ Loan repaid! Alice nhận lại collateral NFT.");
  console.log("Tx Hash:", txHash);
  console.log(`Xem: https://preview.cexplorer.io/tx/${txHash}`);
}

main().catch(console.error);

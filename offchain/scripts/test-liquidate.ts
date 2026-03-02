/**
 * Test Kịch bản 2: Bob (Lender) thanh lý khoản vay quá hạn
 * Yêu cầu: ACTIVE_LOAN_TX_HASH, khoản vay phải đã quá deadline
 */

import "dotenv/config";
import { MeshWallet } from "@meshsdk/wallet";
import { NETWORK_ID, provider, getBobMnemonic } from "../src/config.js";
import { fetchLoans, liquidateLoan } from "../src/lendingFunctions.js";

async function main() {
  console.log("=== Test: Liquidate Loan (Kịch bản 2) ===\n");

  const targetTxHash = process.env.ACTIVE_LOAN_TX_HASH;
  if (!targetTxHash) throw new Error("ACTIVE_LOAN_TX_HASH not set.");

  const bob = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: getBobMnemonic() },
  });

  const bobAddress = await bob.getChangeAddress();
  console.log("Bob address:", bobAddress);

  const loans = await fetchLoans(process.env.BLOCKFROST_API_KEY!);
  const loanUtxo = loans.find((l) => l.txHash === targetTxHash);
  if (!loanUtxo) throw new Error(`Loan UTxO ${targetTxHash} not found.`);

  const now = Date.now();
  const dueDate = loanUtxo.datum.due_date!;
  const overdueBy = Math.round((now - dueDate) / 60000);

  if (now <= dueDate) {
    const waitMinutes = Math.ceil((dueDate - now) / 60000);
    throw new Error(`Loan not yet overdue. Wait ${waitMinutes} more minutes.`);
  }

  console.log(`Loan đã quá hạn ${overdueBy} phút. Tiến hành liquidate...`);

  const txHash = await liquidateLoan(bob, loanUtxo);

  console.log("\n✅ Loan liquidated! Bob nhận collateral NFT.");
  console.log("Tx Hash:", txHash);
  console.log(`Xem: https://preview.cexplorer.io/tx/${txHash}`);
}

main().catch(console.error);

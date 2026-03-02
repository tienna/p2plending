/**
 * Deploy Lending Script as a Reference Script UTxO
 * Chạy: npm run deploy-ref
 * Kết quả: cập nhật REFERENCE_SCRIPT_TX_HASH và REFERENCE_SCRIPT_TX_INDEX vào .env
 *
 * Lý do: MeshSDK 1.9.0-beta có bug với MalformedScriptWitnesses khi embed script bytes
 * vào witness set cho Plutus V3. Giải pháp: dùng reference script (không cần embed bytes).
 */

import "dotenv/config";
import { MeshTxBuilder } from "@meshsdk/core";
import { MeshWallet } from "@meshsdk/wallet";
import { resolvePaymentKeyHash } from "@meshsdk/core-cst";
import { NETWORK_ID, LENDING_SCRIPT_CBOR, provider, getBobMnemonic } from "../src/config.js";

async function main() {
  console.log("=== Deploy Reference Script ===\n");

  // Dùng Bob để deploy (có ADA)
  const bob = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: getBobMnemonic() },
  });

  const bobAddress = await bob.getChangeAddress();
  const bobPkh = resolvePaymentKeyHash(bobAddress);
  console.log("Bob address:", bobAddress);

  const utxos = await bob.getUtxos();
  if (utxos.length === 0) throw new Error("No UTxOs in Bob's wallet");
  console.log("Bob UTxOs:", utxos.length);

  // Script size (bytes) = LENDING_SCRIPT_CBOR.length / 2
  const scriptSizeBytes = LENDING_SCRIPT_CBOR.length / 2;
  console.log("Script size:", scriptSizeBytes, "bytes");

  // Tính minADA cho output với reference script (~25 ADA là đủ an toàn)
  const minAda = 25_000_000; // 25 ADA

  // Deploy: txOut đến địa chỉ của Bob với script đính kèm như reference script
  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .txOut(bobAddress, [{ unit: "lovelace", quantity: String(minAda) }])
    .txOutReferenceScript(LENDING_SCRIPT_CBOR, "V3")
    .changeAddress(bobAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await bob.signTx(unsignedTx);
  const txHash = await bob.submitTx(signedTx);

  console.log("\n✅ Reference Script deployed!");
  console.log("Tx Hash:", txHash);
  console.log("Output Index: 0");
  console.log("\nCập nhật .env với:");
  console.log(`REFERENCE_SCRIPT_TX_HASH=${txHash}`);
  console.log(`REFERENCE_SCRIPT_TX_INDEX=0`);
  console.log(`\nXem: https://preview.cexplorer.io/tx/${txHash}`);
}

main().catch(console.error);

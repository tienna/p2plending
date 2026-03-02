import "dotenv/config";
import { MeshWallet } from "@meshsdk/wallet";
import { MeshTxBuilder } from "@meshsdk/core";
import { resolvePaymentKeyHash, parseDatumCbor, buildEnterpriseAddress, addressToBech32 } from "@meshsdk/core-cst";
import { resolveSlotNo } from "@meshsdk/common";
import { NETWORK_ID, LENDING_SCRIPT_CBOR, SCRIPT_ADDRESS, provider, getBobMnemonic } from "../src/config.js";

async function main() {
  const bob = new MeshWallet({
    networkId: NETWORK_ID, fetcher: provider, submitter: provider,
    key: { type: "mnemonic", words: getBobMnemonic() },
  });

  const loanTxHash = process.env.LOAN_TX_HASH!;
  const resp = await fetch(`https://cardano-preview.blockfrost.io/api/v0/addresses/${SCRIPT_ADDRESS}/utxos`,
    { headers: { project_id: process.env.BLOCKFROST_API_KEY! } });
  const utxoList = await resp.json() as any[];
  const loanUtxo = utxoList.find((u: any) => u.tx_hash === loanTxHash);
  if (!loanUtxo) throw new Error("Loan UTxO not found");

  const rawDatum = parseDatumCbor(loanUtxo.inline_datum) as any;
  const lenderAddress = await bob.getChangeAddress();
  const lenderPkh = resolvePaymentKeyHash(lenderAddress);
  const utxos = await bob.getUtxos();
  const collateralUtxos = await bob.getCollateral();

  const nowSlot = Number(resolveSlotNo("preview", Date.now()));
  const validFromSlot = nowSlot - 200;
  const dueDate = nowSlot + 3600;

  const newDatum = {
    constructor: 0,
    fields: [
      { bytes: rawDatum.fields[0].bytes },
      { constructor: 0, fields: [{ bytes: lenderPkh }] },
      { int: Number(rawDatum.fields[2].int) },
      { int: Number(rawDatum.fields[3].int) },
      { int: Number(rawDatum.fields[4].int) },
      { constructor: 0, fields: [{ int: dueDate }] },
      { bytes: rawDatum.fields[6].bytes },
      { bytes: rawDatum.fields[7].bytes },
      { constructor: 1, fields: [{ int: nowSlot }] },
    ]
  };

  const collateralUnit = rawDatum.fields[6].bytes + rawDatum.fields[7].bytes;
  const borrowerAddr = addressToBech32(buildEnterpriseAddress(NETWORK_ID, rawDatum.fields[0].bytes).toAddress());

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanTxHash, loanUtxo.output_index)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 0, fields: [] }, "JSON")
    .txInScript(LENDING_SCRIPT_CBOR)
    .txOut(SCRIPT_ADDRESS, [
      { unit: "lovelace", quantity: String(Number(rawDatum.fields[2].int) + 2000000) },
      { unit: collateralUnit, quantity: "1" },
    ])
    .txOutInlineDatumValue(newDatum, "JSON")
    .txOut(borrowerAddr, [{ unit: "lovelace", quantity: String(Number(rawDatum.fields[2].int)) }])
    .requiredSignerHash(lenderPkh)
    .txInCollateral(collateralUtxos[0].input.txHash, collateralUtxos[0].input.outputIndex)
    .invalidBefore(validFromSlot)
    .changeAddress(lenderAddress)
    .selectUtxosFrom(utxos)
    .complete();

  // Decode tx structure to find witness set
  const { Transaction } = await import("@meshsdk/core-cst");
  const tx = Transaction.fromCbor(unsignedTx as any);
  const witnessSet = tx.witnessSet();
  
  const v3Scripts = witnessSet.plutusV3Scripts();
  if (v3Scripts) {
    console.log("V3 scripts count:", v3Scripts.size());
    for (const s of v3Scripts.values()) {
      const scriptCbor = s.toCbor().toString();
      console.log("V3 script toCbor() length:", scriptCbor.length / 2, "bytes");
      console.log("V3 script toCbor() first 20 bytes:", scriptCbor.slice(0, 40));
      console.log("V3 script rawBytes() first 20 bytes:", s.rawBytes().slice(0, 40));
      console.log("V3 script hash:", s.hash().toString());
    }
  } else {
    console.log("NO V3 scripts in witness set!");
  }
  
  // Also check the raw witness CBOR
  const witnessHex = witnessSet.toCbor().toString();
  console.log("\nWitness set CBOR length:", witnessHex.length / 2, "bytes");
  // Find key 07 in witness map
  // CBOR map key 07 = 0x07
  const idx = witnessHex.indexOf("07590b4e"); // double-cbor would have this
  const idx2 = witnessHex.indexOf("07590b4b"); // single-cbor would have this  
  const idx3 = witnessHex.indexOf("07d90102"); // set tag
  console.log("Key 07 + double-cbor pattern (590b4e):", idx);
  console.log("Key 07 + single-cbor pattern (590b4b):", idx2);
  console.log("Key 07 + set tag pattern (d90102):", idx3);
  
  // Show the witness area around key 7
  const keyPattern = witnessHex.indexOf("07"); // rough search for key
  console.log("\nWitness hex sample (first 100 chars):", witnessHex.slice(0, 100));
}

main().catch(console.error);

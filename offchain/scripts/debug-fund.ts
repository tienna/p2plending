import "dotenv/config";
import { MeshWallet } from "@meshsdk/wallet";
import { MeshTxBuilder } from "@meshsdk/core";
import { resolvePaymentKeyHash, parseDatumCbor } from "@meshsdk/core-cst";
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
  console.log("Loan UTxO:", loanTxHash, "#", loanUtxo.output_index);
  
  const rawDatum = parseDatumCbor(loanUtxo.inline_datum);
  console.log("Datum fields count:", (rawDatum as any).fields.length);
  console.log("Datum status constructor:", (rawDatum as any).fields[8]?.constructor);

  const lenderAddress = await bob.getChangeAddress();
  const lenderPkh = resolvePaymentKeyHash(lenderAddress);
  const utxos = await bob.getUtxos();
  const collateralUtxos = await bob.getCollateral();
  console.log("Bob UTxOs:", utxos.length, "Collateral:", collateralUtxos.length);

  const nowSlot = Number(resolveSlotNo("preview", Date.now()));
  const validFromSlot = nowSlot - 200;
  const dueDate = nowSlot + 3600; // 1h from now
  console.log("nowSlot:", nowSlot, "validFrom:", validFromSlot, "dueDate:", dueDate);

  // Build new datum for Active state
  const newDatum = {
    constructor: 0,
    fields: [
      { bytes: (rawDatum as any).fields[0].bytes }, // borrower
      { constructor: 0, fields: [{ bytes: lenderPkh }] }, // lender (Some)
      { int: Number((rawDatum as any).fields[2].int) }, // principal
      { int: Number((rawDatum as any).fields[3].int) }, // interest_rate
      { int: Number((rawDatum as any).fields[4].int) }, // loan_duration
      { constructor: 0, fields: [{ int: dueDate }] }, // due_date (Some)
      { bytes: (rawDatum as any).fields[6].bytes }, // collateral_policy
      { bytes: (rawDatum as any).fields[7].bytes }, // collateral_name
      { constructor: 1, fields: [{ int: nowSlot }] }, // Active
    ]
  };

  const collateralUnit = (rawDatum as any).fields[6].bytes + (rawDatum as any).fields[7].bytes;
  const borrowerPkh = (rawDatum as any).fields[0].bytes;
  
  // Build borrower address from PKH
  const { buildEnterpriseAddress, addressToBech32 } = await import("@meshsdk/core-cst");
  const borrowerAddr = addressToBech32(buildEnterpriseAddress(NETWORK_ID, borrowerPkh).toAddress());
  
  console.log("\nBuilding tx...");
  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanTxHash, loanUtxo.output_index)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 0, fields: [] }, "JSON")
    .txInScript(LENDING_SCRIPT_CBOR)
    .txOut(SCRIPT_ADDRESS, [
      { unit: "lovelace", quantity: String(Number((rawDatum as any).fields[2].int) + 2000000) },
      { unit: collateralUnit, quantity: "1" },
    ])
    .txOutInlineDatumValue(newDatum, "JSON")
    .txOut(borrowerAddr, [{ unit: "lovelace", quantity: String(Number((rawDatum as any).fields[2].int)) }])
    .requiredSignerHash(lenderPkh)
    .txInCollateral(collateralUtxos[0].input.txHash, collateralUtxos[0].input.outputIndex)
    .invalidBefore(validFromSlot)
    .changeAddress(lenderAddress)
    .selectUtxosFrom(utxos)
    .complete();

  // Print witness set from CBOR
  console.log("\nTx CBOR length:", unsignedTx.length / 2, "bytes");
  console.log("Tx CBOR start:", unsignedTx.slice(0, 40));
  
  // The tx is [txBody, witnessSet, valid, auxData]
  // Look for key 07 (plutus v3 scripts) in the witness map
  // Search for pattern "07" after the body
  const witnessStart = unsignedTx.indexOf("a7"); // map header for witness 
  console.log("Looking for witness set in CBOR...");
  // Find key 07 (plutus v3 scripts) 
  const key7Pattern = "07"; // CBOR key 7
  console.log("Raw CBOR witness area (chars 200-600):", unsignedTx.slice(200, 600));
}

main().catch(console.error);

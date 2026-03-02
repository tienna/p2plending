/**
 * Script mint Collateral NFT cho ví Alice (Borrower)
 * Chạy: npm run mint-nft
 * Kết quả: NFT xuất hiện trong ví Alice, cập nhật NFT_POLICY_ID vào .env
 */

import "dotenv/config";
import { MeshTxBuilder } from "@meshsdk/core";
import { MeshWallet } from "@meshsdk/wallet";
import {
  resolvePaymentKeyHash,
  applyParamsToScript,
  resolvePlutusScriptAddress,
  deserializeBech32Address,
} from "@meshsdk/core-cst";
import { NFT_POLICY_CBOR, NFT_ASSET_NAME_HEX, NETWORK_ID, provider, getAliceMnemonic } from "../src/config.js";

async function main() {
  console.log("=== Mint Collateral NFT cho Alice ===\n");

  // Khởi tạo ví Alice (headless)
  const alice = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: getAliceMnemonic(),
    },
  });

  const aliceAddress = await alice.getChangeAddress();
  const alicePkh = resolvePaymentKeyHash(aliceAddress);
  console.log("Alice address:", aliceAddress);
  console.log("Alice PKH:   ", alicePkh);

  // Apply Alice PKH làm issuer parameter cho NFT policy
  // VerificationKeyHash = ByteArray → dùng "JSON" format với { bytes: "..." }
  const appliedNftCbor = applyParamsToScript(
    NFT_POLICY_CBOR,
    [{ bytes: alicePkh }],
    "JSON"
  );

  // Lấy policy ID (= script hash dạng hex từ bech32 address)
  const nftScriptBech32 = resolvePlutusScriptAddress(
    { code: appliedNftCbor, version: "V3" },
    NETWORK_ID
  );
  // Policy ID = payment script hash (28 bytes hex)
  const { scriptHash: nftPolicyId } = deserializeBech32Address(nftScriptBech32);
  console.log("NFT Policy ID:", nftPolicyId);
  console.log("NFT Asset Name (hex):", NFT_ASSET_NAME_HEX);
  console.log("NFT Unit:", nftPolicyId + NFT_ASSET_NAME_HEX);

  // Lấy UTxOs và collateral
  const utxos = await alice.getUtxos();
  const collateralUtxos = await alice.getCollateral();
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO - please set up collateral in wallet");
  if (utxos.length === 0) throw new Error("No UTxOs - please fund Alice's wallet first");

  console.log(`\nAlice có ${utxos.length} UTxO(s)`);

  // Mint 1 NFT
  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .mintPlutusScriptV3()
    .mint("1", nftPolicyId, NFT_ASSET_NAME_HEX)
    .mintingScript(appliedNftCbor)
    .mintRedeemerValue({ constructor: 0, fields: [] }, "JSON") // Void redeemer
    .txOut(aliceAddress, [
      { unit: "lovelace", quantity: "2000000" },
      { unit: nftPolicyId + NFT_ASSET_NAME_HEX, quantity: "1" },
    ])
    .requiredSignerHash(alicePkh)
    .txInCollateral(
      collateralUtxos[0].input.txHash,
      collateralUtxos[0].input.outputIndex
    )
    .changeAddress(aliceAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await alice.signTx(unsignedTx);
  const txHash = await alice.submitTx(signedTx);

  console.log("\n✅ Mint NFT thành công!");
  console.log("Tx Hash:", txHash);
  console.log("\nCập nhật .env với:");
  console.log(`NFT_POLICY_ID=${nftPolicyId}`);
  console.log(`NFT_ASSET_NAME=CollateralNFT`);
  console.log(`\nXem trên explorer: https://preview.cexplorer.io/tx/${txHash}`);
}

main().catch(console.error);

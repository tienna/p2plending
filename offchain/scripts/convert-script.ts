/**
 * Convert LENDING_SCRIPT_CBOR từ single-CBOR sang double-CBOR
 * Root cause: Aiken plutus.json compiledCode là single-CBOR (outer bytestring → flat bytes)
 * Nhưng Cardano node (Conway era) cần double-CBOR (outer bytestring → inner bytestring → flat bytes)
 * applyParamsToScript output luôn là double-CBOR → dùng để convert
 */
import { applyParamsToScript, resolvePlutusScriptAddress } from "@meshsdk/core-cst";
import { LENDING_SCRIPT_CBOR, NETWORK_ID } from "../src/config.js";

function analyzeCbor(hex: string) {
  const b0 = parseInt(hex.slice(0, 2), 16);
  let contentStart: string;
  if (b0 === 0x59) { contentStart = hex.slice(6); }
  else if (b0 === 0x58) { contentStart = hex.slice(4); }
  else { return "unknown format"; }
  const innerFirst = parseInt(contentStart.slice(0, 2), 16);
  if (innerFirst === 0x59 || innerFirst === 0x58 || (innerFirst >= 0x40 && innerFirst <= 0x57)) {
    return "DOUBLE CBOR";
  }
  return "SINGLE CBOR";
}

console.log("LENDING_SCRIPT_CBOR format:", analyzeCbor(LENDING_SCRIPT_CBOR));

// Try applying zero params — may get double-CBOR output
try {
  const withZeroParams = applyParamsToScript(LENDING_SCRIPT_CBOR, [], "JSON");
  console.log("\napplyParamsToScript with [] returns:", analyzeCbor(withZeroParams));
  console.log("  Length:", withZeroParams.length / 2, "bytes");
  console.log("  First 20 chars:", withZeroParams.slice(0, 40));

  // Compute new script address from double-CBOR
  const newAddress = resolvePlutusScriptAddress({ code: withZeroParams, version: "V3" }, NETWORK_ID);
  console.log("\nNew script address (from double-CBOR):", newAddress);

  const oldAddress = resolvePlutusScriptAddress({ code: LENDING_SCRIPT_CBOR, version: "V3" }, NETWORK_ID);
  console.log("Old script address (from single-CBOR):", oldAddress);

  console.log("\nAre they the same?", newAddress === oldAddress ? "YES ✓" : "NO ✗ (will need to redeploy loans)");
} catch (err) {
  console.log("\napplyParamsToScript with [] FAILED:", (err as Error).message);
}

// Alternative: manually wrap in another CBOR byte string
// LENDING_SCRIPT_CBOR = "590b4b..." (2894 bytes)
// Double-CBOR = writeByteString(Buffer.from(LENDING_SCRIPT_CBOR, 'hex')) = "590b4e590b4b..."
const scriptBytes = Buffer.from(LENDING_SCRIPT_CBOR, 'hex');
const outerLen = scriptBytes.length; // 2894
// Encode as CBOR byte string with 2-byte length (since > 255)
const doubleCbor = "59" + outerLen.toString(16).padStart(4, '0') + LENDING_SCRIPT_CBOR;
console.log("\nManual double-CBOR:", analyzeCbor(doubleCbor));
console.log("  Length:", doubleCbor.length / 2, "bytes");
console.log("  First 20 chars:", doubleCbor.slice(0, 40));

const doubleCborAddress = resolvePlutusScriptAddress({ code: doubleCbor, version: "V3" }, NETWORK_ID);
const singleCborAddress = resolvePlutusScriptAddress({ code: LENDING_SCRIPT_CBOR, version: "V3" }, NETWORK_ID);
console.log("\nAddress from manual double-CBOR:", doubleCborAddress);
console.log("Address from original single-CBOR:", singleCborAddress);
console.log("Same address?", doubleCborAddress === singleCborAddress ? "YES ✓" : "NO ✗");

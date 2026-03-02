import { applyParamsToScript } from "@meshsdk/core-cst";
import { LENDING_SCRIPT_CBOR, NFT_POLICY_CBOR } from "../src/config.js";

const dummyPkh = "a".repeat(56); // 28-byte placeholder PKH
const appliedCbor = applyParamsToScript(NFT_POLICY_CBOR, [{ bytes: dummyPkh }], "JSON");

function analyzeCbor(hex: string, name: string) {
  const b0 = parseInt(hex.slice(0, 2), 16);
  let outerLen: number, contentStart: string;
  if (b0 === 0x59) {
    outerLen = parseInt(hex.slice(2, 6), 16);
    contentStart = hex.slice(6);
  } else if (b0 === 0x58) {
    outerLen = parseInt(hex.slice(2, 4), 16);
    contentStart = hex.slice(4);
  } else {
    console.log(`${name}: Unknown format (starts with 0x${b0.toString(16)})`);
    return;
  }
  const innerFirst = parseInt(contentStart.slice(0, 2), 16);
  let isSingleCbor = true;
  let innerType = `0x${innerFirst.toString(16).padStart(2, '0')} (raw flat bytes)`;
  if (innerFirst === 0x59) { isSingleCbor = false; innerType = "0x59 → CBOR byte string → DOUBLE CBOR!"; }
  else if (innerFirst === 0x58) { isSingleCbor = false; innerType = "0x58 → CBOR byte string → DOUBLE CBOR!"; }
  else if (innerFirst >= 0x40 && innerFirst <= 0x57) { isSingleCbor = false; innerType = `0x${innerFirst.toString(16)} → CBOR short byte string → DOUBLE CBOR!`; }

  console.log(`\n${name}:`);
  console.log(`  Total hex len: ${hex.length / 2} bytes`);
  console.log(`  Outer CBOR: byte string of ${outerLen} bytes`);
  console.log(`  Inner first byte: ${innerType}`);
  console.log(`  → ${isSingleCbor ? 'SINGLE CBOR (node may reject!)' : 'DOUBLE CBOR (node accepts)'}`);
  console.log(`  First 20 hex chars: ${hex.slice(0, 40)}`);
}

analyzeCbor(LENDING_SCRIPT_CBOR, "LENDING_SCRIPT_CBOR (from config.ts)");
analyzeCbor(NFT_POLICY_CBOR, "NFT_POLICY_CBOR (original, from config.ts)");
analyzeCbor(appliedCbor, "NFT_POLICY after applyParamsToScript");

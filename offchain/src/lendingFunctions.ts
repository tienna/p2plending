import { MeshTxBuilder } from "@meshsdk/core";
import { MeshWallet } from "@meshsdk/wallet";
import { resolveSlotNo } from "@meshsdk/common";
import {
  resolvePaymentKeyHash,
  applyParamsToScript,
  resolvePlutusScriptAddress,
  parseDatumCbor,
  buildEnterpriseAddress,
  addressToBech32,
} from "@meshsdk/core-cst";
import {
  LENDING_SCRIPT_CBOR,
  NFT_POLICY_CBOR,
  SCRIPT_ADDRESS,
  NETWORK_ID,
  provider,
} from "./config.js";
import type { LoanDatum, LoanUtxo } from "./types.js";

// ============================================================
// Preview Testnet: slot ↔ POSIX ms conversion
// Genesis = 1666656000 Unix seconds, 1 slot = 1 second
// ============================================================
const PREVIEW_GENESIS_UNIX_S = 1666656000;

function slotToPosixMs(slot: number): number {
  return (PREVIEW_GENESIS_UNIX_S + slot) * 1000;
}

function posixMsToSlot(posixMs: number): number {
  return Math.floor(posixMs / 1000) - PREVIEW_GENESIS_UNIX_S;
}

// ============================================================
// 1. getScriptInfo
// ============================================================

/** Trả về script address và NFT policy CBOR đã apply params issuer PKH */
export function getScriptInfo(issuerPkh: string) {
  const appliedNftCbor = applyParamsToScript(
    NFT_POLICY_CBOR,
    [{ bytes: issuerPkh }],
    "JSON"
  );
  const nftScriptAddr = resolvePlutusScriptAddress(
    { code: appliedNftCbor, version: "V3" },
    NETWORK_ID
  );
  return {
    scriptAddress: SCRIPT_ADDRESS,
    nftScriptAddr,
    appliedNftCbor,
  };
}

// ============================================================
// 2. createLoan — Borrower tạo khoản vay
// ============================================================

export interface CreateLoanParams {
  principal: number;       // Lovelace
  interestRate: number;    // Basis points (500 = 5%)
  loanDuration: number;    // Milliseconds
  collateralPolicyId: string;
  collateralAssetName: string; // Hex
}

export async function createLoan(
  wallet: MeshWallet,
  params: CreateLoanParams
): Promise<string> {
  const { principal, interestRate, loanDuration, collateralPolicyId, collateralAssetName } = params;

  const borrowerAddress = await wallet.getChangeAddress();
  const borrowerPkh = resolvePaymentKeyHash(borrowerAddress);
  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();

  const collateralUnit = collateralPolicyId + collateralAssetName;
  const nftUtxo = utxos.find((u) =>
    u.output.amount.some((a) => a.unit === collateralUnit)
  );
  if (!nftUtxo) throw new Error(`NFT ${collateralUnit} not found in wallet`);
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO available");

  const datum: LoanDatum = {
    borrower: borrowerPkh,
    lender: null,
    principal,
    interest_rate: interestRate,
    loan_duration: loanDuration,
    due_date: null,
    collateral_policy: collateralPolicyId,
    collateral_name: collateralAssetName,
    status: { type: "Pending" },
  };

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .txIn(nftUtxo.input.txHash, nftUtxo.input.outputIndex)
    .txOut(SCRIPT_ADDRESS, [
      { unit: "lovelace", quantity: "2000000" },
      { unit: collateralUnit, quantity: "1" },
    ])
    .txOutInlineDatumValue(buildMeshDatum(datum), "JSON")
    .changeAddress(borrowerAddress)
    .selectUtxosFrom(utxos)
    .txInCollateral(
      collateralUtxos[0].input.txHash,
      collateralUtxos[0].input.outputIndex
    )
    .complete();

  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`[createLoan] tx: ${txHash}`);
  return txHash;
}

// ============================================================
// 3. fundLoan — Lender fund khoản vay
// ============================================================

export async function fundLoan(
  wallet: MeshWallet,
  loanUtxo: LoanUtxo
): Promise<string> {
  const loan = loanUtxo.datum;
  if (loan.status.type !== "Pending") throw new Error("Loan is not Pending");

  const lenderAddress = await wallet.getChangeAddress();
  const lenderPkh = resolvePaymentKeyHash(lenderAddress);
  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO available");

  // Slot number cho MeshSDK invalidBefore (trừ 200 slots buffer)
  const nowSlot = Number(resolveSlotNo("preview", Date.now()));
  const validFromSlot = nowSlot - 200;
  // POSIX ms tương ứng với validFromSlot — đây là giá trị contract thấy qua tx.validity_range
  const validFromPosixMs = slotToPosixMs(validFromSlot);
  // due_date = POSIX ms (loan_duration đã là ms)
  const dueDatePosixMs = validFromPosixMs + loan.loan_duration;

  const newDatum: LoanDatum = {
    ...loan,
    lender: lenderPkh,
    due_date: dueDatePosixMs,
    status: { type: "Active", funded_at: validFromPosixMs },
  };

  const collateralUnit = loan.collateral_policy + loan.collateral_name;
  const borrowerAddress = pkhToEnterpriseAddress(loan.borrower);

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanUtxo.txHash, loanUtxo.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 0, fields: [] }, "JSON") // Fund
    .txInScript(LENDING_SCRIPT_CBOR)
    // Script output: giữ collateral + thêm principal
    .txOut(SCRIPT_ADDRESS, [
      { unit: "lovelace", quantity: String(loan.principal + 2000000) },
      { unit: collateralUnit, quantity: "1" },
    ])
    .txOutInlineDatumValue(buildMeshDatum(newDatum), "JSON")
    // Borrower nhận principal
    .txOut(borrowerAddress, [
      { unit: "lovelace", quantity: String(loan.principal) },
    ])
    .requiredSignerHash(lenderPkh)
    .txInCollateral(
      collateralUtxos[0].input.txHash,
      collateralUtxos[0].input.outputIndex
    )
    .invalidBefore(validFromSlot)
    .changeAddress(lenderAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`[fundLoan] tx: ${txHash}`);
  return txHash;
}

// ============================================================
// 4. repayLoan — Borrower trả nợ
// ============================================================

export async function repayLoan(
  wallet: MeshWallet,
  loanUtxo: LoanUtxo
): Promise<string> {
  const loan = loanUtxo.datum;
  if (loan.status.type !== "Active") throw new Error("Loan is not Active");
  if (!loan.lender) throw new Error("No lender on loan");
  if (!loan.due_date) throw new Error("No due_date on loan");

  const borrowerAddress = await wallet.getChangeAddress();
  const borrowerPkh = resolvePaymentKeyHash(borrowerAddress);
  if (borrowerPkh !== loan.borrower) throw new Error("Wallet is not the borrower");

  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO available");

  const interest = Math.floor((loan.principal * loan.interest_rate) / 10000);
  const totalRepayment = loan.principal + interest;
  const collateralUnit = loan.collateral_policy + loan.collateral_name;
  const lenderAddress = pkhToEnterpriseAddress(loan.lender);
  // due_date trong datum là POSIX ms → chuyển về slot cho MeshSDK validity
  const dueDateSlot = posixMsToSlot(loan.due_date);
  const nowSlot = Number(resolveSlotNo("preview", Date.now()));
  const validFromSlot = nowSlot - 200;

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanUtxo.txHash, loanUtxo.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 1, fields: [] }, "JSON") // Repay
    .txInScript(LENDING_SCRIPT_CBOR)
    .txOut(lenderAddress, [
      { unit: "lovelace", quantity: String(totalRepayment) },
    ])
    .txOut(borrowerAddress, [
      { unit: collateralUnit, quantity: "1" },
      { unit: "lovelace", quantity: "2000000" },
    ])
    .requiredSignerHash(borrowerPkh)
    .txInCollateral(
      collateralUtxos[0].input.txHash,
      collateralUtxos[0].input.outputIndex
    )
    .invalidBefore(validFromSlot)
    .invalidHereafter(dueDateSlot - 1)
    .changeAddress(borrowerAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`[repayLoan] tx: ${txHash}`);
  return txHash;
}

// ============================================================
// 5. liquidateLoan — Lender thanh lý khoản vay quá hạn
// ============================================================

export async function liquidateLoan(
  wallet: MeshWallet,
  loanUtxo: LoanUtxo
): Promise<string> {
  const loan = loanUtxo.datum;
  if (loan.status.type !== "Active") throw new Error("Loan is not Active");
  if (!loan.lender) throw new Error("No lender on loan");
  if (!loan.due_date) throw new Error("No due_date on loan");

  const lenderAddress = await wallet.getChangeAddress();
  const lenderPkh = resolvePaymentKeyHash(lenderAddress);
  if (lenderPkh !== loan.lender) throw new Error("Wallet is not the lender");

  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO available");

  // due_date trong datum là POSIX ms → chuyển về slot cho MeshSDK validity
  const dueDateSlot = posixMsToSlot(loan.due_date);
  // Kiểm tra quá hạn bằng POSIX ms
  if (Date.now() <= loan.due_date) throw new Error("Loan is not overdue yet");

  const collateralUnit = loan.collateral_policy + loan.collateral_name;

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanUtxo.txHash, loanUtxo.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 2, fields: [] }, "JSON") // Liquidate
    .txInScript(LENDING_SCRIPT_CBOR)
    .txOut(lenderAddress, [
      { unit: collateralUnit, quantity: "1" },
      { unit: "lovelace", quantity: "2000000" },
    ])
    .requiredSignerHash(lenderPkh)
    .txInCollateral(
      collateralUtxos[0].input.txHash,
      collateralUtxos[0].input.outputIndex
    )
    .invalidBefore(dueDateSlot + 1)
    .changeAddress(lenderAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`[liquidateLoan] tx: ${txHash}`);
  return txHash;
}

// ============================================================
// 6. cancelLoan — Borrower hủy khoản vay chưa fund
// ============================================================

export async function cancelLoan(
  wallet: MeshWallet,
  loanUtxo: LoanUtxo
): Promise<string> {
  const loan = loanUtxo.datum;
  if (loan.status.type !== "Pending") throw new Error("Loan is not Pending");

  const borrowerAddress = await wallet.getChangeAddress();
  const borrowerPkh = resolvePaymentKeyHash(borrowerAddress);
  if (borrowerPkh !== loan.borrower) throw new Error("Wallet is not the borrower");

  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO available");

  const collateralUnit = loan.collateral_policy + loan.collateral_name;

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanUtxo.txHash, loanUtxo.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 3, fields: [] }, "JSON") // Cancel
    .txInScript(LENDING_SCRIPT_CBOR)
    .txOut(borrowerAddress, [
      { unit: collateralUnit, quantity: "1" },
      { unit: "lovelace", quantity: "2000000" },
    ])
    .requiredSignerHash(borrowerPkh)
    .txInCollateral(
      collateralUtxos[0].input.txHash,
      collateralUtxos[0].input.outputIndex
    )
    .changeAddress(borrowerAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  console.log(`[cancelLoan] tx: ${txHash}`);
  return txHash;
}

// ============================================================
// Fetch danh sách loans từ script address qua Blockfrost
// ============================================================

export async function fetchLoans(blockfrostApiKey: string): Promise<LoanUtxo[]> {
  const url = `https://cardano-preview.blockfrost.io/api/v0/addresses/${SCRIPT_ADDRESS}/utxos`;
  const response = await fetch(url, {
    headers: { project_id: blockfrostApiKey },
  });
  if (!response.ok) return [];

  const utxos = (await response.json()) as Array<{
    tx_hash: string;
    output_index: number;
    amount: Array<{ unit: string; quantity: string }>;
    inline_datum: string | null;
  }>;

  const loans: LoanUtxo[] = [];
  for (const utxo of utxos) {
    if (!utxo.inline_datum) continue;
    try {
      const rawDatum = parseDatumCbor(utxo.inline_datum);
      const datum = parseLoanDatum(rawDatum);
      const lovelaceAmount = utxo.amount.find((a) => a.unit === "lovelace");
      loans.push({
        txHash: utxo.tx_hash,
        outputIndex: utxo.output_index,
        datum,
        lovelace: lovelaceAmount?.quantity ?? "0",
        assets: utxo.amount.filter((a) => a.unit !== "lovelace"),
      });
    } catch {
      // Skip UTxOs với datum không nhận ra
    }
  }
  return loans;
}

// ============================================================
// HELPERS
// ============================================================

/** Parse raw Plutus Data JSON → LoanDatum TypeScript interface
 *  parseDatumCbor returns constructor/int as strings ("0", "10000000")
 *  so use == (loose equality) for comparison and Number() for conversion */
function parseLoanDatum(raw: any): LoanDatum {
  const f = raw.fields;
  const borrower = f[0].bytes as string;
  // eslint-disable-next-line eqeqeq
  const lender = f[1].constructor == 0 ? (f[1].fields[0].bytes as string) : null;
  const principal = Number(f[2].int);
  const interest_rate = Number(f[3].int);
  const loan_duration = Number(f[4].int);
  // eslint-disable-next-line eqeqeq
  const due_date = f[5].constructor == 0 ? Number(f[5].fields[0].int) : null;
  const collateral_policy = f[6].bytes as string;
  const collateral_name = f[7].bytes as string;
  const statusRaw = f[8];
  // eslint-disable-next-line eqeqeq
  const status =
    statusRaw.constructor == 0
      ? ({ type: "Pending" } as const)
      : ({ type: "Active", funded_at: Number(statusRaw.fields[0].int) } as const);
  return { borrower, lender, principal, interest_rate, loan_duration, due_date, collateral_policy, collateral_name, status };
}

/** Build Mesh constructor datum từ LoanDatum TypeScript object */
function buildMeshDatum(loan: LoanDatum) {
  const statusConstructor =
    loan.status.type === "Pending"
      ? { constructor: 0, fields: [] }
      : { constructor: 1, fields: [{ int: loan.status.funded_at }] };

  return {
    constructor: 0,
    fields: [
      { bytes: loan.borrower },
      loan.lender !== null
        ? { constructor: 0, fields: [{ bytes: loan.lender }] }
        : { constructor: 1, fields: [] },
      { int: loan.principal },
      { int: loan.interest_rate },
      { int: loan.loan_duration },
      loan.due_date !== null
        ? { constructor: 0, fields: [{ int: loan.due_date }] }
        : { constructor: 1, fields: [] },
      { bytes: loan.collateral_policy },
      { bytes: loan.collateral_name },
      statusConstructor,
    ],
  };
}

/** Construct enterprise address (bech32) từ payment key hash */
function pkhToEnterpriseAddress(pkh: string): string {
  const addr = buildEnterpriseAddress(NETWORK_ID, pkh);
  return addressToBech32(addr.toAddress());
}

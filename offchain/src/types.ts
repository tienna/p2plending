// ============================================================
// TypeScript types tương ứng với Aiken LoanDatum / LoanStatus
// ============================================================

export type LoanStatus =
  | { type: "Pending" }
  | { type: "Active"; funded_at: number };

export interface LoanDatum {
  borrower: string;           // VerificationKeyHash hex
  lender: string | null;      // VerificationKeyHash hex, null khi chưa fund
  principal: number;          // Lovelace
  interest_rate: number;      // Basis points (500 = 5%)
  loan_duration: number;      // Milliseconds
  due_date: number | null;    // POSIX timestamp ms, null khi chưa fund
  collateral_policy: string;  // PolicyId hex
  collateral_name: string;    // AssetName hex
  status: LoanStatus;
}

// UTxO chứa một khoản vay (dùng cho UI và test scripts)
export interface LoanUtxo {
  txHash: string;
  outputIndex: number;
  datum: LoanDatum;
  lovelace: string;
  assets: Array<{ unit: string; quantity: string }>;
}

use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval.{Finite}
use cardano/address.{VerificationKey}
use cardano/assets.{AssetName, PolicyId, Value, flatten, from_asset, from_lovelace, merge, quantity_of}
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}

// ============================================================
// TYPES
// ============================================================

/// # P2P Lending Smart Contract
///
/// Smart contract cho P2P lending platform trên Cardano (Aiken v1.1.2 / stdlib v2 compatible).
///
pub type LoanStatus {
  Pending
  Active { funded_at: Int }
  // funded_at = POSIX milliseconds (từ tx.validity_range.lower_bound.bound_type)
}

pub type LoanDatum {
  /// Người vay
  borrower: VerificationKeyHash,
  /// Người cho vay (None nếu chưa funded)
  lender: Option<VerificationKeyHash>,
  /// Số tiền vay (Lovelace)
  principal: Int,
  /// Lãi suất (basis points, e.g. 500 = 5%)
  interest_rate: Int,
  /// Thời hạn vay (milliseconds)
  loan_duration: Int,
  /// Deadline để repay (POSIX milliseconds, None khi chưa funded)
  due_date: Option<Int>,
  /// Policy ID của Collateral NFT
  collateral_policy: PolicyId,
  /// Asset name của Collateral NFT
  collateral_name: AssetName,
  // ⚠️ Không dùng collateral: Value vì Value là opaque type trong stdlib v2
  // → không thể dùng làm datum field. Thay bằng PolicyId + AssetName,
  //   sau đó construct lại Value bên trong validator bằng from_asset().
  /// Trạng thái
  status: LoanStatus,
}

pub type LoanRedeemer {
  Fund
  Repay
  Liquidate
  Cancel
}

// ============================================================
// VALIDATOR
// ============================================================

validator p2p_lending {
  spend(
    datum: Option<LoanDatum>,
    redeemer: LoanRedeemer,
    _output_reference: OutputReference,
    tx: Transaction,
  ) {
    expect Some(loan) = datum
    when redeemer is {
      Fund -> validate_fund(loan, tx)
      Repay -> validate_repay(loan, tx)
      Liquidate -> validate_liquidate(loan, tx)
      Cancel -> validate_cancel(loan, tx)
    }
  }

  else(_) {
    fail
  }
}

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

fn validate_fund(loan: LoanDatum, tx: Transaction) -> Bool {
  expect Pending = loan.status

  // Continuing script output phải là output đầu tiên (convention)
  expect Some(continuing_output) = list.head(tx.outputs)
  expect InlineDatum(raw_datum) = continuing_output.datum
  expect new_datum: LoanDatum = raw_datum
  expect Some(lender) = new_datum.lender

  // current_time = POSIX milliseconds (từ tx.validity_range.lower_bound.bound_type)
  // Off-chain: slotToPosixMs(validFromSlot) = (PREVIEW_GENESIS_UNIX_S + slot) * 1000
  expect Finite(current_time) = tx.validity_range.lower_bound.bound_type
  let expected_due_date = current_time + loan.loan_duration

  // Script output phải chứa: principal ADA + 1 collateral NFT
  let collateral_value = from_asset(loan.collateral_policy, loan.collateral_name, 1)
  let min_locked = merge(from_lovelace(loan.principal), collateral_value)

  and {
    // Lender phải ký giao dịch
    list.has(tx.extra_signatories, lender),
    // Datum mới phải phản ánh trạng thái Active
    new_datum.status == Active { funded_at: current_time },
    new_datum.due_date == Some(expected_due_date),
    new_datum.lender == Some(lender),
    new_datum.borrower == loan.borrower,
    new_datum.principal == loan.principal,
    new_datum.interest_rate == loan.interest_rate,
    new_datum.collateral_policy == loan.collateral_policy,
    new_datum.collateral_name == loan.collateral_name,
    // Script output phải có đủ giá trị
    value_has_at_least(continuing_output.value, min_locked),
  }
}

fn validate_repay(loan: LoanDatum, tx: Transaction) -> Bool {
  expect Active { .. } = loan.status
  expect Some(lender) = loan.lender
  expect Some(due_date) = loan.due_date

  // Phải trả trước deadline (due_date = POSIX ms)
  expect Finite(lower_bound) = tx.validity_range.lower_bound.bound_type

  let interest = loan.principal * loan.interest_rate / 10000
  let total_repayment = loan.principal + interest
  let collateral_value = from_asset(loan.collateral_policy, loan.collateral_name, 1)

  and {
    // Borrower ký giao dịch
    list.has(tx.extra_signatories, loan.borrower),
    // Phải còn trong hạn
    lower_bound < due_date,
    // Lender nhận đủ gốc + lãi
    payment_to_pkh(tx.outputs, lender, from_lovelace(total_repayment)),
    // Borrower nhận lại collateral
    payment_to_pkh(tx.outputs, loan.borrower, collateral_value),
  }
}

fn validate_liquidate(loan: LoanDatum, tx: Transaction) -> Bool {
  expect Active { .. } = loan.status
  expect Some(lender) = loan.lender
  expect Some(due_date) = loan.due_date

  // Phải sau deadline (due_date = POSIX ms)
  expect Finite(lower_bound) = tx.validity_range.lower_bound.bound_type

  let collateral_value = from_asset(loan.collateral_policy, loan.collateral_name, 1)

  and {
    // Lender ký giao dịch
    list.has(tx.extra_signatories, lender),
    // Phải quá hạn
    lower_bound > due_date,
    // Lender nhận collateral
    payment_to_pkh(tx.outputs, lender, collateral_value),
  }
}

fn validate_cancel(loan: LoanDatum, tx: Transaction) -> Bool {
  expect Pending = loan.status

  let collateral_value = from_asset(loan.collateral_policy, loan.collateral_name, 1)

  and {
    // Borrower ký giao dịch
    list.has(tx.extra_signatories, loan.borrower),
    // Borrower nhận lại collateral
    payment_to_pkh(tx.outputs, loan.borrower, collateral_value),
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/// Kiểm tra value có chứa ít nhất min_value không
fn value_has_at_least(value: Value, min_value: Value) -> Bool {
  flatten(min_value)
    |> list.all(
        fn(item) {
          let (policy_id, asset_name, min_qty) = item
          quantity_of(value, policy_id, asset_name) >= min_qty
        },
      )
}

/// Kiểm tra có output nào gửi đủ min_value đến địa chỉ của pkh không
fn payment_to_pkh(
  outputs: List<Output>,
  pkh: VerificationKeyHash,
  min_value: Value,
) -> Bool {
  list.any(
    outputs,
    fn(output) {
      when output.address.payment_credential is {
        VerificationKey(cred_pkh) ->
          and {
            cred_pkh == pkh,
            value_has_at_least(output.value, min_value),
          }
        _ -> False
      }
    },
  )
}

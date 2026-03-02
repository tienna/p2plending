use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval
use cardano/assets
use cardano/transaction.{OutputReference, Transaction}

/// # Hello World Validator
/// 
/// Validator đơn giản nhất để học Aiken (v1.1.2 compatible).
/// 
/// ## Logic:
/// - Datum chứa địa chỉ owner
/// - Redeemer yêu cầu message "Hello, World!"
/// - Chỉ owner mới có thể spend UTXO
///

pub type Datum {
  /// Public key hash của owner
  owner: VerificationKeyHash,
}

pub type Redeemer {
  /// Message phải là "Hello, World!"
  message: ByteArray,
}

/// Validator chính
validator hello_world {
  spend(
    datum: Option<Datum>,
    redeemer: Redeemer,
    _output_reference: OutputReference,
    tx: Transaction,
  ) {
    // Extract datum - fail nếu không có
    expect Some(Datum { owner }) = datum
    
    // Validation conditions
    and {
      // Message phải chính xác
      redeemer.message == "Hello, World!",
      // Transaction phải được sign bởi owner
      list.has(tx.extra_signatories, owner),
    }
  }
}

// ============================================================
// TESTS
// ============================================================

test hello_world_success() {
  let datum = Datum { owner: #"abc123" }
  let redeemer = Redeemer { message: "Hello, World!" }
  
  // Mock transaction với signature
  let tx = Transaction {
    ..mock_tx(),
    extra_signatories: [#"abc123"],
  }
  
  hello_world.spend(Some(datum), redeemer, mock_outref(), tx)
}

test hello_world_fails_wrong_message() fail {
  let datum = Datum { owner: #"abc123" }
  let redeemer = Redeemer { message: "Wrong message" }
  
  let tx = Transaction {
    ..mock_tx(),
    extra_signatories: [#"abc123"],
  }
  
  hello_world.spend(Some(datum), redeemer, mock_outref(), tx)
}

test hello_world_fails_no_signature() fail {
  let datum = Datum { owner: #"abc123" }
  let redeemer = Redeemer { message: "Hello, World!" }
  
  // Transaction không có signature
  let tx = Transaction {
    ..mock_tx(),
    extra_signatories: [],
  }
  
  hello_world.spend(Some(datum), redeemer, mock_outref(), tx)
}

// Mock helpers
fn mock_tx() -> Transaction {
  Transaction {
    inputs: [],
    reference_inputs: [],
    outputs: [],
    fee: assets.zero(),
    mint: assets.zero(),
    certificates: [],
    withdrawals: dict.new(),
    validity_range: interval.everything(),
    extra_signatories: [],
    redeemers: dict.new(),
    datums: dict.new(),
    id: #"tx_id",
  }
}

fn mock_outref() -> OutputReference {
  OutputReference {
    transaction_id: #"tx_id",
    output_index: 0,
  }
}

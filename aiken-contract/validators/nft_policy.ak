use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}

// ============================================================
// NFT Minting Policy cho Collateral
// ============================================================
// Policy parameterized bởi issuer (Alice's PKH).
// Chỉ cho phép mint khi issuer ký giao dịch.

validator nft_policy(issuer: VerificationKeyHash) {
  mint(
    _redeemer: Void,
    _policy_id: PolicyId,
    tx: Transaction,
  ) {
    list.has(tx.extra_signatories, issuer)
  }

  else(_) {
    fail
  }
}

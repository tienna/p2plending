use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{AssetName, PolicyId, quantity_of}
use cardano/transaction.{Input, OutputReference, Transaction}

/// # NFT Minting Policy
/// 
/// Minting policy cho NFTs với các đặc điểm:
/// - Chỉ issuer mới có thể mint/burn
/// - Mỗi NFT là unique (quantity = 1 cho mint, -1 cho burn)
/// - Sử dụng UTXO để đảm bảo uniqueness (optional for basic policy)
/// - Tài liệu phù hợp với Aiken v1.1.2 và stdlib v2
///
/// ## Parameters:
/// - `issuer`: Public key hash của người được phép mint
///
/// ## Redeemer actions:
/// - `Mint`: Mint NFT mới
/// - `Burn`: Burn NFT hiện có
pub type MintRedeemer {
  Mint { asset_name: AssetName, output_reference: OutputReference }
  Burn { asset_name: AssetName }
}

/// NFT Minting Policy - parameterized by issuer
validator nft_policy(issuer: VerificationKeyHash) {
  mint(redeemer: MintRedeemer, policy_id: PolicyId, tx: Transaction) {
    // Kiểm tra signature của issuer
    let signed_by_issuer = list.has(tx.extra_signatories, issuer)
    when redeemer is {
      // === MINT NFT ===
      Mint { asset_name, output_reference } -> {
        // Kiểm tra UTXO được spend trong tx này để đảm bảo uniqueness
        let has_utxo_spent =
          list.any(
            tx.inputs,
            fn(input) { input.output_reference == output_reference },
          )
        // Lấy số lượng được mint cho asset cụ thể
        let minted_qty = quantity_of(tx.mint, policy_id, asset_name)
        and {
          // Quantity của NFT phải là 1
          minted_qty == 1,
          // UTXO reference phải được spend (đảm bảo unique)
          has_utxo_spent,
          // Transaction phải được sign bởi issuer
          signed_by_issuer,
        }
      }
      // === BURN NFT ===
      Burn { asset_name } -> {
        // Lấy số lượng được burn (phải là -1)
        let minted_qty = quantity_of(tx.mint, policy_id, asset_name)
        and {
          // Quantity phải là -1 (burning)
          minted_qty == -1,
          // Phải được sign bởi issuer
          signed_by_issuer,
        }
      }
    }
  }

  else(_) {
    fail
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/// Helper: Kiểm tra xem có UTXO cụ thể được spend không
pub fn is_utxo_spent(tx: Transaction, output_reference: OutputReference) -> Bool {
  list.any(tx.inputs, fn(input) { input.output_reference == output_reference })
}

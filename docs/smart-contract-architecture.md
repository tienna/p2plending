# Kiến Trúc Smart Contract — P2P Lending dApp

## Tổng quan

Smart contract được viết bằng **Aiken v1.1.2**, biên dịch sang **Plutus V3** (Conway era), triển khai trên **Cardano Preview Testnet**. Gồm 2 validators:

| Validator | File | Mục đích |
|---|---|---|
| `p2p_lending` | `validators/p2p_lending.ak` | Quản lý toàn bộ vòng đời khoản vay |
| `nft_policy` | `validators/nft_policy.ak` | Mint collateral NFT cho borrower |

---

## 1. Mô hình dữ liệu (Datum)

### `LoanDatum`

```aiken
pub type LoanDatum {
  borrower:         VerificationKeyHash,  -- PKH của người vay
  lender:           Option<VerificationKeyHash>,  -- PKH người cho vay (None khi Pending)
  principal:        Int,     -- Số tiền vay (Lovelace)
  interest_rate:    Int,     -- Lãi suất basis points (500 = 5%)
  loan_duration:    Int,     -- Thời hạn (milliseconds)
  due_date:         Option<Int>,  -- Deadline POSIX ms (None khi Pending)
  collateral_policy: PolicyId,    -- Policy ID của NFT collateral
  collateral_name:  AssetName,    -- Asset name của NFT collateral
  status:           LoanStatus,
}
```

> **Lưu ý quan trọng:** `due_date` và `funded_at` được lưu dưới dạng **POSIX milliseconds** — khớp với giá trị mà Aiken đọc từ `tx.validity_range.lower_bound.bound_type`. Không lưu slot number.

### `LoanStatus`

```aiken
pub type LoanStatus {
  Pending                     -- Chờ lender fund
  Active { funded_at: Int }   -- Đang hoạt động (funded_at = POSIX ms khi fund)
}
```

### `LoanRedeemer`

```aiken
pub type LoanRedeemer {
  Fund       -- Lender cấp vốn
  Repay      -- Borrower trả nợ
  Liquidate  -- Lender tịch thu collateral (quá hạn)
  Cancel     -- Borrower huỷ khoản vay chưa fund
}
```

---

## 2. Validator chính: `p2p_lending`

Script address (Preview Testnet): `addr_test1wplp8rxeay0960r07nvywnnwmtpj43du7v2lqkmu8rqsy8qjhkjmx`

Mô hình: **1 UTxO = 1 khoản vay**. Mỗi UTxO tại script address chứa:
- **Value**: Collateral NFT (trạng thái Pending) + Collateral NFT + principal ADA (trạng thái Active)
- **Inline Datum**: `LoanDatum` mô tả đầy đủ điều khoản khoản vay

### 2.1 Redeemer `Fund` — Lender cấp vốn

**Điều kiện:** Trạng thái phải là `Pending`.

**Xác thực:**
1. Lender ký giao dịch (`list.has(tx.extra_signatories, lender)`)
2. Output đầu tiên của tx phải là script output mới (continuing output)
3. Datum mới phải phản ánh `Active { funded_at: current_time }` với `current_time` = POSIX ms từ `invalidBefore`
4. `due_date` mới = `current_time + loan_duration`
5. Các trường bất biến (borrower, principal, interest_rate, collateral_*) không thay đổi
6. Script output phải chứa: `principal ADA + 1 collateral NFT` (kiểm tra bằng `value_has_at_least`)

```
[Pending UTxO: NFT]  →  [Active UTxO: NFT + principal ADA]
         ↑ Lender bỏ principal vào
```

### 2.2 Redeemer `Repay` — Borrower trả nợ

**Điều kiện:** Trạng thái phải là `Active`, giao dịch phải trong hạn (`lower_bound < due_date`).

**Xác thực:**
1. Borrower ký giao dịch
2. Validity range: `lower_bound < due_date` (POSIX ms)
3. Lender nhận đủ `principal + interest` (Lovelace)
4. Borrower nhận lại collateral NFT

```
interest = principal × interest_rate / 10000
total_repayment = principal + interest
```

```
[Active UTxO: NFT + principal]  →  Lender nhận: total_repayment ADA
                                   Borrower nhận: NFT (collateral)
```

### 2.3 Redeemer `Liquidate` — Lender tịch thu collateral

**Điều kiện:** Trạng thái phải là `Active`, giao dịch phải sau hạn (`lower_bound > due_date`).

**Xác thực:**
1. Lender ký giao dịch
2. Validity range: `lower_bound > due_date` (POSIX ms)
3. Lender nhận collateral NFT

```
[Active UTxO: NFT + principal]  →  Lender nhận: NFT (tịch thu collateral)
                                   (principal ADA cũng về lender do không có output ràng buộc)
```

### 2.4 Redeemer `Cancel` — Borrower huỷ khoản vay

**Điều kiện:** Trạng thái phải là `Pending`.

**Xác thực:**
1. Borrower ký giao dịch
2. Borrower nhận lại collateral NFT

```
[Pending UTxO: NFT]  →  Borrower nhận lại: NFT
```

---

## 3. Validator phụ: `nft_policy`

**Parameterized by:** `issuer: VerificationKeyHash` (PKH của Alice/Borrower)

```aiken
validator nft_policy(issuer: VerificationKeyHash) {
  mint(_redeemer: Void, _policy_id: PolicyId, tx: Transaction) {
    list.has(tx.extra_signatories, issuer)
  }
}
```

- **Policy ID** được tính từ script hash sau khi apply `issuer` param
- Mỗi borrower có policy ID riêng (vì issuer PKH khác nhau)
- **Không phải one-shot policy**: có thể mint nhiều NFT từ cùng policy, chỉ cần issuer ký

---

## 4. Helper Functions

### `value_has_at_least`

Kiểm tra một `Value` có chứa tối thiểu `min_value`:

```aiken
fn value_has_at_least(value: Value, min_value: Value) -> Bool {
  flatten(min_value)
    |> list.all(fn(item) {
        let (policy_id, asset_name, min_qty) = item
        quantity_of(value, policy_id, asset_name) >= min_qty
      })
}
```

### `payment_to_pkh`

Kiểm tra có output nào gửi đủ `min_value` đến địa chỉ `pkh`:

```aiken
fn payment_to_pkh(outputs, pkh, min_value) -> Bool {
  list.any(outputs, fn(output) {
    when output.address.payment_credential is {
      VerificationKey(cred_pkh) ->
        cred_pkh == pkh && value_has_at_least(output.value, min_value)
      _ -> False
    }
  })
}
```

---

## 5. Vòng đời khoản vay

```
                    ┌──────────────────────────────────┐
                    │         SCRIPT ADDRESS             │
                    │                                    │
  Borrower ──────►  │  [Pending UTxO]                   │
  (createLoan)      │   Datum: status=Pending            │
                    │   Value: NFT                       │
                    │                                    │
                    │         ↓ Fund (Lender)            │
                    │                                    │
  Lender ────────►  │  [Active UTxO]                    │
  (fundLoan)        │   Datum: status=Active{funded_at}  │
                    │   Value: NFT + principal ADA       │
                    │                                    │
                    │    ↙ Repay         ↘ Liquidate    │
                    │   (trước hạn)      (sau hạn)       │
                    └──────────────────────────────────┘
                           ↓                    ↓
                   Borrower nhận NFT    Lender nhận NFT
                   Lender nhận ADA     (+ ADA không bị ràng buộc)
```

**Kịch bản Cancel:** Borrower cancel Pending UTxO bất kỳ lúc nào trước khi lender fund.

---

## 6. Thông tin kỹ thuật

| Thông số | Giá trị |
|---|---|
| Ngôn ngữ | Aiken v1.1.2 |
| Plutus version | V3 (Conway era) |
| Stdlib | aiken-lang/stdlib v2.1.0 |
| Network | Cardano Preview Testnet |
| CBOR format | Double-CBOR (bắt buộc cho Conway node) |
| Script CBOR | Xem `offchain/src/config.ts` → `LENDING_SCRIPT_CBOR` |
| Compiled output | `aiken-contract/plutus.json` |

### Lưu ý Conway Era

Raw `compiledCode` từ `plutus.json` là **single-CBOR**. Conway node yêu cầu **double-CBOR**. Script CBOR trong `config.ts` đã được convert sang double-CBOR bằng cách prepend CBOR length header.

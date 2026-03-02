---
name: MeshTransaction
description: Cardano transaction building with @meshsdk/transaction
version: 1.9.0
triggers:
  - mesh
  - meshsdk
  - meshtxbuilder
  - cardano transaction
  - cardano tx
  - plutus script
  - minting tokens
  - stake delegation
  - drep
  - governance vote
---

# Mesh SDK Transaction Skill

AI-assisted Cardano transaction building using `MeshTxBuilder` from `@meshsdk/transaction`.

## Package Info

```bash
npm install @meshsdk/transaction
# or
npm install @meshsdk/core  # includes transaction + wallet + provider
```

## Quick Reference

| Task | Method Chain |
|------|--------------|
| Send ADA | `txIn() -> txOut() -> changeAddress() -> complete()` |
| Mint tokens (Plutus) | `mintPlutusScriptV2() -> mint() -> mintingScript() -> mintRedeemerValue() -> ...` |
| Mint tokens (Native) | `mint() -> mintingScript() -> ...` |
| Script spending | `spendingPlutusScriptV2() -> txIn() -> txInScript() -> txInDatumValue() -> txInRedeemerValue() -> ...` |
| Stake delegation | `delegateStakeCertificate(rewardAddress, poolId)` |
| Withdraw rewards | `withdrawal(rewardAddress, coin) -> withdrawalScript() -> withdrawalRedeemerValue()` |
| Governance vote | `vote(voter, govActionId, votingProcedure)` |
| DRep registration | `drepRegistrationCertificate(drepId, anchor?, deposit?)` |

## Constructor Options

```typescript
import { MeshTxBuilder } from '@meshsdk/transaction';

const txBuilder = new MeshTxBuilder({
  fetcher?: IFetcher,      // For querying UTxOs (e.g., BlockfrostProvider)
  submitter?: ISubmitter,  // For submitting transactions
  evaluator?: IEvaluator,  // For script execution cost estimation
  serializer?: IMeshTxSerializer,  // Custom serializer
  selector?: IInputSelector,       // Custom coin selection
  isHydra?: boolean,       // Hydra L2 mode (zero fees)
  params?: Partial<Protocol>,  // Custom protocol parameters
  verbose?: boolean,       // Enable logging
});
```

## Completion Methods

| Method | Async | Balanced | Use Case |
|--------|-------|----------|----------|
| `complete()` | Yes | Yes | Production - auto coin selection, fee calculation |
| `completeSync()` | No | No | Testing - requires manual inputs/fee |
| `completeUnbalanced()` | No | No | Partial build for inspection |
| `completeSigning()` | No | N/A | Add signatures after complete() |

## Key Concepts

### Fluent API
All methods return `this` for chaining:
```typescript
txBuilder
  .txIn(hash, index)
  .txOut(address, amount)
  .changeAddress(addr)
  .complete();
```

### Script Versions
- `spendingPlutusScriptV1/V2/V3()` - Set before `txIn()` for script inputs
- `mintPlutusScriptV1/V2/V3()` - Set before `mint()` for Plutus minting
- `withdrawalPlutusScriptV1/V2/V3()` - Set before `withdrawal()` for script withdrawals
- `votePlutusScriptV1/V2/V3()` - Set before `vote()` for script votes

### Data Types
Datum and redeemer values accept three formats:
- `"Mesh"` (default) - Mesh Data type
- `"JSON"` - Raw constructor format
- `"CBOR"` - Hex-encoded CBOR string

### Reference Scripts
Use `*TxInReference()` methods to reference scripts stored on-chain instead of including them in the transaction (reduces tx size/fees).

## Validity Interval & Time

### invalidBefore / invalidHereafter nhận SLOT NUMBER

```typescript
import { resolveSlotNo } from '@meshsdk/common';

// ⚠️ invalidBefore(slot) và invalidHereafter(slot) dùng SLOT NUMBER, không phải POSIX ms
const nowSlot = Number(resolveSlotNo("preview", Date.now()));

// Buffer 200 slots: local clock thường nhanh hơn network tip → tránh OutsideValidityIntervalUTxO
const validFromSlot = nowSlot - 200;

txBuilder
  .invalidBefore(validFromSlot)        // slot number
  .invalidHereafter(deadlineSlot - 1)  // slot number
```

### Slot ↔ POSIX ms (Preview Testnet)

```typescript
// Preview genesis = 1666656000 Unix seconds, 1 slot = 1 second
const PREVIEW_GENESIS_UNIX_S = 1666656000;

const slotToPosixMs = (slot: number) => (PREVIEW_GENESIS_UNIX_S + slot) * 1000;
const posixMsToSlot = (posixMs: number) => Math.floor(posixMs / 1000) - PREVIEW_GENESIS_UNIX_S;
```

> **Tại sao cần convert?** Aiken contract đọc `tx.validity_range.lower_bound.bound_type` là
> **POSIX milliseconds**. Nếu datum lưu `funded_at` hoặc `due_date` (thời gian), phải lưu
> POSIX ms (không phải slot). Sau đó dùng `posixMsToSlot()` để tính slot cho `invalidHereafter`.

### Pattern cho script spending với deadline

```typescript
// fundLoan: lưu POSIX ms vào datum
const validFromSlot = Number(resolveSlotNo("preview", Date.now())) - 200;
const validFromPosixMs = slotToPosixMs(validFromSlot);
// datum.funded_at = validFromPosixMs
// datum.due_date = validFromPosixMs + loan_duration_ms

// repayLoan: convert due_date POSIX ms → slot cho invalidHereafter
const dueDateSlot = posixMsToSlot(loan.due_date);
txBuilder.invalidBefore(validFromSlot).invalidHereafter(dueDateSlot - 1)

// liquidateLoan: invalidBefore phải sau due_date; check overdue dùng Date.now()
const dueDateSlot = posixMsToSlot(loan.due_date);
if (Date.now() <= loan.due_date) throw new Error("Loan is not overdue yet");
txBuilder.invalidBefore(dueDateSlot + 1)
```

## Important Notes

1. **Change address required** - `complete()` fails without `changeAddress()`
2. **Collateral required** - Luôn cần `.txInCollateral()` khi tương tác với Smart Contract.
3. **Required Signer** - Dùng `.requiredSignerHash(pkh)` nếu Smart Contract kiểm tra chữ ký (extra signatories).
4. **Order matters** - Call `spendingPlutusScriptV3()` BEFORE `txIn()` cho script inputs, và `mintPlutusScriptV3()` BEFORE `mint()` cho script minting.
5. **Coin selection** - Cung cấp UTxOs qua `selectUtxosFrom()` để tự động chọn phí và collateral.
6. **ESM Requirement** - Mesh SDK v1.9+ chạy tốt nhất trong môi trường ESM (`"type": "module"` trong `package.json`).
7. **Validity interval dùng slot number** — `invalidBefore(slot)` và `invalidHereafter(slot)` nhận slot number, KHÔNG phải POSIX ms. Dùng `resolveSlotNo("preview", Date.now())` từ `@meshsdk/common`.
8. **200-slot timing buffer** — Trừ 200 slots để tránh `OutsideValidityIntervalUTxO`: `validFromSlot = nowSlot - 200`. Local clock thường chạy nhanh hơn network tip.

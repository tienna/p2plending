# Kiến Trúc Ứng Dụng — P2P Lending dApp

## Tổng quan hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGƯỜI DÙNG                               │
│                (Borrower / Lender — dùng browser)                │
└─────────────────────────┬───────────────────────────────────────┘
                           │  HTTP / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ WalletContext│  │  Components  │  │  lib/lendingFunctions  │ │
│  │  (State Mgmt)│  │  (React UI)  │  │  (Tx Builder - client) │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                           │                        │             │
└───────────────────────────┼────────────────────────┼─────────────┘
                            │ CIP-30 API             │ REST API
                            ▼                        ▼
               ┌────────────────────┐    ┌───────────────────────┐
               │  Cardano Wallet    │    │   Blockfrost API      │
               │  (Browser Extension│    │   (Blockchain Index)  │
               │   Eternl / Nami)   │    │   preview.blockfrost  │
               └────────────────────┘    └───────────┬───────────┘
                            │                        │
                            │                        ▼
                            │           ┌───────────────────────┐
                            └──────────►│  Cardano Preview Node │
                            (submit tx) │  (Blockchain Network) │
                                        └───────────────────────┘
```

---

## Các lớp công nghệ

### Frontend

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Framework | Next.js 16.1.6 (App Router) | Server-side routing, bundling |
| UI Library | React 19.2.3 | Component-based UI |
| Styling | Tailwind CSS v4 | Utility-first styling |
| Language | TypeScript 5 | Type safety |
| Wallet SDK | `@meshsdk/wallet` — `BrowserWallet` | Kết nối ví browser (CIP-30) |
| Tx Builder | `@meshsdk/transaction` — `MeshTxBuilder` | Build Plutus transactions |
| Blockchain | `@meshsdk/core-cst` | Hashing, address resolution, CBOR |
| Provider | `BlockfrostProvider` | Query UTxOs, submit transactions |

### Offchain Scripts (CLI)

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Runtime | Node.js + `tsx` | Chạy TypeScript trực tiếp |
| Wallet | `@meshsdk/wallet` — `MeshWallet` | Ví headless (mnemonic) |
| Provider | `BlockfrostProvider` | Query & submit |
| Scripts | `offchain/scripts/*.ts` | E2E test từng thao tác |

### Smart Contract

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Language | Aiken v1.1.2 | Compile sang Plutus V3 |
| Plutus | V3 (Conway era) | On-chain execution |
| Stdlib | aiken-lang/stdlib v2.1.0 | Utilities |

### Blockchain Infrastructure

| Thành phần | Mô tả |
|---|---|
| Cardano Preview Testnet | Mạng test (networkId = 0) |
| Blockfrost | REST API để query UTxOs, datum, submit tx |

---

## Không có Backend truyền thống

Đây là một **dApp hoàn toàn phi tập trung**:

- **Không có server/database riêng.** Trạng thái toàn bộ lưu trên blockchain (UTxOs tại script address).
- **Blockfrost** đóng vai trò "backend" — cung cấp REST API để frontend đọc trạng thái blockchain và submit transactions.
- **Smart contract** là logic nghiệp vụ — thực thi hoàn toàn on-chain, không thể bị thay đổi sau khi deploy.

---

## Cấu trúc thư mục

```
00P2pLending/
├── aiken-contract/          # Smart contract source
│   ├── validators/
│   │   ├── p2p_lending.ak   # Lending validator
│   │   └── nft_policy.ak    # NFT minting policy
│   └── plutus.json          # Compiled output (CBOR)
│
├── frontend/                # Next.js web app
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Single-page app
│   ├── components/
│   │   ├── WalletConnect.tsx   # Connect/disconnect ví
│   │   ├── CreateLoanPanel.tsx # Form tạo khoản vay
│   │   ├── LoanListPanel.tsx   # Danh sách khoản vay
│   │   ├── LoanCard.tsx        # Card từng khoản vay + actions
│   │   └── TxToast.tsx         # Toast thông báo tx
│   ├── context/
│   │   └── WalletContext.tsx   # Global wallet state
│   └── lib/
│       └── lendingFunctions.ts # Tx building logic (client-side)
│
└── offchain/                # CLI testing scripts
    ├── src/
    │   ├── config.ts        # Script CBOR, provider, network config
    │   ├── lendingFunctions.ts  # Tx building logic (server-side)
    │   └── types.ts         # TypeScript types
    └── scripts/             # E2E test scripts
```

---

## Luồng dữ liệu khi người dùng thao tác

### 1. Kết nối ví

```
User click "Connect Wallet"
    → WalletConnect component hiển thị dropdown danh sách ví
    → User chọn ví (Eternl / Nami)
    → BrowserWallet.enable(walletId)          [CIP-30 API]
    → Browser extension popup yêu cầu quyền
    → User approve
    → w.getChangeAddress() → address
    → resolvePaymentKeyHash(address) → pkh
    → WalletContext cập nhật { wallet, address, pkh, networkId }
    → Toàn bộ components re-render với trạng thái ví mới
```

### 2. Xem danh sách khoản vay (Loan Market)

```
LoanListPanel mount
    → fetchLoans() được gọi
    → BlockfrostProvider.fetchAddressUTxOs(SCRIPT_ADDRESS)  [REST API]
    → Blockfrost trả về: [{txHash, outputIndex, amount, inlineDatum}]
    → parseDatumCbor(inlineDatum) → LoanDatum (TypeScript object)
    → Filter Pending / Active
    → Render LoanCard[] với dữ liệu datum
    → Auto-refresh mỗi 30 giây (setInterval)
```

### 3. Tạo khoản vay (Create Loan)

```
User điền form: principal, interest_rate, loan_duration, collateral NFT
    → handleSubmit()
    → createLoan(wallet, params)                 [lib/lendingFunctions.ts]
        ├─ wallet.getUtxos()                     [Blockfrost API qua BrowserWallet]
        ├─ wallet.getCollateral()                [Blockfrost API]
        ├─ Xây dựng LoanDatum { status: Pending, lender: None, ... }
        ├─ MeshTxBuilder
        │     .txIn(utxo)                        -- Input để trả phí
        │     .txOut(SCRIPT_ADDRESS, [NFT])      -- Gửi NFT vào script
        │     .txOutInlineDatumValue(datum)      -- Gắn datum inline
        │     .txInCollateral(collateralUtxo)    -- Collateral for Plutus
        │     .requiredSignerHash(borrowerPkh)   -- Borrower ký
        │     .selectUtxosFrom(utxos)
        │     .changeAddress(borrowerAddress)
        │     .complete()                        -- Auto coin selection + fee
        ├─ wallet.signTx(unsignedTx)             [Browser extension popup]
        └─ wallet.submitTx(signedTx)             [Submit qua Blockfrost]
    → txHash trả về
    → TxToast hiển thị link Cexplorer
    → Chuyển về tab "Loan Market"
    → LoanListPanel refresh sau 5 giây
```

### 4. Fund khoản vay (Lender)

```
Lender nhìn thấy LoanCard với status Pending
    → Click "Fund Loan"
    → fundLoan(wallet, loanUtxo)               [lib/lendingFunctions.ts]
        ├─ wallet.getUtxos() + getCollateral()
        ├─ Tính validFromSlot = nowSlot - 200   -- 200-slot buffer
        ├─ validFromPosixMs = slotToPosixMs(validFromSlot)
        ├─ Xây dựng newDatum: { status: Active{funded_at: posixMs},
        │                        due_date: posixMs + loan_duration,
        │                        lender: lenderPkh, ... }
        ├─ MeshTxBuilder
        │     .spendingPlutusScriptV3()
        │     .txIn(loanUtxo.txHash, outputIndex)  -- Spend script UTxO
        │     .txInScript(LENDING_SCRIPT_CBOR)      -- Attach script
        │     .txInInlineDatumPresent()
        │     .txInRedeemerValue({ constructor: 1, fields: [] })  -- Fund
        │     .txOut(SCRIPT_ADDRESS, [NFT + principal ADA])       -- New UTxO
        │     .txOutInlineDatumValue(newDatum)
        │     .invalidBefore(validFromSlot)
        │     .requiredSignerHash(lenderPkh)
        │     .txInCollateral(collateralUtxo)
        │     .complete()
        ├─ wallet.signTx() + submitTx()
    → LoanCard cập nhật sang Active
```

### 5. Trả nợ (Borrower Repay)

```
Borrower nhìn thấy Active loan của mình, deadline chưa qua
    → Click "Repay X.XX ADA"
    → repayLoan(wallet, loanUtxo)
        ├─ Tính interest = principal × interest_rate / 10000
        ├─ total_repayment = principal + interest
        ├─ dueDateSlot = posixMsToSlot(loan.due_date)
        ├─ MeshTxBuilder
        │     .spendingPlutusScriptV3()
        │     .txIn(loanUtxo)                        -- Spend Active UTxO
        │     .txInScript(LENDING_SCRIPT_CBOR)
        │     .txInInlineDatumPresent()
        │     .txInRedeemerValue(Repay)
        │     .txOut(lenderAddress, [total_repayment ADA])   -- Lender nhận
        │     .txOut(borrowerAddress, [NFT])                 -- Borrower nhận collateral
        │     .invalidBefore(validFromSlot)
        │     .invalidHereafter(dueDateSlot - 1)     -- Phải trước deadline
        │     .requiredSignerHash(borrowerPkh)
        │     .complete()
        └─ signTx() + submitTx()
```

### 6. Liquidate (Lender) / Cancel (Borrower)

Tương tự pattern trên — spend script UTxO với redeemer tương ứng (`Liquidate` / `Cancel`), kèm validity range phù hợp.

---

## State Management

Ứng dụng **không dùng Redux hay Zustand**. State được quản lý bằng:

1. **`WalletContext`** (React Context): Lưu trữ `wallet`, `address`, `pkh`, `networkId` — global, dùng được ở mọi component.
2. **Local state trong component**: `loading`, `error`, danh sách `loans` trong `LoanListPanel`.
3. **Blockchain là nguồn sự thật duy nhất**: Sau mỗi transaction thành công, `LoanListPanel` re-fetch từ Blockfrost (với delay 5 giây để đợi indexing).

---

## Ví dùng trong ứng dụng

| Context | Loại ví | Cách hoạt động |
|---|---|---|
| Frontend | `BrowserWallet` (CIP-30) | Extension browser (Eternl, Nami) sign tx qua popup |
| Offchain scripts | `MeshWallet` (headless) | Mnemonic trong `.env`, sign tự động (headless) |

**CIP-30 flow:** Frontend không bao giờ biết private key. Wallet extension giữ key, chỉ nhận unsigned tx CBOR và trả về signed tx CBOR sau khi user approve.

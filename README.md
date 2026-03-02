# P2P Lending dApp on Cardano

Decentralized peer-to-peer lending platform built on **Cardano Preview Testnet** using **Aiken V3 smart contracts** and **MeshJS**. Borrowers lock NFT collateral on-chain; lenders fund loans trustlessly — no intermediaries, all logic enforced by smart contract.

![Cardano](https://img.shields.io/badge/Cardano-Preview_Testnet-0033AD?logo=cardano)
![Aiken](https://img.shields.io/badge/Smart_Contract-Aiken_v1.1.2-purple)
![Plutus](https://img.shields.io/badge/Plutus-V3_(Conway)-blue)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-black?logo=next.js)
![MeshJS](https://img.shields.io/badge/SDK-MeshJS_1.9-green)

---

## Features

| Chức năng | Mô tả |
|---|---|
| **Create Loan** | Borrower khóa NFT collateral vào smart contract, đặt điều khoản vay |
| **Fund Loan** | Lender cấp ADA, kích hoạt khoản vay; borrower nhận ADA ngay lập tức |
| **Repay** | Borrower trả gốc + lãi trước deadline → nhận lại NFT collateral |
| **Liquidate** | Lender tịch thu NFT collateral nếu borrower không trả đúng hạn |
| **Cancel** | Borrower huỷ khoản vay chưa được fund → nhận lại NFT |

---

## Architecture Overview

```
┌─────────────┐   CIP-30    ┌──────────────────┐   REST API   ┌─────────────────┐
│   Browser   │ ──────────► │  Next.js Frontend │ ──────────► │  Blockfrost API │
│  (Eternl /  │             │  (React + MeshJS) │             │  (Blockchain    │
│   Nami)     │ ◄────────── │                   │ ◄────────── │   Indexer)      │
└─────────────┘  sign tx    └──────────────────┘   UTxO data  └────────┬────────┘
                                                                        │
                                                              ┌─────────▼────────┐
                                                              │  Cardano Preview │
                                                              │  Testnet (Node)  │
                                                              │                  │
                                                              │  Script Address: │
                                                              │  addr_test1w...  │
                                                              └──────────────────┘
```

**Không có backend server.** Toàn bộ trạng thái lưu trên blockchain — Blockfrost cung cấp REST API để đọc/ghi, smart contract Aiken thực thi logic nghiệp vụ on-chain.

---

## Smart Contract

**Validators** (`aiken-contract/validators/`):

### `p2p_lending.ak` — Lending Validator

Quản lý toàn bộ vòng đời khoản vay qua 4 redeemers:

```
[Pending UTxO: NFT]
       │
       ├─ Cancel (borrower) → Borrower nhận lại NFT
       │
       └─ Fund (lender) → [Active UTxO: NFT + principal ADA]
                                  │
                                  ├─ Repay (trước hạn) → Lender nhận ADA, Borrower nhận NFT
                                  └─ Liquidate (sau hạn) → Lender nhận NFT
```

**Datum (`LoanDatum`):**

```aiken
pub type LoanDatum {
  borrower:          VerificationKeyHash,
  lender:            Option<VerificationKeyHash>,
  principal:         Int,           -- Lovelace
  interest_rate:     Int,           -- basis points (500 = 5%)
  loan_duration:     Int,           -- milliseconds
  due_date:          Option<Int>,   -- POSIX milliseconds
  collateral_policy: PolicyId,
  collateral_name:   AssetName,
  status:            LoanStatus,    -- Pending | Active { funded_at }
}
```

### `nft_policy.ak` — NFT Minting Policy

Policy parameterized bởi issuer PKH — chỉ borrower mới có thể mint NFT collateral.

---

## Project Structure

```
p2plending/
│
├── aiken-contract/                 # Smart contract (Aiken)
│   ├── validators/
│   │   ├── p2p_lending.ak          # Lending validator (Fund/Repay/Liquidate/Cancel)
│   │   └── nft_policy.ak           # NFT minting policy
│   ├── plutus.json                 # Compiled Plutus scripts (CBOR)
│   └── aiken.toml                  # Project manifest (v1.1.2, Plutus V3)
│
├── frontend/                       # Next.js web app
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Single-page app (Navbar + Hero + Tabs)
│   ├── components/
│   │   ├── WalletConnect.tsx       # Kết nối ví Cardano (CIP-30)
│   │   ├── CreateLoanPanel.tsx     # Form tạo khoản vay
│   │   ├── LoanListPanel.tsx       # Danh sách Pending / Active loans
│   │   ├── LoanCard.tsx            # Card hiển thị + thao tác từng khoản vay
│   │   └── TxToast.tsx             # Toast thông báo sau giao dịch
│   ├── context/
│   │   └── WalletContext.tsx       # Global wallet state (React Context)
│   ├── lib/
│   │   └── lendingFunctions.ts     # Tx builder: createLoan, fundLoan, repayLoan...
│   └── .env.local.example          # Template biến môi trường frontend
│
├── offchain/                       # CLI scripts (TypeScript, headless)
│   ├── src/
│   │   ├── config.ts               # Script CBOR, provider, network config
│   │   ├── lendingFunctions.ts     # Core tx building functions
│   │   └── types.ts                # TypeScript types (LoanDatum, LoanUtxo)
│   ├── scripts/
│   │   ├── mint-collateral-nft.ts  # Mint NFT collateral cho borrower
│   │   ├── test-create.ts          # E2E: Tạo khoản vay
│   │   ├── test-fund.ts            # E2E: Fund khoản vay
│   │   ├── test-repay.ts           # E2E: Trả nợ
│   │   ├── test-liquidate.ts       # E2E: Tịch thu collateral
│   │   └── test-cancel.ts          # E2E: Huỷ khoản vay
│   └── .env.example                # Template biến môi trường offchain
│
├── docs/                           # Tài liệu kỹ thuật
│   ├── smart-contract-architecture.md
│   ├── app-architecture.md
│   ├── installation.md
│   └── user-guide.md
│
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | [Aiken](https://aiken-lang.org) v1.1.2 — Plutus V3 (Conway era) |
| Frontend | [Next.js](https://nextjs.org) 16 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Cardano SDK | [MeshJS](https://meshjs.dev) v1.9.0-beta |
| Blockchain API | [Blockfrost](https://blockfrost.io) (Preview Testnet) |
| Wallet Support | Eternl, Nami (CIP-30) |

---

## Quick Start

### 1. Clone & cài dependencies

```bash
git clone https://github.com/tienna/p2plending.git
cd p2plending

# Frontend
cd frontend && npm install && cd ..

# Offchain scripts
cd offchain && npm install && cd ..
```

### 2. Cấu hình môi trường

```bash
# Frontend
cp frontend/.env.local.example frontend/.env.local
# Điền NEXT_PUBLIC_BLOCKFROST_API_KEY

# Offchain
cp offchain/.env.example offchain/.env
# Điền BLOCKFROST_API_KEY, ALICE_MNEMONIC, BOB_MNEMONIC
```

> Lấy API key miễn phí tại [blockfrost.io](https://blockfrost.io) → tạo project **Preview**.

### 3. Chạy Frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

### 4. (Tùy chọn) Chạy E2E test với CLI scripts

```bash
cd offchain

# Mint NFT collateral cho Alice
npm run mint-nft
# → Copy NFT_POLICY_ID vào .env

# Test vòng đời khoản vay
npm run test:create        # Tạo loan → lấy LOAN_TX_HASH
LOAN_TX_HASH=<hash> npm run test:fund    # Fund
LOAN_TX_HASH=<hash> npm run test:repay  # Repay
```

---

## Loan Lifecycle

```
Borrower                    Smart Contract                    Lender
   │                             │                               │
   │── createLoan() ────────────►│ [Pending UTxO]               │
   │   (lock NFT collateral)     │  Value: NFT                  │
   │                             │  Datum: { status: Pending }  │
   │                             │                               │
   │                             │◄──────────── fundLoan() ─────│
   │◄── nhận principal ADA ──────│ [Active UTxO]                │
   │                             │  Value: NFT + principal ADA  │
   │                             │  Datum: { status: Active,    │
   │                             │           due_date: ... }    │
   │                             │                               │
   │── repayLoan() ─────────────►│ (if before due_date)         │
   │   (principal + interest)    │──── lender nhận ADA ────────►│
   │◄── nhận NFT collateral ─────│                               │
   │                             │                               │
   │                             │ (if after due_date)           │
   │                             │◄──────── liquidate() ─────────│
   │                             │──── lender nhận NFT ─────────►│
```

---

## Docs

- [Smart Contract Architecture](docs/smart-contract-architecture.md)
- [App Architecture & Data Flow](docs/app-architecture.md)
- [Installation Guide](docs/installation.md)
- [User Guide](docs/user-guide.md)

---

## License

MIT

---

*Built with Aiken + MeshJS · Cardano Preview Testnet · with love ❤️ from [Cardano2vn](https://cardano2vn.io)*

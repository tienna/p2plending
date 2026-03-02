# P2P Lending dApp trên Cardano

Nền tảng cho vay ngang hàng phi tập trung xây dựng trên **Cardano Preview Testnet** sử dụng **Aiken V3 smart contract** và **MeshJS**. Người vay khóa NFT làm tài sản đảm bảo on-chain; người cho vay cấp vốn không cần bên thứ ba — toàn bộ logic được thực thi bởi smart contract.

![Cardano](https://img.shields.io/badge/Cardano-Preview_Testnet-0033AD?logo=cardano)
![Aiken](https://img.shields.io/badge/Smart_Contract-Aiken_v1.1.2-purple)
![Plutus](https://img.shields.io/badge/Plutus-V3_(Conway)-blue)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-black?logo=next.js)
![MeshJS](https://img.shields.io/badge/SDK-MeshJS_1.9-green)

---

## Tính năng

| Chức năng | Mô tả |
|---|---|
| **Tạo khoản vay** | Người vay khóa NFT tài sản đảm bảo vào smart contract, đặt điều khoản vay |
| **Cấp vốn** | Người cho vay chuyển ADA, kích hoạt khoản vay; người vay nhận ADA ngay lập tức |
| **Trả nợ** | Người vay hoàn trả gốc + lãi trước hạn → nhận lại NFT tài sản đảm bảo |
| **Tịch thu tài sản** | Người cho vay thu hồi NFT nếu người vay không trả đúng hạn |
| **Huỷ khoản vay** | Người vay huỷ khoản vay chưa được cấp vốn → nhận lại NFT |

---

## Kiến trúc tổng quan

```
┌─────────────┐   CIP-30    ┌──────────────────┐   REST API   ┌─────────────────┐
│  Trình duyệt│ ──────────► │ Frontend Next.js  │ ──────────► │  Blockfrost API │
│  (Eternl /  │             │  (React + MeshJS) │             │  (Blockchain    │
│   Nami)     │ ◄────────── │                   │ ◄────────── │   Indexer)      │
└─────────────┘  ký giao dịch└──────────────────┘  dữ liệu UTxO└────────┬────────┘
                                                                          │
                                                              ┌───────────▼──────────┐
                                                              │  Cardano Preview     │
                                                              │  Testnet (Node)      │
                                                              │                      │
                                                              │  Script Address:     │
                                                              │  addr_test1w...      │
                                                              └──────────────────────┘
```

**Không có backend server riêng.** Toàn bộ trạng thái ứng dụng được lưu trên blockchain — Blockfrost cung cấp REST API để đọc/ghi dữ liệu, smart contract Aiken thực thi logic nghiệp vụ hoàn toàn on-chain.

---

## Smart Contract

**Validators** (`aiken-contract/validators/`):

### `p2p_lending.ak` — Lending Validator

Quản lý toàn bộ vòng đời khoản vay thông qua 4 redeemers:

```
[UTxO Pending: NFT]
       │
       ├─ Cancel (người vay) → Người vay nhận lại NFT
       │
       └─ Fund (người cho vay) → [UTxO Active: NFT + ADA gốc]
                                          │
                                          ├─ Repay (trước hạn) → Người cho vay nhận ADA, người vay nhận lại NFT
                                          └─ Liquidate (sau hạn) → Người cho vay nhận NFT
```

**Cấu trúc dữ liệu (`LoanDatum`):**

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

Policy được tham số hoá bởi PKH của người phát hành — chỉ người vay mới có thể mint NFT tài sản đảm bảo.

---

## Cấu trúc thư mục

```
p2plending/
│
├── aiken-contract/                 # Smart contract (Aiken)
│   ├── validators/
│   │   ├── p2p_lending.ak          # Lending validator (Fund/Repay/Liquidate/Cancel)
│   │   └── nft_policy.ak           # NFT minting policy
│   ├── plutus.json                 # Plutus scripts đã biên dịch (CBOR)
│   └── aiken.toml                  # Cấu hình dự án (v1.1.2, Plutus V3)
│
├── frontend/                       # Ứng dụng web Next.js
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Single-page app (Navbar + Hero + Tabs)
│   ├── components/
│   │   ├── WalletConnect.tsx       # Kết nối ví Cardano (CIP-30)
│   │   ├── CreateLoanPanel.tsx     # Form tạo khoản vay
│   │   ├── LoanListPanel.tsx       # Danh sách khoản vay Pending / Active
│   │   ├── LoanCard.tsx            # Hiển thị và thao tác từng khoản vay
│   │   └── TxToast.tsx             # Thông báo sau khi giao dịch thành công
│   ├── context/
│   │   └── WalletContext.tsx       # Trạng thái ví toàn cục (React Context)
│   ├── lib/
│   │   └── lendingFunctions.ts     # Xây dựng giao dịch: createLoan, fundLoan, repayLoan...
│   └── .env.local.example          # Mẫu biến môi trường frontend
│
├── offchain/                       # Scripts CLI (TypeScript, headless)
│   ├── src/
│   │   ├── config.ts               # Script CBOR, provider, cấu hình mạng
│   │   ├── lendingFunctions.ts     # Hàm xây dựng giao dịch cốt lõi
│   │   └── types.ts                # Kiểu TypeScript (LoanDatum, LoanUtxo)
│   ├── scripts/
│   │   ├── mint-collateral-nft.ts  # Mint NFT tài sản đảm bảo cho người vay
│   │   ├── test-create.ts          # E2E: Tạo khoản vay
│   │   ├── test-fund.ts            # E2E: Cấp vốn
│   │   ├── test-repay.ts           # E2E: Trả nợ
│   │   ├── test-liquidate.ts       # E2E: Tịch thu tài sản
│   │   └── test-cancel.ts          # E2E: Huỷ khoản vay
│   └── .env.example                # Mẫu biến môi trường offchain
│
├── docs/                           # Tài liệu kỹ thuật
│   ├── smart-contract-architecture.md   # Kiến trúc smart contract
│   ├── app-architecture.md              # Kiến trúc ứng dụng & luồng dữ liệu
│   ├── installation.md                  # Hướng dẫn cài đặt
│   └── user-guide.md                    # Hướng dẫn sử dụng
│
└── README.md
```

---

## Công nghệ sử dụng

| Tầng | Công nghệ |
|---|---|
| Smart Contract | [Aiken](https://aiken-lang.org) v1.1.2 — Plutus V3 (Conway era) |
| Frontend | [Next.js](https://nextjs.org) 16 + React 19 + TypeScript |
| Giao diện | Tailwind CSS v4 |
| Cardano SDK | [MeshJS](https://meshjs.dev) v1.9.0-beta |
| Blockchain API | [Blockfrost](https://blockfrost.io) (Preview Testnet) |
| Ví hỗ trợ | Eternl, Nami (CIP-30) |

---

## Bắt đầu nhanh

### 1. Clone và cài đặt thư viện

```bash
git clone https://github.com/tienna/p2plending.git
cd p2plending

# Frontend
cd frontend && npm install && cd ..

# Offchain scripts
cd offchain && npm install && cd ..
```

### 2. Cấu hình biến môi trường

```bash
# Frontend
cp frontend/.env.local.example frontend/.env.local
# Điền NEXT_PUBLIC_BLOCKFROST_API_KEY

# Offchain
cp offchain/.env.example offchain/.env
# Điền BLOCKFROST_API_KEY, ALICE_MNEMONIC, BOB_MNEMONIC
```

> Lấy API key miễn phí tại [blockfrost.io](https://blockfrost.io) → tạo project với network **Preview**.

### 3. Chạy Frontend

```bash
cd frontend
npm run dev
# → Truy cập http://localhost:3000
```

### 4. (Tuỳ chọn) Chạy kiểm thử E2E với CLI scripts

```bash
cd offchain

# Mint NFT tài sản đảm bảo cho Alice (người vay)
npm run mint-nft
# → Copy NFT_POLICY_ID vào .env

# Kiểm thử toàn bộ vòng đời khoản vay
npm run test:create                         # Tạo khoản vay → lấy LOAN_TX_HASH
LOAN_TX_HASH=<hash> npm run test:fund       # Cấp vốn
LOAN_TX_HASH=<hash> npm run test:repay      # Trả nợ
```

---

## Vòng đời khoản vay

```
Người vay                   Smart Contract                  Người cho vay
    │                             │                               │
    │── Tạo khoản vay ───────────►│ [UTxO Pending]               │
    │   (khóa NFT tài sản đảm bảo)│  Giá trị: NFT               │
    │                             │  Datum: { status: Pending }  │
    │                             │                               │
    │                             │◄──────────── Cấp vốn ────────│
    │◄── Nhận ADA (tiền vay) ─────│ [UTxO Active]                │
    │                             │  Giá trị: NFT + ADA          │
    │                             │  Datum: { status: Active,    │
    │                             │           due_date: ... }    │
    │                             │                               │
    │── Trả nợ (trước hạn) ──────►│                              │
    │   (gốc + lãi)               │──── Người cho vay nhận ADA ─►│
    │◄── Nhận lại NFT ────────────│                               │
    │                             │                               │
    │                             │ (nếu quá hạn)                 │
    │                             │◄────── Tịch thu tài sản ──────│
    │                             │──── Người cho vay nhận NFT ──►│
```

---

## Tài liệu

- [Kiến trúc Smart Contract](docs/smart-contract-architecture.md)
- [Kiến trúc ứng dụng & Luồng dữ liệu](docs/app-architecture.md)
- [Hướng dẫn cài đặt](docs/installation.md)
- [Hướng dẫn sử dụng](docs/user-guide.md)

---

## Giấy phép

MIT

---

*Xây dựng bằng Aiken + MeshJS · Cardano Preview Testnet · with love ❤️ from [Cardano2vn](https://cardano2vn.io)*

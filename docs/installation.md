# Hướng Dẫn Cài Đặt — P2P Lending dApp

## Yêu cầu hệ thống

| Công cụ | Phiên bản | Kiểm tra |
|---|---|---|
| Node.js | >= 18.x | `node --version` |
| npm | >= 9.x | `npm --version` |
| Git | Bất kỳ | `git --version` |
| Aiken CLI | v1.1.2 (chỉ cần nếu sửa contract) | `aiken --version` |

---

## Bước 1: Clone dự án

```bash
git clone <repo-url>
cd 00P2pLending
```

---

## Bước 2: Cài đặt dependencies

### Frontend

```bash
cd frontend
npm install
cd ..
```

### Offchain scripts (CLI)

```bash
cd offchain
npm install
cd ..
```

---

## Bước 3: Cấu hình biến môi trường

### 3.1 Frontend — `frontend/.env.local`

Tạo file `frontend/.env.local`:

```env
NEXT_PUBLIC_BLOCKFROST_API_KEY=previewYOUR_KEY_HERE
```

Lấy API key tại [blockfrost.io](https://blockfrost.io) — tạo project với network **Preview**.

### 3.2 Offchain scripts — `offchain/.env`

Tạo file `offchain/.env`:

```env
# Blockfrost Preview Testnet
BLOCKFROST_API_KEY=previewYOUR_KEY_HERE

# Ví Alice (Borrower) — 24 từ mnemonic, phân cách bằng dấu cách
ALICE_MNEMONIC=word1 word2 word3 ... word24

# Ví Bob (Lender) — 24 từ mnemonic
BOB_MNEMONIC=word1 word2 word3 ... word24

# NFT Collateral (điền sau khi chạy mint-nft)
NFT_POLICY_ID=
NFT_ASSET_NAME=CollateralNFT
```

> **Lấy tADA (test ADA):** Truy cập [Cardano Preview Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/) để nhận tADA vào ví Alice và Bob.

---

## Bước 4: Chuẩn bị ví test (Offchain scripts)

> Bước này chỉ cần cho offchain scripts. Nếu chỉ dùng frontend, bỏ qua.

### 4.1 Tạo mnemonic cho Alice và Bob

Bạn có thể tạo ví test bằng bất kỳ công cụ Cardano nào (Eternl, cardano-cli, v.v.), sau đó copy mnemonic vào `offchain/.env`.

### 4.2 Thiết lập collateral UTxO

Ví Alice cần có ít nhất **1 UTxO riêng chứa 5 ADA** làm collateral cho Plutus transactions. Trong Eternl: Settings → Collateral → Set Collateral.

Nếu dùng MeshWallet (headless), collateral được tự động chọn từ UTxOs.

### 4.3 Mint Collateral NFT cho Alice

```bash
cd offchain
npm run mint-nft
```

Output:
```
=== Mint Collateral NFT cho Alice ===

Alice address: addr_test1...
Alice PKH:    a1b2c3...
NFT Policy ID: 70a9bdf8...
NFT Asset Name (hex): 436f6c6c61746572616c4e4654
NFT Unit: 70a9bdf8...436f6c6c61746572616c4e4654

✅ Mint NFT thành công!
Tx Hash: abc123...

Cập nhật .env với:
NFT_POLICY_ID=70a9bdf8...
NFT_ASSET_NAME=CollateralNFT
```

Copy `NFT_POLICY_ID` vào `offchain/.env`.

---

## Bước 5: Khởi chạy Frontend

```bash
cd frontend
npm run dev
```

Mở trình duyệt tại: [http://localhost:3000](http://localhost:3000)

Hoặc build production:

```bash
npm run build
npm start
```

---

## Bước 6: Kiểm tra kết nối

### Kiểm tra Frontend
1. Mở [http://localhost:3000](http://localhost:3000)
2. Click **Connect Wallet** — chọn Eternl hoặc Nami
3. Kiểm tra ví đang ở **Preview Testnet** (networkId = 0)
4. Nếu thấy "⚠ Wrong network", chuyển ví sang Preview Testnet

### Kiểm tra Offchain scripts (tùy chọn)

Chạy E2E test toàn bộ vòng đời khoản vay:

```bash
cd offchain

# Bước 1: Alice tạo khoản vay
npm run test:create
# → Copy LOAN_TX_HASH từ output

# Bước 2: Bob fund khoản vay
LOAN_TX_HASH=<hash_từ_bước_1> npm run test:fund

# Bước 3: Alice trả nợ
LOAN_TX_HASH=<hash_từ_bước_2> npm run test:repay
```

Hoặc test cancel:

```bash
# Tạo loan mới
npm run test:create
# → Copy LOAN_TX_HASH

# Alice cancel
LOAN_TX_HASH=<hash> npm run test:cancel
```

---

## Cấu trúc thư mục sau cài đặt

```
00P2pLending/
├── frontend/
│   ├── .env.local          ← Bạn tạo (Blockfrost key)
│   ├── node_modules/       ← npm install
│   └── ...
├── offchain/
│   ├── .env                ← Bạn tạo (mnemonics + Blockfrost key)
│   ├── node_modules/       ← npm install
│   └── ...
└── aiken-contract/         ← Không cần thiết lập (đã compile)
```

---

## Lỗi thường gặp khi cài đặt

### `No wallets found. Install Eternl or Nami`
Cài extension Eternl hoặc Nami, sau đó tạo/import ví Preview Testnet và reload trang.

### `No UTxOs - please fund Alice's wallet first`
Ví Alice chưa có tADA. Dùng faucet để nhận tADA.

### `BLOCKFROST_API_KEY not set`
Kiểm tra file `.env` / `.env.local` đúng đường dẫn và không có khoảng trắng thừa.

### `No collateral UTxO`
Ví Alice chưa thiết lập collateral. Cần có 1 UTxO chứa ADA riêng biệt làm collateral.

---

## Build Smart Contract (tùy chọn)

Nếu bạn muốn sửa và rebuild smart contract:

```bash
# Cài Aiken CLI
curl --proto '=https' --tlsv1.2 -LsSf https://install.aiken-lang.org | sh

cd aiken-contract

# Kiểm tra và chạy test
aiken check

# Compile
aiken build
# → Tạo plutus.json với CBOR mới
```

> Sau khi rebuild, cần cập nhật `LENDING_SCRIPT_CBOR` trong `offchain/src/config.ts` và `frontend/lib/lendingFunctions.ts` với giá trị từ `plutus.json`. Nhớ convert sang **double-CBOR** (xem `offchain/scripts/convert-script.ts`).

# Hướng Dẫn Sử Dụng — P2P Lending dApp

## Giới thiệu

P2P Lending dApp cho phép vay và cho vay trực tiếp trên Cardano Preview Testnet, được bảo đảm bằng **Collateral NFT**. Không có bên trung gian — smart contract Aiken thực thi tất cả điều khoản.

**Hai vai trò:**
- **Borrower (Người vay):** Khóa NFT làm collateral, nhận ADA từ lender
- **Lender (Người cho vay):** Cấp ADA, nhận lãi nếu borrower trả đúng hạn

---

## Chuẩn bị

### Yêu cầu
1. **Ví Cardano** hỗ trợ CIP-30: [Eternl](https://eternl.io) hoặc [Nami](https://namiwallet.io)
2. Ví phải ở **Preview Testnet** (không phải Mainnet)
3. Có **tADA** (test ADA) — lấy từ [faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/)
4. (Chỉ với Borrower) Có **Collateral NFT** trong ví

---

## Giao diện chính

Ứng dụng có 2 tab chính:

| Tab | Mô tả |
|---|---|
| **Loan Market** | Xem danh sách tất cả khoản vay đang mở (Pending) và đang hoạt động (Active) |
| **Create Loan** | Tạo khoản vay mới với tư cách Borrower |

---

## Chức năng 1: Kết nối ví

1. Click nút **Connect Wallet** ở góc trên phải
2. Chọn ví đã cài (Eternl / Nami)
3. Ví extension hiện popup — approve kết nối
4. Địa chỉ ví hiển thị dưới dạng `addr_test1...xxx` với chấm xanh nhấp nháy

> Nếu thấy **"⚠ Wrong network"**, chuyển ví sang Preview Testnet và kết nối lại.

Để ngắt kết nối, click **Disconnect**.

---

## Chức năng 2: Tạo khoản vay (Borrower)

**Điều kiện:** Đã kết nối ví + ví có Collateral NFT.

### Các bước

1. Chuyển sang tab **Create Loan**
2. Điền thông tin khoản vay:

| Trường | Mô tả | Ví dụ |
|---|---|---|
| **Principal (ADA)** | Số tiền muốn vay | `10` (= 10 ADA) |
| **Interest Rate (basis pts)** | Lãi suất. 100 basis points = 1% | `500` (= 5%) |
| **Duration (hours)** | Thời hạn trả nợ tính từ lúc lender fund | `24` (= 24 giờ) |
| **Collateral NFT — Policy ID** | Policy ID của NFT collateral (64 ký tự hex) | `70a9bdf8cba0...` |
| **Collateral NFT — Asset Name** | Tên NFT (text, không phải hex) | `CollateralNFT` |

3. Click **Lock Collateral & Create Loan**
4. Ví extension popup — **Sign transaction**
5. Chờ xác nhận (~20-60 giây)
6. Toast thông báo thành công hiển thị link Cexplorer
7. Tự động chuyển về tab **Loan Market** — loan mới xuất hiện với trạng thái `Pending`

**Điều gì xảy ra on-chain:** NFT của bạn bị khóa vào script address cùng với datum mô tả điều khoản vay. Lender có thể nhìn thấy và quyết định fund.

---

## Chức năng 3: Fund khoản vay (Lender)

**Điều kiện:** Đã kết nối ví + ví có đủ ADA (principal + phí giao dịch).

### Các bước

1. Ở tab **Loan Market**, tìm loan có trạng thái `Pending`
2. Xem thông tin: Principal, Interest %, Duration, Borrower address
3. Tính toán lợi nhuận: Total Repayment = Principal × (1 + Interest%)
4. Click **Fund Loan**
5. Ví extension popup — **Sign transaction**
6. Chờ xác nhận

**Điều gì xảy ra on-chain:**
- ADA của lender được khóa vào script UTxO cùng với NFT collateral
- Datum cập nhật sang trạng thái `Active { funded_at }` với `due_date` được tính
- Borrower nhận ADA (principal) vào ví ngay lập tức

**Sau khi fund:** Loan card chuyển sang trạng thái `Active`, hiển thị deadline.

---

## Chức năng 4: Trả nợ (Borrower Repay)

**Điều kiện:** Loan ở trạng thái `Active` + bạn là borrower + **chưa quá hạn**.

### Các bước

1. Ở tab **Loan Market**, tìm loan `Active` của bạn
2. Kiểm tra deadline — phải còn thời gian
3. Click **Repay X.XX ADA** (hiển thị tổng số tiền cần trả)
4. Ví extension popup — **Sign transaction**
5. Chờ xác nhận

**Điều gì xảy ra on-chain:**
- Script UTxO bị spend
- **Lender nhận:** `principal + interest` ADA
- **Borrower nhận lại:** NFT collateral

**Tính toán:**
```
interest = principal × interest_rate / 10000
total_repayment = principal + interest

Ví dụ: 10 ADA × 5% = 0.5 ADA lãi
→ Trả tổng: 10.5 ADA, nhận lại NFT
```

---

## Chức năng 5: Tịch thu collateral (Lender Liquidate)

**Điều kiện:** Loan ở trạng thái `Active` + bạn là lender + **đã quá hạn** (Overdue).

### Các bước

1. Ở tab **Loan Market**, tìm loan `Active` của bạn có nhãn **Overdue** (màu đỏ)
2. Click nút **Liquidate** (màu đỏ)
3. Ví extension popup — **Sign transaction**
4. Chờ xác nhận

**Điều gì xảy ra on-chain:**
- Script UTxO bị spend
- **Lender nhận:** NFT collateral (bù đắp cho ADA đã cho vay)

> **Lưu ý:** Nếu borrower không trả đúng hạn, lender có quyền tịch thu NFT. Đây là cơ chế bảo đảm cho lender.

---

## Chức năng 6: Huỷ khoản vay (Borrower Cancel)

**Điều kiện:** Loan ở trạng thái `Pending` (chưa có lender fund) + bạn là borrower.

### Các bước

1. Ở tab **Loan Market**, tìm loan `Pending` của bạn
2. Click **Cancel Loan**
3. Ví extension popup — **Sign transaction**
4. Chờ xác nhận

**Điều gì xảy ra on-chain:**
- Script UTxO bị spend
- **Borrower nhận lại:** NFT collateral

> Có thể cancel bất kỳ lúc nào trước khi lender fund.

---

## Trạng thái khoản vay

| Trạng thái | Màu | Mô tả | Actions có sẵn |
|---|---|---|---|
| `Pending` | Vàng | Chờ lender fund | Fund (lender) / Cancel (borrower) |
| `Active` | Xanh | Đang hoạt động | Repay (borrower) |
| `Active` + `Overdue` | Đỏ | Quá hạn | Liquidate (lender) |

---

## Theo dõi giao dịch

Sau mỗi giao dịch thành công, toast notification hiển thị **Tx Hash**. Click link để xem trên Cardano Explorer:

```
https://preview.cexplorer.io/tx/<TX_HASH>
```

Giao dịch cần **~20-60 giây** để được confirm trên blockchain.

---

## Lỗi thường gặp

### "Connect your wallet to create a loan"
→ Kết nối ví trước khi thao tác.

### "Transaction failed — No UTxOs found"
→ Ví chưa có tADA. Dùng faucet để nhận tADA.

### "Loan is not overdue yet"
→ Chưa đủ điều kiện liquidate. Deadline chưa qua.

### Loan không xuất hiện sau khi tạo
→ Blockfrost cần thời gian index (~30 giây). Click **Refresh** hoặc chờ tự động refresh.

### Transaction bị reject bởi ví
→ Kiểm tra ví đang ở **Preview Testnet**, không phải Mainnet.

---

## Kịch bản sử dụng mẫu

### Kịch bản A: Vay thành công

```
1. Alice: Mint NFT collateral
2. Alice: Create Loan (10 ADA, 5%, 24h) → NFT khóa vào contract
3. Bob:   Fund Loan → Alice nhận 10 ADA, contract giữ NFT + 10 ADA
4. Alice: Repay 10.5 ADA → Bob nhận 10.5 ADA, Alice nhận lại NFT
```

### Kịch bản B: Liquidation

```
1. Alice: Create Loan (10 ADA, 5%, 1h)
2. Bob:   Fund Loan → Alice nhận 10 ADA
3. (Chờ hơn 1 giờ — quá hạn)
4. Bob:   Liquidate → Bob nhận NFT collateral của Alice
```

### Kịch bản C: Cancel

```
1. Alice: Create Loan
2. (Không có lender fund)
3. Alice: Cancel → Alice nhận lại NFT
```

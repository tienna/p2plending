# P2P Lending dApp trên Cardano

Ứng dụng cho vay ngang hàng (P2P Lending) được xây dựng trên Cardano Preview Testnet sử dụng Aiken smart contracts và MeshJS.
## Các kịch bàn cần test
### Kịch bản 1: Vòng đời khoản vay thành công
1. Người đi vay tạo khoản vay với collateral NFT
2. Người cho vay kích hoạt khoản vay bằng cách gửi principal ADA
3. Người đi vay trả nợ (gốc + lãi) và nhận lại collateral NFT

### Kịch bản 2: Thanh lý khoản vay
1. Người đi vay tạo khoản vay
2. Người cho vay kích hoạt khoản vay
3. Người đi vay không trả nợ đúng hạn
4. Người cho vay thanh lý và nhận collateral NFT

### Kịch bản 3: Hủy khoản vay
1. Người đi vay tạo khoản vay
2. Không có ai cho vay
3. Người đi vay hủy và nhận lại collateral NFT

##  Các tính năng chính
### 1. Tạo khoản vay (Create Loan)
- ✅ Borrower đưa ra số tiền cần vay - principal ADA + lãi suất + thời gian vay trong Datum
- ✅ Borrower gửi Collateral NFT vào smart contract

### 2. Fund
- ✅ Khoản vay chưa có lender
- ✅ Lender ký giao dịch
- ✅ Collateral NFT được giữ lại trong script
- ✅ Borrower nhận đủ principal

### 3. Repay
- ✅ Khoản vay đã được kích hoạt
- ✅ Borrower ký giao dịch
- ✅ Trước deadline
- ✅ Lender nhận đủ tiền gốc + lãi

### 4. Liquidate
- ✅ Khoản vay đã được kích hoạt
- ✅ Sau deadline, Lender ký giao dịch và nhận về Collateral NFT

### 5. Cancel
- ✅ Khoản vay chưa có lender
- ✅ Borrower ký giao dịch và nhận về Collateral NFT

## Kiến trúc

### Smart Contract (On-chain)
- **Ngôn ngữ**: Aiken 
- **Plutus Version**: V3
- **Validator**: `p2p_lending`

### Off-chain
- **Framework**: TypeScript
- **SDK**: MeshJS (@meshsdk/transaction, @meshsdk/wallet, @meshsdk/core-cst)
- **Network**: Cardano Preview Testnet
- **Provider**: Blockfrost

## Cấu hình môi trường

File `.env` đã được tạo sẵn với:
- `ALICE_MNEMONIC`: Mnemonic Ví của Alice,  sử dụng cho việc test với vai trò người đi vay
- `BOB_MNEMONIC`: Mnemonic Ví của Bob,  sử dụng cho việc test với vai trò người cho vay
- `BLOCKFROST_API_KEY`: API key của Blockfrost


## Yêu cầu viết code
- Các chức năng offchain được viết thành các hàm riêng biệt, để chung vào một file là lendingFunctions.ts
- Sử dụng Ví của Alice(Người đi vay) và Bob (người cho vay) test trước các hàm này
- Xây dựng một landing page có các chức năng:
    - cho phép người dùng kết nối ví (sử dụng Mesh skill) tạo khoản vay
    - cho phép người dùng kết nối ví (sử dụng Mesh skill) xem khoản vay và cho vay
    - cho phép người dùng kết nối ví (sử dụng Mesh skill) xem khoản vay và thanh lý khoản vay
    - cho phép người dùng kết nối ví (sử dụng Mesh skill) Thu hồi khoản vay
    



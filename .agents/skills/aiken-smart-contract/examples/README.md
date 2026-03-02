# Examples Overview

Thư mục này chứa các ví dụ smart contract Aiken từ đơn giản đến phức tạp.

## 📚 Danh sách Examples

### 1. Hello World (`01-hello-world.ak`)

**Độ khó**: ⭐ Beginner

**Mô tả**: Validator đơn giản nhất để học Aiken basics

**Tính năng**:
- Datum chứa owner address
- Redeemer yêu cầu message cụ thể
- Kiểm tra signature của owner

**Học được**:
- Cấu trúc validator cơ bản
- Pattern matching với `expect`
- Kiểm tra signatures
- Viết unit tests

**Use case**: Lock ADA và chỉ unlock khi có đúng message + signature

---

### 2. NFT Minting (`02-nft-minting.ak`)

**Độ khó**: ⭐⭐ Intermediate

**Mô tả**: Minting policy cho NFTs với uniqueness guarantee

**Tính năng**:
- Mint NFT (quantity = 1)
- Burn NFT
- UTXO-based uniqueness
- Issuer authorization

**Học được**:
- Minting validators
- Working with `mint` field trong Transaction
- Dict operations với assets
- UTXO spending validation

**Use case**: Tạo NFT collection với authorized minter

---

### 3. P2P Lending (`03-p2p-lending.ak`)

**Độ khó**: ⭐⭐⭐ Advanced

**Mô tả**: P2P lending platform với collateral management

**Tính năng**:
- Create loan request với collateral
- Fund loan bởi lender
- Repay với interest
- Liquidate collateral nếu overdue
- Cancel pending loan

**Học được**:
- Complex state machine
- Time-based validations
- Value calculations (principal + interest)
- Multiple redeemer actions
- Native asset collateral handling

**Use case**: DeFi lending platform

---

## 🚀 Cách sử dụng Examples

### Setup Project

```bash
# Tạo project mới
mkdir my-aiken-project
cd my-aiken-project

# Initialize
aiken new . --name my-project

# Add dependencies
aiken add aiken-lang/stdlib --version v3
```

### Copy & Modify

1. Copy example vào thư mục `validators/`:

```bash
cp path/to/example/01-hello-world.ak validators/my_validator.ak
```

2. Modify theo nhu cầu của bạn

3. Build:

```bash
aiken build
```

4. Run tests:

```bash
aiken check
```

### Deploy to Testnet

Sau khi build, file `plutus.json` sẽ được tạo. Sử dụng offchain framework như MeshJS để deploy:

```typescript
import { MeshWallet, BlockfrostProvider } from '@meshsdk/core';
import plutusScript from '../plutus.json';

const provider = new BlockfrostProvider('YOUR_API_KEY');
const wallet = new MeshWallet({
  networkId: 0, // 0 = testnet, 1 = mainnet
  fetcher: provider,
  submitter: provider,
  key: {
    type: 'mnemonic',
    words: 'your mnemonic...',
  },
});

// Use validator from plutusScript
const validator = plutusScript.validators[0]; // Lấy validator đầu tiên
console.log('Script address:', validator.address);
```

---

## 📖 Learning Path

### Level 1: Beginner
1. Đọc `SKILL.md` - Hiểu basics của Aiken
2. Chạy `01-hello-world.ak` - Học validator structure
3. Modify hello-world để thay đổi message requirement
4. Viết thêm test cases

### Level 2: Intermediate
1. Study `02-nft-minting.ak` - Học minting validators
2. Implement burning logic
3. Add metadata support
4. Deploy to testnet và mint NFT thật

### Level 3: Advanced
1. Analyze `03-p2p-lending.ak` - Complex state management
2. Add new features (partial repayment, multiple lenders, etc.)
3. Implement full offchain code với MeshJS
4. Test trên Preview testnet với real transactions

---

## 🛠️ Customization Ideas

### Hello World
- [ ] Support multiple messages
- [ ] Add time-lock
- [ ] Multi-signature support
- [ ] Add datum update capability

### NFT Minting
- [ ] Royalty enforcement
- [ ] Collection verification
- [ ] Metadata validation
- [ ] Whitelist minting

### P2P Lending
- [ ] Partial repayment
- [ ] Variable interest rates
- [ ] Multiple lenders (syndicated loan)
- [ ] Grace period before liquidation
- [ ] Oracle integration for collateral valuation

---

## 🔍 Debugging Tips

### 1. Use `trace` for debugging

```aiken
use aiken/builtin.{trace}

validator my_validator {
  spend(datum, redeemer, outref, tx) {
    let _ = trace("Datum: ")
    let _ = trace(datum)
    
    // ... validation logic
  }
}
```

### 2. Run tests with verbose output

```bash
aiken check -v
```

### 3. Check compiled size

```bash
aiken build
# Check plutus.json - smaller is better
```

### 4. Validate offchain before submitting

Always test with offchain code locally before submitting to chain!

---

## 📚 Additional Resources

- **Aiken Language**: https://aiken-lang.org
- **Aiken Stdlib**: https://aiken-lang.github.io/stdlib/
- **MeshJS** (offchain): https://meshjs.dev
- **Cardano Docs**: https://developers.cardano.org

---

**Happy coding! 🎉**

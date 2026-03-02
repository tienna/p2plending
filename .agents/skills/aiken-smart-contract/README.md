# Aiken Smart Contract Development Skill

Bộ skill toàn diện để phát triển smart contract trên Cardano sử dụng ngôn ngữ Aiken.

## 📁 Cấu trúc Skill

```
aiken-smart-contract/
├── SKILL.md                    # Hướng dẫn chi tiết về Aiken
├── README.md                   # File này
├── examples/                   # Các ví dụ thực tế
│   ├── README.md              # Overview các examples
│   ├── 01-hello-world.ak      # Validator đơn giản
│   ├── 02-nft-minting.ak      # NFT minting policy
│   └── 03-p2p-lending.ak      # P2P lending contract
└── resources/                  # Tài liệu tham khảo
    └── quick-reference.md      # Quick reference guide
```

## 🚀 Bắt đầu

### 1. Đọc SKILL.md

File [`SKILL.md`](./SKILL.md) chứa hướng dẫn toàn diện về:
- Giới thiệu Aiken
- Cấu trúc dự án
- Types và Data Structures
- Builtin Functions
- Best Practices
- Ví dụ cơ bản

### 2. Cài đặt Aiken

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://install.aiken-lang.org | sh
aiken --version
```

### 3. Tạo Project

```bash
aiken new my-project
cd my-project
aiken add aiken-lang/stdlib --version v3
```

### 4. Học từ Examples

Xem [`examples/README.md`](./examples/README.md) để:
- Chọn example phù hợp với level
- Follow learning path
- Customize cho use case của bạn

## 📚 Nội dung chính

### SKILL.md Coverage

1. **Giới thiệu Aiken**
   - Lý do chọn Aiken
   - Cài đặt và setup
   - Cấu trúc dự án

2. **Validators**
   - Spending validators
   - Minting validators
   - Script context
   - Transaction structure

3. **Types & Data**
   - Primitive types
   - Custom types
   - Collections (List, Dict)
   - Option type

4. **Builtin Functions**
   - Integer operations
   - ByteArray operations
   - Cryptographic functions
   - Data encoding

5. **Best Practices**
   - Code patterns
   - Optimization
   - Error handling
   - Testing strategies

### Examples Coverage

| Example | Độ khó | Topics |
|---------|--------|---------|
| Hello World | ⭐ | Basics, signatures, pattern matching |
| NFT Minting | ⭐⭐ | Minting policy, assets, UTXO uniqueness |
| P2P Lending | ⭐⭐⭐ | State machine, time validation, DeFi |

### Resources

- **quick-reference.md**: Cheat sheet cho common patterns và operations

## 🎯 Use Cases

Skill này giúp bạn xây dựng:

✅ **DeFi Protocols**
- Lending/Borrowing platforms
- DEX (Decentralized Exchange)
- Staking contracts
- Yield farming

✅ **NFT Projects**
- NFT minting
- Marketplace contracts
- Royalty enforcement
- Collection management

✅ **DAOs**
- Governance contracts
- Treasury management
- Voting mechanisms

✅ **Gaming**
- GameFi smart contracts
- In-game assets
- Reward distribution

## 🔧 Workflow

Khi phát triển smart contract với skill này:

1. **Analyze Requirements**
   - Hiểu business logic
   - Identify validators cần thiết
   - Map out states và transitions

2. **Design Types**
   - Define Datum structure
   - Define Redeemer actions
   - Plan data flow

3. **Implement Validators**
   - Write validation logic
   - Use helper functions
   - Follow best practices từ SKILL.md

4. **Test Thoroughly**
   - Unit tests cho mọi scenarios
   - Edge cases
   - Failure cases

5. **Optimize**
   - Review script size
   - Optimize logic
   - Remove unused code

6. **Deploy & Integrate**
   - Build plutus.json
   - Integrate với offchain (MeshJS)
   - Test trên testnet

## 📖 Learning Resources

### Official Docs
- [Aiken Language](https://aiken-lang.org)
- [Aiken Stdlib](https://aiken-lang.github.io/stdlib/)
- [Aiken Prelude](https://aiken-lang.github.io/prelude/)

### Offchain Integration
- [MeshJS](https://meshjs.dev) - TypeScript SDK
- [Lucid](https://github.com/spacebudz/lucid) - Alternative SDK

### Cardano
- [Cardano Developers](https://developers.cardano.org)
- [Cardano Forum](https://forum.cardano.org)

## 💡 Tips

1. **Start Simple**: Bắt đầu với hello-world, không nhảy vào complex validators ngay
2. **Test Extensively**: On-chain bugs rất tốn kém, test kỹ trước
3. **Read Others' Code**: Học từ open-source Aiken projects
4. **Use Testnet**: Luôn test trên Preview testnet trước mainnet
5. **Ask Community**: Discord và Forum rất hữu ích

## 🤝 Contributing

Nếu bạn muốn cải thiện skill này:
- Thêm examples mới
- Cải thiện documentation
- Fix bugs trong examples
- Share use cases

## 📄 License

Skill này được tạo cho mục đích học tập và phát triển.

---

**Happy Building on Cardano! 🚀**

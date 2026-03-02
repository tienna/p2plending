---
name: Aiken Smart Contract Development
description: Comprehensive skill for writing Cardano smart contracts using the Aiken programming language
---

# Aiken Smart Contract Development Skill

Bộ skill này cung cấp hướng dẫn toàn diện để viết smart contract trên Cardano sử dụng ngôn ngữ lập trình Aiken.

## 📋 Mục Lục

1. [Giới thiệu về Aiken](#giới-thiệu-về-aiken)
2. [Cấu trúc dự án Aiken](#cấu-trúc-dự-án-aiken)
3. [Validators và Script Context](#validators-và-script-context)
4. [Types và Data Structures](#types-và-data-structures)
5. [Builtin Functions](#builtin-functions)
6. [Best Practices](#best-practices)
7. [Ví dụ thực tế](#ví-dụ-thực-tế)

---

## Giới thiệu về Aiken

**Aiken** là ngôn ngữ lập trình chuyên dụng cho smart contract trên Cardano, được thiết kế để:
- Đơn giản, dễ học và dễ đọc
- An toàn với type system mạnh mẽ
- Hiệu quả về chi phí on-chain (script size nhỏ)
- Tích hợp tốt với Cardano ecosystem

### Cài đặt Aiken

```bash
# Cài đặt Aiken
curl --proto '=https' --tlsv1.2 -LsSf https://install.aiken-lang.org | sh

# Kiểm tra version
aiken --version

# Tạo project mới
aiken new my-project
cd my-project

# Build project
aiken build

# Chạy tests
aiken check
```

### Dependencies

Thêm stdlib vào project (Sử dụng v2 cho Aiken v1.1.2):

```bash
aiken add aiken-lang/stdlib --version v2
```

---

## Cấu trúc dự án Aiken

### Cấu trúc thư mục chuẩn

```
my-project/
├── aiken.toml          # Configuration file
├── lib/                # Library code (reusable modules)
├── validators/         # Validator scripts
│   └── my_validator.ak
└── plutus.json         # Generated output (compiled validators)
```

### File aiken.toml

```toml
name = "your-username/my-project"
version = "0.0.0"
compiler = "v1.1.2"
license = "Apache-2.0"
description = "A Cardano smart contract project"

[repository]
user = "your-username"
project = "my-project"
platform = "github"

[[dependencies]]
name = "aiken-lang/stdlib"
version = "v2"
source = "github"

### Plutus Versioning
- **Aiken v1.1.2+**: Default is **Plutus V3**.
- **Hashing**: Policy ID for Plutus V3 is calculated by hashing the **unwrapped CBOR** (no outer bytestring header) with prefix `03`.
- **Mesh Integration**: Use `applyParamsToScript` on the raw `compiledCode` and then `resolveScriptHash(..., "V3")`.
```

---

## Validators và Script Context

### Cấu trúc Validator cơ bản

Một validator trong Aiken có thể có nhiều mục đích (spend, mint, withdraw, publish):

```aiken
use cardano/transaction.{Transaction, OutputReference}

// Spending validator
validator my_spending_validator {
  spend(
    datum: Option<MyDatum>,
    redeemer: MyRedeemer,
    output_reference: OutputReference,
    transaction: Transaction,
  ) {
    // Validation logic here
    True
  }
}

// Minting validator
validator my_minting_validator {
  mint(
    redeemer: MyRedeemer,
    policy_id: PolicyId,
    transaction: Transaction,
  ) {
    // Minting logic here
    True
  }
}

// Parameterized Validator (Luôn phải có tên)
validator my_parameterized_validator(owner: VerificationKeyHash) {
  mint(redeemer: Action, policy_id: PolicyId, self: Transaction) {
    list.has(self.extra_signatories, owner)
  }
}
```

### Script Context

#### Transaction type

```aiken
use cardano/transaction.{Transaction, Input, Output, ValidityRange}
use aiken/crypto.{VerificationKeyHash}

pub type Transaction {
  inputs: List<Input>,
  reference_inputs: List<Input>,
  outputs: List<Output>,
  fee: Lovelace,
  mint: Value,
  certificates: List<Certificate>,
  withdrawals: Pairs<Credential, Lovelace>,
  validity_range: ValidityRange,
  extra_signatories: List<VerificationKeyHash>,
  redeemers: Pairs<ScriptPurpose, Redeemer>,
  datums: Dict<DataHash, Data>,
  id: TransactionId,
  votes: Pairs<Voter, Pairs<GovernanceActionId, Vote>>,
  proposal_procedures: List<ProposalProcedure>,
  current_treasury_amount: Option<Lovelace>,
  treasury_donation: Option<Lovelace>,
}
```

#### Common Script Context operations

```aiken
use aiken/collection/list
use cardano/assets.{PolicyId, quantity_of}
use cardano/transaction.{Transaction, OutputReference}

// Kiểm tra signature
fn has_signature(tx: Transaction, owner: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, owner)
}

// Tìm input theo OutRef
fn find_input(
  tx: Transaction,
  output_reference: OutputReference,
) -> Option<Input> {
  list.find(
    tx.inputs,
    fn(input) { input.output_reference == output_reference }
  )
}

// Kiểm tra output đến địa chỉ cụ thể
fn has_output_to(tx: Transaction, address: Address) -> Bool {
  list.any(
    tx.outputs,
    fn(output) { output.address == address }
  )
}

// Lấy tổng giá trị được mint (Sử dụng quantity_of cho stdlib v2)
fn total_minted_asset(tx: Transaction, policy_id: PolicyId, asset_name: AssetName) -> Int {
  quantity_of(tx.mint, policy_id, asset_name)
}
```

---

## Types và Data Structures

### Primitive Types

```aiken
// Integer
let amount: Int = 1000000

// ByteArray - used for hashes, keys, etc
let pkh: ByteArray = #"a1b2c3..."

// String
let message: String = "Hello, Cardano!"

// Bool
let is_valid: Bool = True
```

### Custom Types

```aiken
// Simple type
pub type Status {
  Active
  Inactive
  Expired
}

// Type với fields
pub type LoanDatum {
  borrower: VerificationKeyHash,
  lender: Option<VerificationKeyHash>,
  principal: Int,
  interest_rate: Int,
  due_date: Int,
  collateral: Value,
  status: Status,
}

// Type aliases
pub type VerificationKeyHash = ByteArray
pub type PolicyId = ByteArray
```

### Collections

#### List

```aiken
use aiken/collection/list

// Tạo list
let numbers = [1, 2, 3, 4, 5]

// List operations
list.length(numbers)                    // 5
list.head(numbers)                      // Some(1)
list.tail(numbers)                      // [2, 3, 4, 5]
list.any(numbers, fn(n) { n > 3 })     // True
list.all(numbers, fn(n) { n > 0 })     // True

// Map
list.map(numbers, fn(n) { n * 2 })     // [2, 4, 6, 8, 10]

// Filter
list.filter(numbers, fn(n) { n % 2 == 0 }) // [2, 4]

// Fold
list.foldl(numbers, 0, fn(acc, n) { acc + n }) // 15

// Find
list.find(numbers, fn(n) { n == 3 })   // Some(3)
```

#### Dict (Association List)

```aiken
use aiken/collection/dict

pub type Dict<k, v> = List<Pair<k, v>>

// Tạo dict
let my_dict = 
  dict.new()
    |> dict.insert("key1", 100)
    |> dict.insert("key2", 200)

// Dict operations
dict.get(my_dict, "key1")              // Some(100)
dict.has_key(my_dict, "key2")          // True
dict.delete(my_dict, "key1")
dict.foldl(my_dict, 0, fn(_, _, v, acc) { acc + v })
```

### Option Type

```aiken
pub type Option<a> {
  Some(a)
  None
}

// Pattern matching với Option
fn get_value(opt: Option<Int>) -> Int {
  when opt is {
    Some(value) -> value
    None -> 0
  }
}

// Expect - assert that it's Some
expect Some(datum) = maybe_datum
```

---

## Builtin Functions

### Integer Operations

```aiken
use aiken/builtin

// Arithmetic
builtin.add_integer(10, 20)           // 30
builtin.subtract_integer(20, 10)      // 10
builtin.multiply_integer(5, 4)        // 20
builtin.divide_integer(20, 4)         // 5
builtin.mod_integer(10, 3)            // 1

// Comparison
builtin.equals_integer(5, 5)          // True
builtin.less_than_integer(3, 5)       // True
builtin.less_than_equals_integer(5, 5) // True

// Hoặc dùng operators
let sum = 10 + 20
let product = 5 * 4
let is_equal = 5 == 5
let is_less = 3 < 5
```

### ByteArray Operations

```aiken
use aiken/builtin

// Construction
builtin.append_bytearray(#"01", #"02")  // #"0102"
builtin.cons_bytearray(1, #"02")        // #"0102"

// Inspection
builtin.length_of_bytearray(#"0102")    // 2
builtin.index_bytearray(#"0102", 0)     // 1
builtin.slice_bytearray(0, 1, #"0102")  // #"01"

// Comparison
builtin.equals_bytearray(#"01", #"01")  // True
builtin.less_than_bytearray(#"01", #"02") // True

// Bitwise
builtin.and_bytearray(True, #"FF", #"0F")
builtin.or_bytearray(True, #"F0", #"0F")
builtin.xor_bytearray(True, #"FF", #"0F")
builtin.complement_bytearray(#"0F")
```

### String Operations

```aiken
use aiken/builtin

builtin.append_string("Hello, ", "World!") // "Hello, World!"
builtin.equals_string("test", "test")      // True
builtin.encode_utf8("Hello")               // ByteArray
builtin.decode_utf8(byte_array)            // String
```

### Cryptographic Functions

```aiken
use aiken/crypto.{blake2b_256, sha2_256, sha3_256}
use aiken/builtin

// Hashing
let hash = blake2b_256(#"data")
let hash2 = sha2_256(#"data")
let hash3 = sha3_256(#"data")

// Signature verification
builtin.verify_ed25519_signature(
  verification_key,
  message,
  signature
)

builtin.verify_ecdsa_secp256k1_signature(
  verification_key,
  message,
  signature
)
```

### Data Encoding

```aiken
use aiken/builtin

// Convert to/from Data type
let data = builtin.i_data(42)
let int = builtin.un_i_data(data)

let data = builtin.b_data(#"bytes")
let bytes = builtin.un_b_data(data)

let data = builtin.list_data([datum1, datum2])
let list = builtin.un_list_data(data)

// Serialize
let serialized = builtin.serialise_data(my_data)
```

---

## Best Practices

### 1. Sử dụng `expect` thay vì `when` khi có thể

❌ **Không nên:**
```aiken
fn get_datum(maybe_datum: Option<MyDatum>) -> MyDatum {
  when maybe_datum is {
    Some(d) -> d
    None -> fail  // Compile error: unreachable
  }
}
```

✅ **Nên:**
```aiken
fn get_datum(maybe_datum: Option<MyDatum>) -> MyDatum {
  expect Some(datum) = maybe_datum
  datum
}
```

### 2. Tránh lặp code - Sử dụng helper functions

✅ **Tốt:**
```aiken
fn must_be_signed_by(tx: Transaction, pkh: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, pkh)
}

validator my_validator {
  spend(datum, redeemer, _outref, tx) {
    expect Some(Datum { owner }) = datum
    must_be_signed_by(tx, owner)
  }
}
```

### 3. Validate inputs đầy đủ

✅ **Luôn validate:**
```aiken
validator loan_validator {
  spend(datum, redeemer, _outref, tx) {
    expect Some(LoanDatum { borrower, principal, .. }) = datum
    
    // Validate principal > 0
    and {
      principal > 0,
      must_be_signed_by(tx, borrower),
      // ... other validations
    }
  }
}
```

### 4. Sử dụng `and` / `or` cho logic rõ ràng

✅ **Dễ đọc:**
```aiken
and {
  condition1,
  condition2,
  condition3,
}

or {
  option1,
  option2,
}
```

### 5. Tránh hardcode values - Dùng constants

✅ **Tốt:**
```aiken
const min_ada: Int = 2_000_000
const max_loan_duration: Int = 365 * 24 * 60 * 60 * 1000  // 1 năm (ms)

validator loan_validator {
  spend(datum, redeemer, _outref, tx) {
    // Use constants
    and {
      value >= min_ada,
      duration <= max_loan_duration,
    }
  }
}
```

### 6. Tối ưu script size

- Sử dụng builtin functions thay vì implement lại
- Tránh code không cần thiết
- Inline small functions nếu chỉ dùng 1 lần
- Remove unused imports

### 7. Test kỹ lưỡng

```aiken
test my_validator_success() {
  let datum = LoanDatum { borrower: #"abc", .. }
  let redeemer = Repay
  let ctx = mock_context()
  
  my_validator.spend(Some(datum), redeemer, outref, ctx)
}

test my_validator_fails_unauthorized() fail {
  let datum = LoanDatum { borrower: #"abc", .. }
  let redeemer = Repay
  let ctx = mock_context_without_signature()
  
  my_validator.spend(Some(datum), redeemer, outref, ctx)
}
```

### 8. Error handling rõ ràng

✅ **Với trace messages:**
```aiken
use aiken/builtin.{trace}

validator my_validator {
  spend(datum, redeemer, _outref, tx) {
    expect Some(d) = datum
      |> trace("Datum not found")
    
    when must_be_signed_by(tx, d.owner) is {
      True -> True
      False -> {
        trace("Not signed by owner")
        False
      }
    }
  }
}
```

---

## Ví dụ thực tế

### 1. Hello World Validator

Validator đơn giản yêu cầu signature và message:

```aiken
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}

pub type Datum {
  owner: VerificationKeyHash,
}

pub type Redeemer {
  message: ByteArray,
}

validator hello_world {
  spend(
    datum: Option<Datum>,
    redeemer: Redeemer,
    _output_reference: OutputReference,
    tx: Transaction,
  ) {
    expect Some(Datum { owner }) = datum
    
    and {
      redeemer.message == "Hello, World!",
      list.has(tx.extra_signatories, owner),
    }
  }
}
```

### 2. NFT Minting Policy

Policy cho phép mint NFT chỉ khi signed bởi issuer:

```aiken
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{AssetName, PolicyId}
use cardano/transaction.{Transaction, OutputReference}

pub type MintRedeemer {
  // Chỉ định output_reference để đảm bảo unique NFT
  Mint { output_reference: OutputReference, asset_name: AssetName }
}

validator nft_policy(issuer: VerificationKeyHash) {
  mint(
    redeemer: MintRedeemer,
    policy_id: PolicyId,
    tx: Transaction,
  ) {
    let has_utxo_spent =
      list.any(
        tx.inputs,
        fn(input) { input.output_reference == redeemer.output_reference }
      )
    
    // Sử dụng quantity_of để kiểm tra số lượng mint
    let minted_qty = assets.quantity_of(tx.mint, policy_id, redeemer.asset_name)
    
    and {
      // Quantity = 1
      minted_qty == 1,
      // Có UTXO được spend
      has_utxo_spent,
      // Signed by issuer
      list.has(tx.extra_signatories, issuer),
    }
  }
}
```

### 3. Simple Vesting Contract

Lock ADA và chỉ cho phép unlock sau thời gian nhất định:

```aiken
use aiken/collection/list
use aiken/interval.{Finite}
use cardano/transaction.{Transaction, ValidityRange}

pub type VestingDatum {
  beneficiary: VerificationKeyHash,
  deadline: Int,  // POSIX timestamp
}

validator vesting {
  spend(
    datum: Option<VestingDatum>,
    _redeemer: Void,
    _outref: OutputReference,
    tx: Transaction,
  ) {
    expect Some(VestingDatum { beneficiary, deadline }) = datum
    
    // Check deadline has passed
    expect Finite(lower_bound) = tx.validity_range.lower_bound.bound_type
    
    and {
      lower_bound >= deadline,
      list.has(tx.extra_signatories, beneficiary),
    }
  }
}
```

Xem thêm các ví dụ chi tiết trong thư mục `examples/`.

---

---

## Các lỗi thường gặp và Cách khắc phục

### 1. Lỗi Module Mapping (stdlib v2+)
- **Lỗi**: `VerificationKeyHash` không tìm thấy trong `cardano/cryptography`.
- **Fix**: Chuyển sang `aiken/crypto`. Ví dụ: `use aiken/crypto.{VerificationKeyHash}`.

### 2. Lỗi Parameterized Validator
- **Lỗi**: `Missing validator name`.
- **Fix**: Luôn đặt tên cho validator khi có tham số.
  - ❌ `validator { ... }`
  - ✅ `validator my_validator(param: Type) { ... }`

### 3. Lỗi Dependency Version
- **Lỗi**: Incompatibility giữa Aiken version và stdlib version.
- **Fix**: Với Aiken v1.1.2, sử dụng `aiken-lang/stdlib` phiên bản `v2.1.0` hoặc mới hơn.

---
694: 
695: ## Tài liệu tham khảo

- **Aiken Language Documentation**: https://aiken-lang.org
- **Aiken Standard Library**: https://aiken-lang.github.io/stdlib/
- **Aiken Prelude**: https://aiken-lang.github.io/prelude/
- **Cardano Developer Portal**: https://developers.cardano.org

---

## Workflow khi sử dụng Skill này

1. **Hiểu yêu cầu**: Phân tích logic nghiệp vụ của smart contract
2. **Thiết kế types**: Định nghĩa Datum, Redeemer, và các custom types
3. **Viết validator**: Implement validation logic
4. **Add tests**: Viết unit tests cho các scenarios
5. **Build & check**: `aiken check` để compile và test
6. **Optimize**: Review script size, optimize nếu cần
7. **Document**: Comment code và tạo documentation

---

**Chúc bạn viết smart contract Aiken thành công! 🚀**

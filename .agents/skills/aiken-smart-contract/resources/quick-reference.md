# Aiken Quick Reference

## Common Imports

```aiken
use aiken/collection/list
use aiken/collection/dict
use aiken/interval
use aiken/crypto.{VerificationKeyHash, blake2b_256}
use cardano/transaction.{Transaction, Input, Output, OutputReference}
use cardano/assets.{Value, PolicyId, AssetName}
```

## Type Signatures

### Validators

```aiken
// Spending validator
validator name {
  spend(
    datum: Option<YourDatum>,
    redeemer: YourRedeemer,
    output_reference: OutputReference,
    tx: Transaction,
  ) -> Bool
}

// Minting validator
validator name(param1: Type1, param2: Type2) {
  mint(
    redeemer: YourRedeemer,
    policy_id: PolicyId,
    tx: Transaction,
  ) -> Bool
}

// Withdrawal validator
validator name {
  withdraw(
    redeemer: YourRedeemer,
    credential: Credential,
    tx: Transaction,
  ) -> Bool
}

// Certificate validator
validator name {
  publish(
    redeemer: YourRedeemer,
    certificate: Certificate,
    tx: Transaction,
  ) -> Bool
}
```

## Common Patterns

### Pattern Matching

```aiken
// Option
when maybe_value is {
  Some(value) -> // handle value
  None -> // handle none
}

// Or use expect
expect Some(value) = maybe_value

// Custom types
when status is {
  Active -> // ...
  Pending -> // ...
  Completed -> // ...
}
```

### List Operations

```aiken
// Filter
list.filter(items, fn(item) { item.value > 0 })

// Map
list.map(items, fn(item) { item.id })

// Find
list.find(items, fn(item) { item.id == target_id })

// Any/All
list.any(items, fn(item) { item.is_valid })
list.all(items, fn(item) { item.is_valid })

// Fold
list.foldl(items, 0, fn(acc, item) { acc + item.value })
```

### Dict Operations

```aiken
// Create
let my_dict = dict.new()
  |> dict.insert("key", value)

// Get
when dict.get(my_dict, "key") is {
  Some(value) -> value
  None -> default_value
}

// Check
dict.has_key(my_dict, "key")

// Iterate
dict.foldl(my_dict, init, fn(key, value, acc) { /* ... */ })
```

### Value Operations

```aiken
use cardano/assets.{Value, from_lovelace, add, subtract}

// Create value
let ada_only = from_lovelace(1_000_000)

// Combine values
let combined = add(value1, value2)

// Get specific asset
when dict.get(value, policy_id) is {
  Some(assets) ->
    when dict.get(assets, asset_name) is {
      Some(quantity) -> quantity
      None -> 0
    }
  None -> 0
}
```

### Signature Verification

```aiken
// Check if signed by specific key
list.has(tx.extra_signatories, required_pkh)

// Check multiple signatures
list.all(
  required_signatories,
  fn(pkh) { list.has(tx.extra_signatories, pkh) }
)
```

### Time Validation

```aiken
use aiken/interval.{Finite, Infinite}

// Get current time (lower bound)
expect Finite(current_time) =
  tx.validity_range.lower_bound.bound_type
// ⚠️ current_time là POSIX MILLISECONDS (không phải slot number!)
// = thời gian POSIX của slot trong invalidBefore, được node convert tự động
// Off-chain: dùng (PREVIEW_GENESIS_UNIX_S + slot) * 1000 để tính giá trị tương ứng
// Datum cần lưu POSIX ms (vd: funded_at, due_date) để khớp với current_time on-chain

// Check deadline
current_time >= deadline

// Check time range
and {
  current_time >= start_time,
  current_time <= end_time,
}
```

### Transaction Inputs/Outputs

```aiken
// Find specific input
list.find(
  tx.inputs,
  fn(input) { input.output_reference == target_outref }
)

// Check output to address
list.any(
  tx.outputs,
  fn(output) {
    when output.address.payment_credential is {
      VerificationKeyCredential(pkh) -> pkh == target_pkh
      _ -> False
    }
  }
)

// Get continuing output (same script)
expect Some(continuing_output) = list.head(tx.outputs)
```

### Datum Handling

```aiken
// Inline datum
expect InlineDatum(raw_datum) = output.datum
expect datum: YourDatumType = raw_datum

// Datum hash
expect DatumHash(datum_hash) = output.datum
expect Some(raw_datum) = dict.get(tx.datums, datum_hash)
expect datum: YourDatumType = raw_datum
```

## Common Validations

### Must be signed

```aiken
fn must_be_signed_by(tx: Transaction, pkh: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, pkh)
}
```

### Must have output to address

```aiken
fn must_have_output_to(
  tx: Transaction,
  address: VerificationKeyHash,
  min_value: Value,
) -> Bool {
  list.any(
    tx.outputs,
    fn(output) {
      when output.address.payment_credential is {
        VerificationKeyCredential(pkh) ->
          and {
            pkh == address,
            value_gte(output.value, min_value),
          }
        _ -> False
      }
    }
  )
}
```

### Must spend specific UTXO

```aiken
fn must_spend_utxo(
  tx: Transaction,
  outref: OutputReference,
) -> Bool {
  list.any(
    tx.inputs,
    fn(input) { input.output_reference == outref }
  )
}
```

### Validate NFT mint

```aiken
fn validate_nft_mint(
  tx: Transaction,
  policy_id: PolicyId,
  expected_qty: Int,
) -> Bool {
  expect Some(minted_assets) = dict.get(tx.mint, policy_id)
  
  and {
    dict.size(minted_assets) == 1,
    list.all(dict.values(minted_assets), fn(qty) { qty == expected_qty }),
  }
}
```

## Testing Patterns

```aiken
// Success test
test my_validator_succeeds() {
  let datum = MyDatum { /* ... */ }
  let redeemer = MyRedeemer { /* ... */ }
  let tx = mock_transaction()
  
  my_validator.spend(Some(datum), redeemer, mock_outref(), tx)
}

// Failure test (should fail)
test my_validator_fails_unauthorized() fail {
  let datum = MyDatum { /* ... */ }
  let redeemer = MyRedeemer { /* ... */ }
  let tx = mock_transaction_without_signature()
  
  my_validator.spend(Some(datum), redeemer, mock_outref(), tx)
}

// Trace for debugging
test my_validator_debug() {
  let result = my_validator.spend(...)
    |> trace("Validation result")
  
  result
}
```

## Build & Test Commands

```bash
# Check syntax and run tests
aiken check

# Build (compile to Plutus)
aiken build

# Format code
aiken fmt

# Watch mode (auto rebuild)
aiken check --watch

# Run specific test
aiken check -m "test_name"

# Generate documentation
aiken docs
```

## Common Errors & Solutions

### Error: "Expected type X but found Y"

**Cause**: Type mismatch

**Solution**: Check your type annotations and ensure they match

### Error: "Unreachable pattern"

**Cause**: Using `when` with exhaustive patterns but one case is impossible

**Solution**: Use `expect` instead if you know only one case is possible

### Error: "Unbound variable"

**Cause**: Variable not in scope or typo

**Solution**: Check variable names and imports

### Error: "Recursive definition not allowed"

**Cause**: Aiken doesn't support general recursion directly

**Solution**: Use `list.foldl`, `list.foldr`, or other stdlib functions

## Optimization Tips

1. **Use builtin functions** - They're optimized for on-chain execution
2. **Avoid unnecessary computations** - Short-circuit with `and { ... }`
3. **Reuse values** - Don't recompute the same thing
4. **Minimize script size** - Smaller scripts = lower fees
5. **Use constants** - For fixed values
6. **Inline small functions** - For functions used only once

## Resources

- **Documentation**: https://aiken-lang.org
- **Stdlib**: https://aiken-lang.github.io/stdlib/
- **Prelude**: https://aiken-lang.github.io/prelude/
- **Examples**: https://github.com/aiken-lang/aiken
- **Discord**: https://discord.gg/Vc3x8N9nz2

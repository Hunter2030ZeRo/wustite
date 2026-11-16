# Wustite execution and JIT architecture

## Baseline

Boa remains the ECMAScript parser, AST, bytecompiler, object model, garbage collector, built-ins, and bytecode interpreter. The current VM takes `Source → Parser → AST → ByteCompiler → CodeBlock → VM`. `CodeBlock` has bytecode, register counts, exception handlers, and inline caches.

The interpreter must remain a fully functional fallback. Do not replace Boa's language semantics with a restricted JavaScript subset.

## Planned tiers

1. **Tier 0 — Boa interpreter.** Unchanged execution semantics; collect function-entry and loop-backedge counters with low overhead.
2. **Tier 1 — Wustite JIT.** Lower selected hot Boa bytecode regions into WXIR. Specialize on observed `JsValue` types, insert explicit guards, and compile native code with Cranelift. Fall back when unsupported.
3. **Optional future tier — optimizing JIT.** Only after Tier 1 correctness and reproducible measurements; do not prematurely add LLVM.

## Integration points in Boa 0.22

- `core/engine/src/vm/mod.rs`: `Context::run()` is the synchronous opcode-dispatch loop. Preserve `run_async_with_budget()` and its yielding/budget behavior.
- `core/engine/src/vm/code_block.rs`: per-function `CodeBlock`, bytecode, literals, exception metadata, and inline caches.
- `core/engine/src/vm/call_frame/mod.rs`: `CallFrame` owns program counter, argument/register pointers, lexical environments, and state required on a side exit.
- `core/engine/src/vm/opcode/`: decoded instructions and opcode handlers; use their definitions when building the bytecode-to-WXIR lowering.

## Native-code correctness contract

- Treat all JavaScript values as `JsValue` at the interpreter/native boundary. Preserve `Number` (including NaN, negative zero, and `Infinity`), `BigInt`, strings, objects, coercion, property lookup, and exceptions. Specialized arithmetic requires type guards.
- Native code must not keep untraced or stale pointers to GC-managed values across allocations or callbacks. Define a GC/rooting strategy and stable JIT entry ABI before executing machine code.
- Any failed guard or unsupported bytecode must leave a recoverable interpreter state (program counter, live registers, environments, pending exception, and appropriate side-effect ordering). Avoid executing effects twice.
- `eval`, `with`, accessors, proxies, `try/catch/finally`, async functions, and generators can be **excluded from compilation** initially, not from JavaScript execution. Run them in the Boa VM.
- Preserve runtime limits and host reentry semantics; do not bypass asynchronous execution budgets.
- Cache compiled code with the lifetime and context/realm assumptions that its guards actually justify; do not assume a `CodeBlock` can always share unguarded native code across realms.

## Implementation order

1. Add interpreter-only regression tests and reproducible benchmark baselines.
2. Add `jit` as an opt-in feature flag; record function and loop hotness without changing results.
3. Add bytecode decoder/lowering to a minimal typed WXIR (constants, register moves, numeric arithmetic, branches, returns), independent of Cranelift.
4. Compile only eligible leaf numeric functions; initially guard argument types and return to the interpreter on guard failure.
5. Implement deoptimization/side-exit mapping and proper GC integration before expanding to property accesses, calls, and allocation.
6. Differential-test interpreter and JIT on coercion, overflow, `NaN`, `-0`, exceptions, and Test262; compare against Boa's baseline under identical flags.

## Explicit non-goals for the bootstrap

No JIT implementation, no performance improvement claim, no mass renaming of upstream `boa_*` crates, and no deletion of the Boa VM. The repository is still an interpreter until native execution is implemented and verified.

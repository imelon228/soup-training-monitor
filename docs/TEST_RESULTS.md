# Test Results

## Validation performed during assembly

The core domain modules were compiled with the globally available TypeScript compiler (strict mode):

```bash
tsc --target ES2022 --module commonjs --skipLibCheck --strict \
  --outDir /mnt/data/core-check \
  src/domain/types.ts src/domain/normalizeData.ts src/domain/downsampling.ts \
  src/domain/metrics.ts src/domain/asyncGate.ts src/data/generator.ts
```

Result: **PASS**.

A Node assertion run against those compiled modules verified:

- Exactly 20 unique manifest IDs.
- Exactly 1,000,000 points in `run-020`.
- The midpoint spike exists at source index 500,000 with Loss 7.25.
- The spike remains in the downsampled output for the full range and four progressively narrower viewports containing it.
- NaN and Infinity remain invalid values, not zeroes.
- Unsorted input is stably normalized; duplicates and gaps are detected.
- Last finite loss is used when the final observation is invalid.
- A stale request cannot replace a newer run selection.

Result: **CORE CHECKS: PASS**.

All 28 TypeScript/TSX files under `src/` and `tests/` were also passed through the TypeScript transpiler for syntax validation: **PASS**. The standalone preview inline JavaScript passed `node --check`-equivalent syntax validation: **PASS**.

## Vitest status

A Vitest suite is included under `tests/`. It was **not executed in the assembly environment**, because `npm install` could not reach `registry.npmjs.org` (`EAI_AGAIN` DNS resolution) and therefore dependencies were unavailable. Run `npm install` followed by `npm test` on a network-enabled machine and replace this note with the actual Vitest output.

Do not describe the manual Node core assertions as a Vitest run.

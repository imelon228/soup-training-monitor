# Node core microbenchmark (not Chrome evidence)

The following timings were measured in the creation container using Node.js 22.16.0, with the production data generator and pure TypeScript normalization/downsampling modules compiled to CommonJS. Three consecutive runs were taken. These are **not** Chrome DevTools results, are not CPU-throttled ×4 and do not represent browser rendering, interactions or tab memory.

| Iteration | Generate 1M Float64 points | Normalize/sort check | Downsample 3 metrics |
|---|---:|---:|---:|
| 1 | 83.31 ms | 20.82 ms | 66.18 ms |
| 2 | 76.06 ms | 14.23 ms | 51.25 ms |
| 3 | 78.78 ms | 18.53 ms | 46.09 ms |

Each chart series retained approximately 1,800 points from the full million-point viewport. The Loss series retained the planted spike on every pass.

Do not copy these numbers into the required Chrome Performance before/after table. Capture browser traces and tab memory using `README.md` and this folder's `README.md` protocol.

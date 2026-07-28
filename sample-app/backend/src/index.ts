import express from "express";
import type { Request, Response } from "express";
import { calculateQuote } from "./logic/pricing";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

// このハンドラは薄く保つ: パースとHTTPステータスの割り当てだけを行い、
// 実際の計算は logic/pricing.ts の純粋関数に委ねる。
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/quote", (req: Request, res: Response) => {
  const amount = Number(req.query.amount);
  const taxRate = Number(req.query.taxRate);

  if (!Number.isFinite(amount) || !Number.isFinite(taxRate)) {
    res.status(400).json({ error: "amount and taxRate must be numbers" });
    return;
  }

  try {
    res.json(calculateQuote({ amount, taxRate }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "invalid input" });
  }
});

/* v8 ignore start -- exercised via curl / e2e, not unit tests */
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`backend listening on http://localhost:${port}`);
  });
}
/* v8 ignore stop */

export { app };

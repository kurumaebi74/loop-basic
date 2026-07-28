// 見積計算のロジック本体。Expressのルートハンドラ(src/index.ts)から意図的に
// 切り離した純粋関数にしている — I/O・フレームワーク依存を持たないので、
// サーバーを起動せずユニットテスト(pricing.test.ts)だけで検証できる。
// loop-basic の CLAUDE.md「テストしやすい設計への切り出し」参照。

export interface QuoteInput {
  amount: number;
  taxRate: number;
}

export interface QuoteResult {
  subtotal: number;
  tax: number;
  total: number;
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  if (input.amount < 0) {
    throw new RangeError("amount must not be negative");
  }
  if (input.taxRate < 0) {
    throw new RangeError("taxRate must not be negative");
  }

  const subtotal = roundToCents(input.amount);
  const tax = roundToCents(input.amount * input.taxRate);
  const total = roundToCents(subtotal + tax);

  return { subtotal, tax, total };
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

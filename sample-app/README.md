# sample-app

`loop-basic` の静的解析・テスト運用方針を実際に動かして確認するための、最小構成のTypeScriptフルスタックサンプル。npm workspaces で `backend`(Express)と `frontend`(Vite + React)を持つ。

このアプリ自体に製品としての意味はない。`/implement`・`code-reviewer`・`/test` が実際に何を実行するのかを具体的に確認するための土台。

## 構成

```
sample-app/
  eslint.config.mjs      共有ESLint設定(サイズ/複雑さ/型の締め付けルール、すべて warn)
  tsconfig.base.json      共有tsconfig
  backend/
    src/index.ts           Express。パースとHTTPステータスの割り当てのみ行う薄いハンドラ
    src/logic/pricing.ts    純粋関数として切り出したビジネスロジック
    src/logic/pricing.test.ts  上記の純粋関数だけをvitestでテスト(サーバー起動不要)
  frontend/
    src/App.tsx             backendの /api/health を叩いて表示するだけのReact画面
    e2e/home.spec.ts        Playwright CLIでの確認例
```

## 実行方法

```bash
npm install                 # ルートで一度だけ
npm run typecheck           # backend/frontend 両方の型チェック
npm run lint                # ESLint(サイズ/複雑さ/型ルールはwarn — 導入時点でdrain済み、0件)
npm run test                 # backendの純粋関数ユニットテスト(vitest)
npm run dev:backend          # http://localhost:3001 でAPI起動
npm run dev:frontend          # 別ターミナルで http://localhost:5173 起動(/api は3001にproxy)
npm run test:e2e --workspace frontend   # Playwright(要 npx playwright install chromium)
```

手動確認する場合、APIは `curl`、画面は Playwright CLI を使う(`CLAUDE.md`の「手動確認の使い分け」参照)。

```bash
curl "http://localhost:3001/api/quote?amount=19.99&taxRate=0.08"
# => {"subtotal":19.99,"tax":1.6,"total":21.59}
```

## この構成が示している2つの方針

1. **静的解析は「壊れたら赤くなる」層として積み上げる、ただし初日からブロックしない。** `eslint.config.mjs` のサイズ/複雑さ/型ルールは `warn` で入っている。`error` へ昇格させる判断は `docs/memory/entries/eslint-strictness-ratchet.md` の決定に従う。
2. **ビジネスロジックは純粋関数に切り出す。** `logic/pricing.ts` は Express にもDBにも依存しないので、`pricing.test.ts` はサーバーを起動せず直接呼び出してテストできる。`index.ts` 側は薄いグルーコードのまま保つ。詳細は `docs/memory/entries/pure-function-extraction.md`。

(元ネタ: https://zenn.dev/singularity/articles/stopped-reviewing-my-code )

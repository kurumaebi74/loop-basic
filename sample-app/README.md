# sample-app

`loop-basic` の静的解析・テスト運用方針を実際に動かして確認するための、最小構成のTypeScriptフルスタックサンプル。npm workspaces で `backend`(NestJS)と `frontend`(Vite + React)を持つ。

このアプリ自体に製品としての意味はない。`/implement`・`code-reviewer`・`/test` が実際に何を実行するのかを具体的に確認するための土台。

## 構成

```
sample-app/
  eslint.config.mjs      共有ESLint設定(サイズ/複雑さ/型の締め付けルール、すべて warn)
  tsconfig.base.json      共有tsconfig
  backend/                 NestJS(platform-express)
    src/main.ts             bootstrap
    src/app.module.ts        HealthController・QuoteController・QuoteServiceを束ねるだけ
    src/health/health.controller.ts
    src/quote/quote.controller.ts  パースとHTTPステータスの割り当てのみ行う薄いコントローラ
    src/quote/quote.service.ts      logic/pricing.ts に委ねるだけの薄いサービス(DI境界)
    src/logic/pricing.ts    純粋関数として切り出したビジネスロジック(Nestに依存しない)
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
npm run dev:backend          # http://localhost:3001 でAPI起動(nest start --watch)
npm run dev:frontend          # 別ターミナルで http://localhost:5173 起動(/api は3001にproxy)
npm run test:e2e --workspace frontend   # Playwright(要 npx playwright install chromium)
```

手動確認する場合、APIは `curl`、画面は Playwright CLI を使う(`CLAUDE.md`の「手動確認の使い分け」参照)。

```bash
curl "http://localhost:3001/api/quote?amount=19.99&taxRate=0.08"
# => {"subtotal":19.99,"tax":1.6,"total":21.59}

curl "http://localhost:3001/api/quote?amount=-1&taxRate=0.1"
# => {"message":"amount must not be negative","error":"Bad Request","statusCode":400}
```

## この構成が示している2つの方針

1. **静的解析は「壊れたら赤くなる」層として積み上げる、ただし初日からブロックしない。** `eslint.config.mjs` のサイズ/複雑さ/型ルールは `warn` で入っている。`error` へ昇格させる判断は `docs/memory/entries/eslint-strictness-ratchet.md` の決定に従う。なお `@typescript-eslint/no-extraneous-class` は `off` にしている — NestJSの `@Module` はデコレータだけを持つ空クラスが正しい書き方であり、ドレイン対象の負債ではなくフレームワークとの構造的な不一致のため(理由はeslint.config.mjs本体に明記)。
2. **ビジネスロジックは純粋関数に切り出す。** `logic/pricing.ts` はNestにもDBにも依存しないので、`pricing.test.ts` は `@nestjs/testing` もサーバー起動も使わず直接呼び出してテストできる。`quote.controller.ts`・`quote.service.ts` は薄いグルーコードのまま保つ。詳細は `docs/memory/entries/pure-function-extraction.md`。

(元ネタ: https://zenn.dev/singularity/articles/stopped-reviewing-my-code )

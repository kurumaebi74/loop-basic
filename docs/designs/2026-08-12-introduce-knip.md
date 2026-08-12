# 設計: sample-app への Knip 導入(レポートのみ・非ブロッキング)

- 日付: 2026-08-12
- ステータス: レビュー待ち
- 対応する調査ドキュメント: [docs/investigations/2026-08-12-introduce-knip.md](../investigations/2026-08-12-introduce-knip.md)
- 承認者: (承認ゲート通過時に記入)
- 承認日: (承認ゲート通過時に記入)

## ツール制約に関する注記(重要)

この設計書は、調査ドキュメントで「未解決の疑問」として挙げられていた `npx knip` の実地試し打ちを、**designerサブエージェントの利用可能ツールにBashが含まれていなかったため実行できなかった**上で作成している。代わりに、`sample-app` 配下の全関連ソース(`package.json`各種、`tsconfig.*`、`nest-cli.json`、`eslint.config.mjs`、`shared`/`backend`/`frontend`の全TS/TSXファイル、`vite.config.ts`、`playwright.config.ts`、`.github/workflows/ci.yml`)を実際に読み、import/exportグラフを手動でトレースして誤検知の可能性を評価した。以下の`knip.json`案はこの静的読解に基づく最有力案だが、**実装ステップ1を「実際に `npx knip` を実行して仮説を検証・調整する」ステップとして必須化**することで、調査ドキュメントが求めていた「試し打ち」を実装フェーズの最初に確実に行わせる設計にしている。implementerはこのステップの結果次第で、本設計の`knip.json`案を(スコープの範囲内で)微調整してよい。

## 目的・スコープ

### やること

- `sample-app` に Knip を **レポートのみ・非ブロッキング** で導入する(CLAUDE.md「静的解析・自動チェックの考え方」の「重複コード検出・デッドコード検出は、導入するならまずレポートのみから始める」方針に従う)。
- `sample-app/knip.json` を新規作成し、npm workspaces(`shared`/`backend`/`frontend`)構成に合わせたentry/project/ignore設定を行う。
- `sample-app/package.json` に `knip`・`knip:report` の npm script と `knip` devDependencyを追加する。
- `.github/workflows/ci.yml` に、既存の `checks`/`e2e` ジョブとは独立した非ブロッキングな `knip` ジョブを追加する。
- 導入時点で実際に `npx knip` を実行し、明白な誤検知があれば `knip.json` の `ignore`/`ignoreDependencies`/`entry` で調整する(理由をコメントで残す)。
- 決定事項を共有メモリの新規decisionエントリとして記録する。

### やらないこと(スコープ外)

- Knipの指摘をブロッキング化する(`error`扱いにする、CI必須チェックにする)判断。今回はレポートのみに留め、将来のratchet判断は別topicに委ねる。
- PRコメント投稿等のサードパーティAction連携(調査の選択肢D)。今回は選択肢Bのみ採用する。
- 既存コードの「デッドコード」自体の削除・リファクタリング。Knipが指摘を出しても、レポートを見るだけに留め、コード変更はしない(誤検知調整のための`knip.json`側の変更は除く)。
- `eslint.config.mjs` 側のルール変更。Knipとは独立したツールであり、ESLintの `sonarjs`/`security` 設定等には手を入れない。

## アーキテクチャ・変更概要

| ファイル | 変更内容 |
| --- | --- |
| `sample-app/knip.json`(新規) | npm workspaces構成に合わせたKnip設定。下記「knip.json案」参照。 |
| `sample-app/package.json` | `devDependencies` に `knip` を追加。`scripts` に `knip`・`knip:report` を追加。 |
| `sample-app/package-lock.json` | `npm install` により自動更新(implementerが `npm install` 実行時に反映)。 |
| `.github/workflows/ci.yml` | 独立した `knip` ジョブを新設(`continue-on-error: true`、`needs`なし、既存 `checks`/`e2e` ジョブには一切手を入れない)。 |
| `sample-app/README.md` | 「実行方法」「この構成が示している方針」に一行ずつKnipの説明を追記(任意・低優先度、CIの合否には影響しない)。 |
| `docs/memory/entries/knip-dead-code-detection.md`(新規) | 本トピックの決定を記録するdecisionエントリ。 |
| `docs/memory/entries/eslint-strictness-ratchet-v2.md` | `related_topics` に `introduce-knip` を追記。 |
| `docs/memory/MEMORY.md` | decisionセクションに新規エントリへのリンクを1行追加。 |

### `knip.json` 案

```jsonc
// sample-app/knip.json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "workspaces": {
    ".": {
      // ルート直下にアプリのソースはないが、eslint.config.mjs がルートの
      // devDependencies(eslint/sonarjs/security/prettier/typescript-eslint等)を
      // importして使っている。project/entryを空のままにすると、これらが
      // 「未使用の依存関係」として誤検知される可能性があるため明示的に含める。
      "entry": ["eslint.config.mjs"],
      "project": ["eslint.config.mjs"]
    },
    "shared": {
      // src/index.ts はバレルファイルであり @sample-app/shared パッケージの公開API。
      // entryに指定することで、index.ts自身のexportは
      // 「未使用エクスポート」の対象から除外される(Knipのentry file既定挙動)。
      "entry": ["src/index.ts"],
      "project": ["src/**/*.ts"]
    },
    "backend": {
      // main.ts → app.module.ts → 各Controller/Serviceの依存グラフが起点。
      // *.test.ts は既定でもKnipのテストファイルパターンに含まれる想定だが、
      // entry上書きによる意図しない除外を避けるため明示的に加えておく。
      "entry": ["src/main.ts", "src/**/*.test.ts"],
      "project": ["src/**/*.ts"],
      // backendは vitest をテストランナーとしてのみ使用し、Viteバンドラは使わない
      // (vite.config.ts が存在しない)。Knip の Vite プラグインは `vitest` の
      // devDependency存在だけで自動有効化されてしまうため、存在しない設定を
      // 探しに行くことによるノイズを避けるために明示的に無効化する。
      "vite": false,
      // @nestjs/platform-express と rxjs は、この最小構成のコードからは
      // 直接importされない(NestFactory.create()がplatform-expressを内部で
      // 動的に解決し、rxjsはNestJSの内部実装が利用する)。どちらもNestJSアプリの
      // 一般的な暗黙依存であり、実際に不要というわけではないため無視する。
      "ignoreDependencies": ["@nestjs/platform-express", "rxjs"]
    },
    "frontend": {
      // index.html → src/main.tsx のエントリ解決をKnipが自動で辿れるかは未検証のため
      // 明示。playwright.config.ts・e2e/**.spec.ts もentryに含め、
      // Playwrightのテストコードを「未使用ファイル」として誤検知しないようにする。
      "entry": ["src/main.tsx", "vite.config.ts", "playwright.config.ts", "e2e/**/*.spec.ts"],
      "project": ["src/**/*.{ts,tsx}", "e2e/**/*.ts"]
    }
  },
  // ESLintの ignores (eslint.config.mjs) と揃える。ビルド・テスト成果物を
  // 解析対象に含めると誤検知・実行時間増の原因になる。
  "ignore": ["**/dist/**", "**/coverage/**", "**/playwright-report/**", "**/test-results/**"]
}
```

補足(手動コードリーディングで確認できた根拠、実装ステップ1で裏取りする前提):

- `shared/src/quote.ts`(`QuoteInput`/`QuoteResult`)・`shared/src/health.ts`(`HealthResponse`)は、いずれも `backend`(`quote-query.dto.ts` が `QuoteInput` を、`health.controller.ts` が `HealthResponse` を、`logic/pricing.ts` が `QuoteInput`/`QuoteResult` を再exportしつつ直接import)・`frontend`(`App.tsx` が `HealthResponse`/`QuoteResult` を直接import)の双方から実際に使われている。`@sample-app/shared` はnpm workspacesのシンボリックリンク経由で解決されるため、Knipのモノレポ対応が正しく機能する前提であれば「未使用」と誤検知されないはず。
- `backend`のDIクラス(`HealthController`・`QuoteController`・`QuoteService`)はいずれも通常のTypeScript `import` 文で他ファイル(`app.module.ts`・`quote.controller.ts`)から参照されている(NestのDIは実行時解決だが、静的な`import`自体は存在する)。よってKnipの一般的な「未使用エクスポート」判定でも使用済みと認識されるはずで、調査ドキュメントが懸念していた `ignoreExportsUsedInFile` 相当の追加設定は、少なくとも現状のコードでは不要と判断した(このオプションは「同一ファイル内でのみ使われるexport」を許容する設定であり、NestのDIパターン救済とは意味が異なるため、根拠のない先回り設定はしない)。実行して誤検知が出た場合のみ、実装ステップ1で個別に追加する。
- `class-transformer`・`class-validator`・`reflect-metadata` はいずれも `quote-query.dto.ts`・`main.ts` で直接importされているため誤検知の可能性は低い。

## 実装ステップ

実装順に並んだチェックリスト。`/implement` はこの順序で着手する。

- [ ] ステップ1(必須・最優先・試し打ち): `sample-app/package.json` に `knip` をdevDependencyとして追加し `npm install`(sample-appルートで実行)。上記の `knip.json` 案を `sample-app/knip.json` として作成し、`cd sample-app && npx knip` を実行する。出力を確認し、以下を検証する:
  - `shared`/`backend`/`frontend` で unused files / unused exports が0件か。0件でなければ、指摘内容が「上記補足に書いた既知の使用箇所」を誤検知しているのか、それとも実際にコードから追跡できていないだけの誤検知なのかを判断し、`entry`/`project`/`ignore` で個別に対処する(コード自体は変更しない)。
  - `backend` の `ignoreDependencies`(`@nestjs/platform-express`・`rxjs`)が実際に指摘されるか確認する。指摘されない場合は `ignoreDependencies` エントリを削除してよい(不要な抑制を残さない)。
  - `backend` で `vite: false` により Vite/Vitest プラグイン関連のノイズが出ていないか確認する。
  - `"."`(ルートワークスペース)の `eslint`/`eslint-config-prettier`/`eslint-plugin-prettier`/`eslint-plugin-security`/`eslint-plugin-sonarjs`/`prettier`/`typescript-eslint` が unused dependencies として誤検知されないか確認する。誤検知されれば `ignoreDependencies` に追加する。
  - `@sample-app/shared` へのワークスペース間参照が unresolved / unused と誤判定されないか確認する。
  - 上記調整はすべて `knip.json` 側で行い、理由をコメントとして残す(CLAUDE.mdの「例外はインラインではなく設定ファイルに理由付きで書く」方針に従う)。ブロッキング化は行わない(exit codeを気にする必要はないが、指摘内容そのものは正確に保つ)。
- [ ] ステップ2: `sample-app/package.json` の `scripts` に以下を追加する。
  - `"knip": "knip"`(ローカルで通常のexit codeのまま実行する版。手元で今すぐ直したい時に使う)
  - `"knip:report": "knip --no-exit-code"`(CIから呼ぶ、常にexit code 0で終わる版)
- [ ] ステップ3: `.github/workflows/ci.yml` に、既存の `checks`・`e2e` ジョブとは独立した `knip` ジョブを追加する(下記「CI組み込み案」参照)。既存2ジョブの内容には一切手を加えない。
- [ ] ステップ4(任意・低優先度): `sample-app/README.md` の「実行方法」に `npm run knip:report` の一行、「この構成が示している方針」に「デッドコード・未使用依存の検出(Knip)もレポートのみ・非ブロッキングから始める」旨の一行を追記する。CIの合否には影響しないため、時間が無ければ省略可。
- [ ] ステップ5: ローカルで `cd sample-app && npm run typecheck && npm run lint && npm run test && npm run build` が今までどおり通ることを確認する(Knip導入が既存チェックに影響しないことの確認)。
- [ ] ステップ6: `git add -A && git status` で意図した差分のみが含まれることを確認してからコミットする。

### CI組み込み案

```yaml
  knip:
    name: Knip (dead code / unused deps report, non-blocking)
    runs-on: ubuntu-latest
    # レポートのみ・非ブロッキング。knip自体が --no-exit-code で常にexit 0を返す上に、
    # continue-on-error でも二重に非ブロッキング化しておく(CLAUDE.mdの
    # 「新しいルールは初日からブロックしない」方針)。checks/e2eジョブの成否とは無関係に
    # 実行してよいため needs は付けない。
    continue-on-error: true
    defaults:
      run:
        working-directory: sample-app
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: sample-app/package-lock.json

      - run: npm ci

      - name: Knip (dead code / unused deps report)
        run: npm run knip:report
```

既存の `checks`・`e2e` ジョブへの追記は一切行わない(混ぜない理由: 調査ドキュメント「推奨アプローチ」節、およびCLAUDE.mdの「既存ジョブは失敗=マージ不可を意味する」考え方)。

## テスト戦略

- 何をもって「完了」とするか: (a) `sample-app/knip.json` が存在し `npx knip` がエラーなく完走する(exit codeによらず、ツール自体がクラッシュしないこと)、(b) `npm run knip`・`npm run knip:report` がそれぞれ想定どおりのexit code(前者は指摘があれば非0、後者は常に0)で動く、(c) 既存の `npm run typecheck`/`lint`/`test`/`build` がKnip導入前後で結果が変わらない(影響を与えない)、(d) CIに追加した `knip` ジョブが `continue-on-error: true` のもとで、指摘の有無に関わらずワークフロー全体の成否に影響しないこと。
- 手動確認手順(CLAUDE.md「手動確認の使い分け」に従う。今回はAPI/UIの変更ではなくCI設定・ツール導入のため、該当する既存カテゴリに厳密には当てはまらないが、最も近い「バッチ処理・スクリプト等」の扱いとして直接コマンド実行で確認する):
  1. `cd sample-app && npx knip` を実行し、出力(指摘件数・内容)を確認する。
  2. `cd sample-app && npm run knip:report; echo "exit=$?"` を実行し、`exit=0` になることを確認する(指摘があってもCIで落ちないことのローカル再現)。
  3. `.github/workflows/ci.yml` の構文が壊れていないことを、実際にpush/PRを作成してGitHub Actions上で `knip` ジョブが実行され、`checks`・`e2e` ジョブとは独立して(worst caseで指摘が大量に出ても)ワークフロー全体が成功扱いになることを確認する。

**自動テストを新規作成するか:** しない(理由: 今回の変更は静的解析ツール(Knip)自体の導入とCI設定変更であり、sample-appのアプリケーションコード・ビジネスロジックには一切変更がない。検証対象は「Knipが正しく実行され、非ブロッキングであること」というCI設定・ツール実行の振る舞いそのものであり、これは既存の自動テストスイート(vitest/Playwright)が検証する対象外。テスト戦略の(a)〜(d)は、既存のCI実行自体(`checks`/`e2e`/新設`knip`ジョブが実際にpush/PRごとに動く)が動作確認を兼ねており、これに加えて上記の手動確認手順でローカルからも再現確認する。新たにvitest/Playwrightのテストケースを追加する対象がない)。

## リスク・トレードオフ

- **誤検知によるレポートの形骸化**: `knip.json` の設定不備で誤検知が多発すると、「レポートを見る」行為自体が無視されるようになるリスクがある。実装ステップ1で試し打ちし、明白な誤検知は個別に潰すことで軽減する。ただし全ての誤検知を導入初日に潰しきる保証はなく、継続的な調整が必要になる可能性がある。
- **可視性の低さ(選択肢Bの本質的なトレードオフ)**: PRコメント等の能動的な通知(選択肢D)を採用しないため、CIログを能動的に見に行かない限り指摘に気づかれない。今回はスコープ外としたが、Knipのレポートが継続的に無視される状況が続く場合、将来PRコメント連携や `report → error` ratchetへの昇格を再検討する価値がある。
- **CI実行時間の増加**: 新規ジョブ1つ分、CI全体の総実行時間はわずかに増える(`checks`/`e2e`とは独立ジョブのため、並列実行され全体のクリティカルパスへの影響は小さい想定)。
- **Knipのバージョン追従**: `knip.json` の `$schema` は `knip@5` の範囲を指すのみでパッチバージョンを固定しない。将来のKnipのマイナー/メジャーアップデートで検出ロジックが変わり、指摘内容が増減する可能性があるが、非ブロッキング運用のため実害は小さい。
- **`ignoreDependencies`/`vite: false` 等の抑制が将来の実コード変更で陳腐化するリスク**: 例えば将来backendが本当にViteを使い始めた場合、`vite: false` が誤って有効なチェックを抑制し続ける可能性がある。抑制項目にはコメントで理由を明記しているため、将来のtopicで気づいた際に見直せるようにしてある。

## ロールバック方針

非ブロッキングな追加のみのため、ロールバックは低リスク・低コスト。問題が起きた場合(例: CI実行時間の許容できない増加、`--no-exit-code`/`continue-on-error` の二重設定にもかかわらず何らかの理由でCIがブロックされる不具合等)は以下の手順で切り戻す:

1. `.github/workflows/ci.yml` から `knip` ジョブを削除する。
2. `sample-app/knip.json` を削除する。
3. `sample-app/package.json` から `knip`・`knip:report` scriptと `knip` devDependencyを削除し、`npm install` でlockファイルを更新する。
4. `sample-app/README.md` に追記していた場合は該当行を削除する。
5. 共有メモリの `knip-dead-code-detection` エントリは削除せず、`status: superseded` にして経緯を残す(CLAUDE.mdの記憶運用ルールに従う)。

既存の `checks`・`e2e` ジョブやアプリケーションコードには一切手を加えていないため、ロールバックによる副作用はない。

## スキル化候補の検討

調査ドキュメントが挙げていた「Knip等の新規静的解析ツールはレポートのみ・非ブロッキングから始め、CI組み込みは既存ブロッキングジョブと分離する」という型について検討した。この型は `docs/memory/entries/eslint-strictness-ratchet-v2.md`(および superseded の `eslint-strictness-ratchet`)が確立した「新しいルールはwarn/report-onlyで導入し、drainしてからerrorに昇格させる」というratchet思想の延長線上にあるが、対象が「ESLintルール」ではなく「別ツール(Knip)の新規導入」である点が異なるため、今回は独立した新規decisionエントリ `knip-dead-code-detection` として作成する(調査ドキュメントの未解決事項への回答)。

このエントリの `related_topics` は現時点で `[introduce-knip]` の1件のみであり、スキル化候補の閾値(3topic以上)には遠く及ばない。**スキル化候補には該当しない。** 今後、別のtopicで新規静的解析ツール(例: jscpd等)を導入する際にこのエントリが再度参照・適用されたら `related_topics` に追記し、3件に達した時点で改めてスキル化を検討する。

## 設計レビュー結果

`design-reviewer` による自動レビュー(最大2ラウンド、`/design` 実行時)の記録。

| ラウンド | 判定 | 主な指摘 |
| --- | --- | --- |
| 1 | (レビュー未実施) | |
| 2(ラウンド1がMAJORの場合のみ) | | |

未解決のMAJORが残った場合: (なければ「なし」)

## コードレビュー結果

`code-reviewer` による自動レビュー(最大2ラウンド、`/implement` 実行時)の記録。

| ラウンド | 判定 | 主な指摘 |
| --- | --- | --- |
| 1 | | |
| 2(ラウンド1がMAJORの場合のみ) | | |

未解決のMAJORが残った場合: (なければ「なし」。テストレポートにも引き継ぐこと)

## 人間確認ゲート記録

| 日時 | 判断 | コメント |
| --- | --- | --- |
|  | 承認 / 修正依頼 / 差し戻し |  |

---
name: knip-dead-code-detection
type: decision
status: active
related_topics: [introduce-knip]
created: 2026-08-12
updated: 2026-08-12
---

<!-- related_topics には、この規約/落とし穴を実際に適用したtopic-slugを追記していく(convention/pitfallで特に重要)。
     3つ以上になったらスキル化候補(詳細はCLAUDE.mdの「再利用パターンのSkill化」)。 -->

sample-appにデッドコード・未使用依存検出ツール(Knip)を導入する場合、CLAUDE.mdの静的解析方針どおり**レポートのみ・非ブロッキング**から始める。CI組み込みは `knip --no-exit-code` に加え GitHub Actionsの `continue-on-error: true` も併用し(二重の非ブロッキング化)、既存の `checks`(typecheck/lint/test/build)・`e2e` ジョブとは**独立したジョブ**として分離する(`needs` を付けず、他ジョブの成否と無関係に実行する)。指摘をブロッキング化(error昇格)するかどうかの判断は今回のスコープ外とし、レポートの指摘状況を見てから別途判断する。

**背景:** [docs/investigations/2026-08-12-introduce-knip.md](../../investigations/2026-08-12-introduce-knip.md) と [docs/designs/2026-08-12-introduce-knip.md](../../designs/2026-08-12-introduce-knip.md) で確定した。`docs/memory/entries/eslint-strictness-ratchet-v2.md` が確立した「新しいルールはwarn/report-onlyで導入し、drainしてからerrorに昇格させる」というratchet思想の延長線上にあるが、対象が「ESLintルールの追加」ではなく「別ツール(Knip)の新規導入」である点が異なるため、既存エントリを拡張せず独立エントリとして新設した(既存エントリは「昇格済みルールの記録として閉じておく」と明記されていたため)。`knip.json` はnpm workspaces(`shared`/`backend`/`frontend`)ごとに `entry`/`project` を定義し、NestJSのDIパターン・sharedパッケージのバレルエクスポート・vitestのみでVite未使用のbackend、といった sample-app固有の誤検知リスクは `ignore`/`ignoreDependencies`/`vite: false` 等で個別に抑制し、理由をコメントで残す方針を取った(詳細は設計ドキュメント参照)。

**適用範囲:** sample-appに新規の静的解析・デッドコード検出ツールを追加/変更する場面。特に「レポートのみで導入するか」「CI組み込みをブロッキングジョブと混ぜるか分離するか」を判断する際にこのエントリを参照する。Knip自体の`knip.json`設定の詳細(workspace別entry等)はこのエントリではなく設計ドキュメントを参照すること(このエントリは決定の要旨のみを保持する)。

**関連:** [[eslint-strictness-ratchet-v2]]

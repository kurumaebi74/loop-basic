// @ts-check
import tseslint from "typescript-eslint";

// loop-basic の「静的解析・自動チェックの考え方」に沿った設定。
// 参照: ../CLAUDE.md の「静的解析・自動チェックの考え方(壊れたら赤くなる仕組み)」
//
// - サイズ/複雑さ/型の締め付けルールは、既存コードを壊さないよう
//   まず warn(非ブロッキング)で導入する。
// - 対象コードの指摘がゼロになったら error に昇格させる(drain してから ratchet)。
//   昇格は docs/memory/entries/eslint-strictness-ratchet.md の手順に従うこと。
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "**/playwright-report/**", "**/test-results/**"],
  },
  ...tseslint.configs.strict,
  {
    rules: {
      // サイズ・複雑さの締め付け(記事「②」相当)。まずは warn。
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true }],
      complexity: ["warn", 10],
      "max-depth": ["warn", 4],

      // 型の締め付け(strictプリセットに加えて明示)。まずは warn。
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
);

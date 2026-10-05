# VOCAL LISTENING LAB

**声を聴く。違いをつかむ。自分の歌に持ち帰る。**

`chanwata/bass-study`を土台にした、日本語のボーカル鑑賞・実践教材です。14レッスン・42曲の選曲案を通じて、声色、言葉、リズム、フレーズ、共演者との関係、録音の音作りを学びます。

## 現在の状態

2026-10-05：14レッスン・42曲、聴き比べ、実験、用語、端末内の進捗・メモとJSONでの保存・復元を実装。Spotifyは41曲の候補トラックへのリンクと埋め込み、山下達郎「RIDE ON TIME」の検索リンクを掲載しています。42組すべての人物紹介に略歴、声質、フレージング、録音・ミックスの聴きどころ、再現実験を書き、曲カードからも読めます。再現実験は本人の録音設定を示すものではありません。選曲表とリンク先の録音版は候補で、実聴レビューを経て確定します。各曲の詳細解説は3曲が初稿、残り39曲にはレッスンごとの聴き方と曲固有の観察点を掲載しています。

## 開発

Python 3とNode.jsを使用します。外部パッケージは不要です。

```sh
python3 scripts/build.py
node --test tests/course.test.js
python3 -m http.server 8000 --directory dist
```

`src/spotify.json`の候補リンク、`src/artist_profiles.jsonl`の人物原稿、`src/engineering_experiments.json`の実験案、`docs/02-editorial-draft.md`の教材原稿から`src/course.json`と`dist/index.html`を生成します。GitHub Actionsで同じビルド・検証を実行し、GitHub Pagesに配置します。

## 設計資料

1. [全体設計](docs/01-product-design.md) — 目的、bass版からの継承、画面構成、保存・Spotifyの仕様、対象範囲。
2. [教材・掲載文案](docs/02-editorial-draft.md) — 全14回の導入・問い・課題、42曲の選曲と観察文案、3曲の詳細原稿、人物・機材・用語・画面文案。
3. [実装計画](docs/03-implementation-plan.md) — データ構造、移植箇所、作業順、確認項目、公開条件。
4. [調査根拠と未確定事項](docs/04-evidence-and-decisions.md) — 調査したコードと一次資料、設計上の仮定、録音確認の残作業。

## 方針

- 14日は目安。1回15分の短いルートと、25〜40分の深掘りルートを用意する。
- 聴くだけでも完了できる。発声の実験は任意で、無理のない声域・音量で行う。
- 人物紹介を曲・聴き比べ・実験につなぐ。
- 記録された事実、聴き方の提案、自分で試す設定を区別する。
- iPhone優先。進捗・メモは端末保存し、JSONで移行できるようにする。

参照元：[bass-study](https://github.com/chanwata/bass-study/tree/3068c8b214bf66f414a84f5384a3fd894577046c)。

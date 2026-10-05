# VOCAL LISTENING LAB — 調査根拠と判断記録

確認日：2026-10-05 JST。

## 1. リポジトリの確認済み事項

GitHubのchanwataアカウントの接続で、次のリポジトリを確認した。

| 対象 | 確認結果 |
|---|---|
| [chanwata/bass-study](https://github.com/chanwata/bass-study) | public、既定main。48曲、14回、39人のデータを確認 |
| 参照コミット | [`3068c8b214bf66f414a84f5384a3fd894577046c`](https://github.com/chanwata/bass-study/commit/3068c8b214bf66f414a84f5384a3fd894577046c) |
| 参照時点の直近変更 | 曲のプレーヤー付近から元プレイリストを開くリンクの追加 |
| [chanwata/vocal-study](https://github.com/chanwata/vocal-study) | public、作業開始時点では空。内容取得の404本文は「This repository is empty」 |

bass-studyの固定コミットに対し、README、再帰的ファイル一覧、`src/app.js`、`course.json`、`rig_notes.json`、`template.html`、CSS3ファイル、`scripts/build.py`、`tests/course.test.js`、`.github/workflows/pages.yml`を確認した。

### コードから分かったこと

- `course.json`に曲、14回、人物、用語、比較、出典、Spotify IDを収録。
- `rig_notes.json`をビルド時に結合。PythonでCSS・JS・データをHTMLへ埋め込む。
- 保存キーは`bass-listening-lab-v1`。日・曲・メモを端末内に保存し、TXT／JSON出力、JSON復元がある。
- Spotifyの曲別埋め込みと元プレイリストのリンクが別にある。
- 曲6と34の録音違いをUIとテストで扱う。vocal版にはこの番号を持ち込まない。
- モバイルの折りたたみ目次、44pxを意識した操作、縮小モーション、印刷用CSSがある。
- GitHub Actionsはmainへのpushでテスト・ビルド後にPagesへ公開する構成。
- 再帰的ファイル一覧に`AGENTS.md`やライセンスファイルは見当たらなかった。利用者が所有する元リポジトリを基に設計する。第三者コンテンツの転載権が含まれるとはみなさない。

### この設計作業で実施していないこと

bass版の全曲の実聴・再監査、公開中サイトの実機UX検証、vocal候補42曲の全件メタデータ確定、Spotifyプレイリストの作成、アプリの実装、Actions設定、Pages公開。コードを読んだ事実と、動作を検証した事実を混同しない。

## 2. 参照した外部資料

全URLは2026-10-05に取得または検索結果で確認。本文は独自に要約し、原文の長い転載や歌詞引用は行っていない。

| ID | 資料 | この設計での用途・確認範囲 |
|---|---|---|
| S1 | [NIDCD — Taking Care of Your Voice](https://www.nidcd.nih.gov/health/taking-care-your-voice) | 本文確認。声がれ・疲労時の発声回避、声の問題の相談先。教材の短い中止案内の根拠 |
| S2 | [Shure — How to Record and Mix Vocals](https://www.shure.com/en-US/insights/how-to-record-and-mix-vocals) | 本文確認。マイク距離と近接効果、録音とミックス、プリディレイの定義を参照。特定歌手の機材を示す資料ではない |
| S3 | [Ableton — Live Audio Effect Reference](https://www.ableton.com/en/live-manual/12/live-audio-effect-reference/) | 公式検索結果を確認。処理の分類とコンプの機能の基礎資料。実機別の手順を書く際に該当節を精読する |
| S4 | [Rock & Roll Hall of Fame — Sam Cooke](https://rockhall.com/inductees/sam-cooke/) | ページおよび検索結果を確認。Soul Stirrersからポップへの経歴の根拠 |
| S5 | [Rock & Roll Hall of Fame — Aretha Franklin](https://rockhall.com/inductees/aretha-franklin/) | ページと関連する公式紹介を確認。人物紹介、1987年の殿堂入り |
| S6 | [Billie Holiday公式 — Bio](https://billieholiday.com/bio/) | ページおよび検索結果を確認。歌唱以外の創造性を含む人物紹介 |
| S7 | [ABKCO — Sam Cooke](https://www.abkco.com/artist/sam-cooke/)、[The Complete Keen Years](https://www.abkco.com/news-feed/sam-cooke-keen-years/) | レーベル公式検索結果を確認。You Send Meの1957年Keen録音を候補にする根拠 |
| S8 | [宇多田ヒカル公式 — First Love 15th Anniversary Edition](https://www.utadahikaru.jp/music/90so_nk0ffe/) | 公式検索結果を確認。2014年リマスターと1999年ライブが存在し、版を分ける必要があること |
| S9 | [Michael Jackson公式 — Off the Wall CD](https://store-us.michaeljackson.com/products/michael-jackson-off-the-wall-cd)、[Picture Disc](https://store-us.michaeljackson.com/products/off-the-wall-picture-disc-vinyl-lp) | 公式検索結果を確認。1979年アルバムとRock With Youの収録。Spotifyの同一性は未確認 |
| S10 | [Sony Music — 宇多田ヒカル PROFILE](https://www.sonymusic.co.jp/Music/Info/utadahikaru/profile/) | 公式検索結果を確認。1999年のFirst Love発売 |
| S11 | [Spotify — Embeds](https://developer.spotify.com/documentation/embeds)、[Creating an Embed](https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed) | ページ確認。公式の埋め込み方式を利用する設計 |
| S12 | [Spotify — Troubleshooting](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting) | ページ確認。再生環境の制約を考慮する。実装時に現状を再確認 |
| S13 | [GitHub Docs — Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) | ページ確認。Actionsによる公開方式の確認。対象リポジトリのPages設定は未変更 |

S1をもとに医療効果を保証しない。S2・S3の一般的な技術解説を、特定録音の制作手法の証拠として使わない。文案の比較条件・設定例は教材編集上の提案であり、引用資料がその値を一律に推奨しているという意味ではない。

## 3. 判断記録

| 判断 | 理由 | 後から変更できる範囲 |
|---|---|---|
| 14回を維持、42曲へ整理 | bass版の短期学習の流れを維持し、毎回2曲＋発展1曲に揃える | 学習の深さに応じて曲を追加。ただしIDは保持 |
| 鑑賞を中心に、発声は任意 | 元教材の文化・人物・聴き方を学ぶ目的を継ぐ。声域や経験が未指定でも利用可能 | 希望があれば発声指導を専門家レビュー付きで別設計 |
| 複数ジャンルと日本語6曲 | リズム・声色・言葉・録音を異なる文脈で比較する | 嗜好が分かれば発展枠を優先して調整 |
| 人物とグループを分ける | バンド名だけでは歌唱担当やコーラスの役割が不明になる | クレジット確認後に関連表示を充実 |
| 初期版は静的構成 | bass版を活かし、導入と運用を小さく保つ | 録音・同期・教師コメント等が必要なら再検討 |
| Spotifyリスト未設定も正常状態 | ユーザーからボーカル用リストの指定はなく、GitHub接続はSpotifyの操作権限ではない | 確認済みリストURLの追加で有効化 |
| 録音を内部IDで管理 | 曲順や配信IDが変わっても進捗を守る | 訂正・代替は履歴を保持 |
| 代表3曲を詳細原稿化 | 実装と編集の完成形を具体化し、全曲へ展開できるようにする | 実聴後に対象箇所や説明を修正 |
| 写真やジャケットを必須にしない | 文字と図だけで教材を成立させる | 利用可能な権利・クレジットが確認できた素材を追加 |
| 今回は文書だけを保存 | 利用者の「まず全体設計・文章・実装計画」の依頼範囲 | アプリ構築は次の工程 |

## 4. 未確定事項と扱い

| 項目 | 現状 | 実装を進める際の扱い |
|---|---|---|
| 主な受け取り手の経験・好み | 未指定 | 一般の成人の初心者〜アマチュアを仮定。設計を止めない |
| 42曲の最終採否 | 候補 | P1の照合と教育目的の確認で確定 |
| Spotifyの曲ID | 未確認 | 架空値を入れない。確認してから教材に組み込む |
| ボーカル用プレイリスト | 未指定・未作成 | null。個別の確認済みリンクで先へ進める |
| 全曲の聴感分析 | 問いを中心とする初稿 | 対象版を聴いて内容を校閲し、レビュー日を記録 |
| 歌唱者の詳細クレジット | 未確定の曲あり | 一次クレジットを調べ、特に複数リード曲を確認 |
| 残る39曲の詳細本文 | 観察文案まで | P3で共通仕様に沿って執筆 |
| 全人物の詳細原稿 | 3例＋テンプレート | 採用曲の歌唱担当確定後に完成 |
| 使用機材・制作工程 | 曲別の調査未完 | 不明を許容し、一般論から補完しない |
| 発声用語の専門的増補 | 簡潔な初稿のみ | 音声科学資料・専門家レビューを追加してから詳述 |
| 実機のUX・公開 | 未実施 | P2〜P6で検証。設計書の存在だけで完了扱いにしない |

## 5. 公開前に残してはいけない不整合

1. 曲の埋め込みが対象テイクと違うのに「この録音」と表示する。
2. 別時期の使用マイクを、当該レコーディングでの使用機材と書く。
3. 聞こえる声色から、身体の使い方や健康状態を断定する。
4. 保存できていないのに保存済みと表示する。
5. bass版のキー、バックアップ形式、固定曲数、プレイリストIDが混ざる。
6. 確認できていない音声・実機テストを実施済みと報告する。

この記録と他の設計書に矛盾が生じた場合は、原稿・データ・実装を一緒に訂正し、確認済みの根拠を残す。

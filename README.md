# oss-pulse

GitHub OSSの保守状態を、依存パッケージなしで診断するNode.js CLI。

公開リポジトリのStars/Forks、未対応のIssue/PR、最新リリース、最新コミットを取得し、メンテナが次に見るべき項目をMarkdownまたはJSONで出力します。GitHub tokenなしでも動きますが、APIレート制限を避けるため継続利用では `GITHUB_TOKEN` を推奨します。

## Quick start

Node.js 20以上で実行できます。

```bash
npx oss-pulse vercel/next.js
npx oss-pulse https://github.com/toki0001/My-firstCompany --days 14 --json
```

ローカルで試す場合:

```bash
node src/cli.mjs owner/repo
npm test
```

## 出力を見るポイント

- **保守スコア** — 対応待ちのPR/Issueと、リリース・コミットの停滞を1つの目安にまとめます。
- **Stale items** — 指定日数以上更新されていないIssue/PRを古い順に表示します。
- **Snapshot** — リポジトリの採用・利用シグナルと、最後の活動日を確認できます。Issue/PRの件数はAPIから取得した最大100件のサンプルです。

スコアはプロジェクトの品質や安全性を保証するものではありません。見るべき場所を絞るためのヒューリスティックです。

## GitHub token

```bash
# PowerShell
$env:GITHUB_TOKEN = "ghp_your_token"
node src/cli.mjs owner/repo

# macOS / Linux
GITHUB_TOKEN=ghp_your_token node src/cli.mjs owner/repo
```

Tokenはファイルへ保存せず、環境変数または `--token` で渡してください。公開リポジトリだけを対象にし、GitHubの利用規約とレート制限に従ってください。

## Roadmap

- [x] 依存なしのCLIとMarkdown/JSON出力
- [x] stale Issue/PRの検出
- [x] リポジトリの活動シグナルの要約
- [ ] GitHub Actions用の定期レポート
- [ ] ラベル・レビュー待ち・コントリビューター動向の検出
- [ ] 複数リポジトリをまとめるメンテナダッシュボード

機能追加より先に、実際のOSSメンテナのフィードバックを優先します。IssueやPR歓迎です。

## License

MIT

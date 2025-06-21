# Organization Secrets セットアップガイド

このガイドでは、20以上のリポジトリでClaude Max OAuth認証を一元管理するためのOrganization Secretsの設定方法を説明します。

## 🎯 **Organization Secretsの利点**

- **一元管理**: 1箇所の更新で全リポジトリに反映
- **セキュリティ**: 各リポジトリに個別設定する必要がない
- **効率性**: トークン更新時の作業量を大幅削減
- **一貫性**: 全リポジトリで同じ認証情報を使用

## 🔧 **初期セットアップ**

### 1. Organization Secretsの作成

1. **Organization Settings**にアクセス
   ```
   https://github.com/organizations/YOUR_ORG_NAME/settings/secrets/actions
   ```

2. **New organization secret**をクリック

3. 以下の3つのSecretsを作成：

   **CLAUDE_ACCESS_TOKEN**
   ```
   Name: CLAUDE_ACCESS_TOKEN
   Secret: [Claude.aiのsessionKey値]
   Repository access: Selected repositories (または All repositories)
   ```

   **CLAUDE_REFRESH_TOKEN**
   ```
   Name: CLAUDE_REFRESH_TOKEN
   Secret: [Claude.aiのrefresh_token値]
   Repository access: Selected repositories (または All repositories)
   ```

   **CLAUDE_EXPIRES_AT**
   ```
   Name: CLAUDE_EXPIRES_AT
   Secret: [有効期限のタイムスタンプ（ミリ秒）]
   Repository access: Selected repositories (または All repositories)
   ```

### 2. トークン値の取得方法

1. **Claude.ai**にログイン
2. **開発者ツール**（F12）を開く
3. **Application** → **Storage** → **Cookies** → **claude.ai**
4. 以下の値をコピー：
   - `sessionKey` → `CLAUDE_ACCESS_TOKEN`
   - `refresh_token` → `CLAUDE_REFRESH_TOKEN`

### 3. 有効期限の計算

ブラウザのコンソールで実行：
```javascript
// 現在時刻から24時間後のタイムスタンプを計算
const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
console.log('CLAUDE_EXPIRES_AT:', expiresAt);
```

## 📁 **各リポジトリでの設定**

### ワークフローファイルの配置

各リポジトリの`.github/workflows/claude.yml`：

```yaml
name: Claude PR Assistant

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]

jobs:
  claude-code-action:
    if: contains(github.event.comment.body, '@claude') || contains(github.event.issue.body, '@claude')
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Run Claude PR Action
        uses: Akira-Papa/claude-code-action@beta
        with:
          use_oauth: "true"
          # Organization Secretsから自動取得
          claude_access_token: ${{ secrets.CLAUDE_ACCESS_TOKEN }}
          claude_refresh_token: ${{ secrets.CLAUDE_REFRESH_TOKEN }}
          claude_expires_at: ${{ secrets.CLAUDE_EXPIRES_AT }}
          timeout_minutes: "60"
```

## 🔄 **トークン更新プロセス**

### 自動監視システム

このリポジトリ（claude-code-action）で以下が自動実行されます：

- **毎日6時・18時（UTC）**: トークン有効期限チェック
- **アラート発生時**: 以下の通知が送信
  - GitHub Issues（有効な場合）
  - ワークフローサマリー
  - Slack通知（設定済みの場合）

### 手動更新手順

アラートを受信したら：

1. **新しいトークンを取得**
   - Claude.aiにログイン
   - 開発者ツールでsessionKeyとrefresh_tokenを取得

2. **Organization Secretsを更新**
   ```
   https://github.com/organizations/YOUR_ORG_NAME/settings/secrets/actions
   ```
   - `CLAUDE_ACCESS_TOKEN`: 新しいsessionKey
   - `CLAUDE_REFRESH_TOKEN`: 新しいrefresh_token
   - `CLAUDE_EXPIRES_AT`: 新しい有効期限

3. **即座に全リポジトリに反映**
   - 個別のリポジトリ設定は不要
   - 次回のワークフロー実行時から新しいトークンを使用

## 🔍 **監視とトラブルシューティング**

### 監視ワークフローの確認

```bash
# 最新の監視結果を確認
gh run list --workflow=auto-token-refresh.yml --repo YOUR_ORG/claude-code-action --limit 5

# 詳細ログを確認
gh run view RUN_ID --repo YOUR_ORG/claude-code-action
```

### よくある問題

**Q: Organization Secretsが認識されない**
A: Repository accessの設定を確認してください。対象リポジトリが含まれている必要があります。

**Q: 一部のリポジトリでエラーが発生**
A: 各リポジトリのワークフローファイルでSecrets名が正しく参照されているか確認してください。

**Q: トークンの有効期限がわからない**
A: 監視ワークフローを手動実行して現在の状態を確認できます。

## 📊 **運用のベストプラクティス**

1. **定期的な監視**: アラートを無視せず、速やかに対応
2. **バックアップ**: 重要な認証情報は安全な場所に保管
3. **アクセス制御**: Organization Secretsへのアクセス権限を適切に管理
4. **ログ確認**: 定期的にワークフローログを確認して異常がないかチェック

## 🚀 **展開後の確認**

1. **テスト実行**
   ```bash
   # 監視ワークフローを手動実行
   gh workflow run auto-token-refresh.yml -f force_check=true --repo YOUR_ORG/claude-code-action
   ```

2. **各リポジトリでの動作確認**
   - いくつかのリポジトリでPRを作成
   - `@claude`コメントを投稿
   - 正常に応答することを確認

3. **アラート機能の確認**
   - Slack通知の設定（オプション）
   - GitHub Issues機能の有効化（オプション）

これで、20以上のリポジトリでClaude Max認証を効率的に管理できるシステムが完成します！ 
# Claude OAuth Token Refresh Guide

Claude Max のOAuthトークンは24時間で期限切れになります。このガイドでは、自動更新システムの設定と使用方法について説明します。

## 自動更新システムの概要

このリポジトリには、Claude OAuthトークンを自動的に管理する2つのワークフローが含まれています：

1. **Token Check Workflow** (`token-check.yml`) - 毎日午前9時（UTC）にトークンの有効期限をチェック
2. **Auto Token Refresh Workflow** (`auto-token-refresh.yml`) - 毎日午前6時（UTC）にトークンを自動更新

## 初期設定

### 1. GitHub Secretsの設定

以下のシークレットをリポジトリに設定してください：

```bash
# Claude CLIでログイン後、~/.claude/.credentials.jsonから値を取得
gh secret set CLAUDE_ACCESS_TOKEN --body "your_access_token"
gh secret set CLAUDE_REFRESH_TOKEN --body "your_refresh_token"  
gh secret set CLAUDE_EXPIRES_AT --body "timestamp"

# オプション: Slack通知用
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/..."
```

### 2. 手動でのトークン更新スクリプト実行

```bash
# スクリプトを実行してトークンを更新
node scripts/refresh-oauth-token.js

# 出力された値をGitHub Secretsに設定
gh secret set CLAUDE_ACCESS_TOKEN --body "新しいアクセストークン"
gh secret set CLAUDE_REFRESH_TOKEN --body "新しいリフレッシュトークン"
gh secret set CLAUDE_EXPIRES_AT --body "新しい有効期限"
```

## トークン期限切れ時の対処

### 方法A: 自動更新スクリプトの使用（推奨）

GitHub Actionsの「Auto Claude OAuth Token Refresh」ワークフローを手動実行：

```bash
# ワークフローを手動実行
gh workflow run auto-token-refresh.yml

# 実行状況を確認
gh run list --workflow=auto-token-refresh.yml
```

### 方法B: 手動更新

1. Claude CLIで再ログイン：
   ```bash
   claude login
   ```

2. 新しい認証情報をGitHub Secretsに設定：
   ```bash
   # ~/.claude/.credentials.jsonから値を取得して設定
   gh secret set CLAUDE_ACCESS_TOKEN --body "新しいトークン"
   gh secret set CLAUDE_REFRESH_TOKEN --body "新しいリフレッシュトークン"
   gh secret set CLAUDE_EXPIRES_AT --body "新しい有効期限"
   ```

## 自動化されたプロセス

### 日次チェック（午前9時 UTC）

- トークンが2時間以内に期限切れする場合：
  - GitHubにIssueを自動作成
  - Slackに通知（設定されている場合）

### 日次更新（午前6時 UTC）

- トークンが6時間以内に期限切れする場合：
  - 自動的にトークンを更新
  - GitHub Secretsを新しい値で更新
  - 関連するIssueを自動クローズ
  - 成功通知を送信

## トラブルシューティング

### よくある問題

1. **認証情報ファイルが見つからない**
   ```
   Error: 認証情報ファイルが見つかりません
   ```
   → `claude login` でClaude CLIにログインしてください

2. **トークン更新失敗**
   ```
   Error: トークン更新失敗
   ```
   → Claude CLIで再ログインしてリフレッシュトークンを更新してください

3. **GitHub Secrets更新失敗**
   ```
   Error: Failed to update secrets
   ```
   → リポジトリの権限とGitHub CLIの認証を確認してください

### ログの確認

```bash
# 最新のワークフロー実行を確認
gh run list --limit 5

# 特定のワークフロー実行の詳細を確認
gh run view <run-id>

# ワークフローのログを確認
gh run view <run-id> --log
```

## 通知設定

### Slack通知（オプション）

Slack通知を有効にするには、Slack Webhookを設定してください：

1. Slackワークスペースでアプリを作成
2. Incoming Webhookを有効化
3. Webhook URLをGitHub Secretsに設定：
   ```bash
   gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/..."
   ```

### GitHub Issue通知

トークンが期限切れ間近になると、自動的にGitHubにIssueが作成されます。Issueには以下の情報が含まれます：

- 期限切れまでの時間
- 更新手順
- 自動更新ワークフローへのリンク

## セキュリティ注意事項

- トークン情報は必ずGitHub Secretsに保存してください
- スクリプトやワークフローファイルに認証情報を直接記述しないでください
- 定期的にアクセスログを確認してください

## サポート

問題が発生した場合は、以下を確認してください：

1. GitHub Actionsのワークフロー実行ログ
2. Claude CLIの認証状態（`claude auth status`）
3. GitHub Secretsの設定状況

それでも解決しない場合は、Issueを作成してサポートを求めてください。 
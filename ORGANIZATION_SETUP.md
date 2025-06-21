# Organization Secrets設定ガイド

## 🎯 概要

このガイドでは、FREEDOM-co-jp Organization全体でClaude OAuth Tokenを一元管理するための設定方法を説明します。

## 📋 テスト結果（2025年6月21日）

| リポジトリ | 状態 | 備考 |
|------------|------|------|
| `claude-code-base-action` | ✅ 成功 | 監視システム正常動作 |
| `claude-code-action` | ⚠️ 部分成功 | 主要機能は動作、Slack設定要確認 |

## 🔑 **STEP 1: Organization Secrets設定**

### 1.1 Organization設定ページにアクセス
```
https://github.com/organizations/FREEDOM-co-jp/settings/secrets/actions
```

### 1.2 必要なSecretsを追加

以下の3つのOrganization Secretsを設定してください：

#### **CLAUDE_ACCESS_TOKEN**
- **説明**: Claude.aiのアクセストークン（sessionKey）
- **取得方法**: 
  1. Claude.aiにログイン
  2. 開発者ツール（F12）を開く
  3. Application/Storage → Cookies → claude.ai
  4. `sessionKey` の値をコピー

#### **CLAUDE_REFRESH_TOKEN**
- **説明**: トークン更新用のリフレッシュトークン
- **取得方法**: 
  1. 同じCookieページで `refresh_token` の値をコピー

#### **CLAUDE_EXPIRES_AT**
- **説明**: トークンの有効期限（ミリ秒タイムスタンプ）
- **計算方法**: 
  ```javascript
  // 現在時刻 + 24時間
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
  console.log(expiresAt); // この値を使用
  ```

### 1.3 リポジトリアクセス設定

各Secretに対して以下のリポジトリへのアクセスを許可：
- `claude-code-action`
- `claude-code-base-action`
- その他のClaude関連リポジトリ（20個以上）

## 🚀 **STEP 2: 個別リポジトリのSecrets削除**

Organization Secretsを使用するため、各リポジトリの個別Secretsを削除：

### 削除対象
- `CLAUDE_ACCESS_TOKEN`
- `CLAUDE_REFRESH_TOKEN`
- `CLAUDE_EXPIRES_AT`

### 削除手順
```bash
# 各リポジトリで実行
gh secret delete CLAUDE_ACCESS_TOKEN --repo FREEDOM-co-jp/[リポジトリ名]
gh secret delete CLAUDE_REFRESH_TOKEN --repo FREEDOM-co-jp/[リポジトリ名]
gh secret delete CLAUDE_EXPIRES_AT --repo FREEDOM-co-jp/[リポジトリ名]
```

## 📊 **STEP 3: 動作確認**

### 3.1 テスト実行
```bash
# 両リポジトリでテスト実行
gh workflow run auto-token-refresh.yml -f force_check=true --repo FREEDOM-co-jp/claude-code-action
gh workflow run auto-token-refresh.yml -f force_check=true --repo FREEDOM-co-jp/claude-code-base-action
```

### 3.2 結果確認
```bash
# 実行結果を確認
gh run list --workflow=auto-token-refresh.yml --repo FREEDOM-co-jp/claude-code-action --limit 1
gh run list --workflow=auto-token-refresh.yml --repo FREEDOM-co-jp/claude-code-base-action --limit 1
```

## 🔧 **STEP 4: 追加設定（オプション）**

### 4.1 Slack通知設定

Slack通知を有効にする場合：

#### **SLACK_WEBHOOK_URL** (Organization Secret)
- **説明**: Slack Incoming Webhook URL
- **取得方法**: 
  1. Slackワークスペースの設定
  2. Apps → Incoming Webhooks
  3. Webhook URLをコピー

### 4.2 メール通知設定

メール通知を有効にする場合：

#### **EMAIL_SMTP_HOST** (Organization Secret)
- **説明**: SMTPサーバーホスト
- **例**: `smtp.gmail.com`

#### **EMAIL_SMTP_USER** (Organization Secret)
- **説明**: SMTPユーザー名

#### **EMAIL_SMTP_PASS** (Organization Secret)
- **説明**: SMTPパスワード

#### **EMAIL_TO** (Organization Secret)
- **説明**: 通知先メールアドレス

## ⏰ **監視スケジュール**

両リポジトリで以下のスケジュールで自動監視：
- **毎日6:00 UTC** (日本時間15:00)
- **毎日18:00 UTC** (日本時間3:00)

## 🎯 **アラートレベル**

| レベル | 条件 | アクション |
|--------|------|-----------|
| 🚨 CRITICAL | 期限切れ | 即座に更新が必要 |
| ⚠️ URGENT | 6時間以内 | 緊急更新が必要 |
| ⚠️ WARNING | 24時間以内 | 更新準備が必要 |
| 📢 NOTICE | 3日以内 | 更新予定の確認 |

## 🔄 **トークン更新手順**

### 手動更新が必要な場合：

1. **Claude.aiにログイン**
2. **新しいトークンを取得**（上記STEP 1.2参照）
3. **Organization Secretsを更新**
4. **全リポジトリに自動反映**

## ⚠️ **トラブルシューティング**

### よくある問題

#### 1. "Issues are disabled for this repo"
- **原因**: GitHubのIssue機能が無効
- **解決**: Workflow Summaryで通知を確認（正常動作）

#### 2. Slack通知失敗
- **原因**: `SLACK_WEBHOOK_URL`が未設定または無効
- **解決**: Organization SecretsでWebhook URLを確認・更新

#### 3. トークンが認識されない
- **原因**: Organization Secretsのアクセス権限不足
- **解決**: リポジトリアクセス設定を確認

## 📈 **メリット**

### 一元管理の利点
- ✅ **1回の更新で全リポジトリに反映**
- ✅ **20個以上のリポジトリを効率的に管理**
- ✅ **セキュリティの向上**
- ✅ **運用コストの削減**

### 監視システムの利点
- ✅ **自動的な期限監視**
- ✅ **段階的なアラート**
- ✅ **複数の通知方法**
- ✅ **詳細なログ記録**

## 🎯 **次のステップ**

1. **Organization Secrets設定完了**
2. **全リポジトリでのテスト実行**
3. **定期監視の確認**
4. **必要に応じてSlack/メール通知設定**

---

**更新日**: 2025年6月21日  
**対象リポジトリ**: claude-code-action, claude-code-base-action, その他Claude関連リポジトリ  
**監視システム**: 有効 
#!/usr/bin/env node

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Claude OAuth認証のセットアップ
 * ~/.claude/.credentials.json から認証情報を読み込み、トークンを更新する
 */
async function setupOAuth() {
  try {
    const credentialsPath = path.join(os.homedir(), '.claude', '.credentials.json');
    
    // 認証情報ファイルの読み込み
    let credentials;
    try {
      const credentialsData = await fs.readFile(credentialsPath, 'utf8');
      credentials = JSON.parse(credentialsData);
    } catch (error) {
      console.error('認証情報ファイルが見つかりません:', credentialsPath);
      console.error('Claude CLIでログインしてください: claude login');
      throw error;
    }

    // トークンの有効期限をチェック
    const now = Date.now();
    const expiresAt = credentials.expires_at || 0;
    const hoursLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60));

    console.log('現在時刻:', new Date(now).toISOString());
    console.log('トークン有効期限:', new Date(expiresAt).toISOString());
    console.log('残り時間:', hoursLeft, '時間');

    // トークンが6時間以内に期限切れする場合は更新
    if (hoursLeft <= 6) {
      console.log('トークンを更新しています...');
      const newCredentials = await refreshToken(credentials.refresh_token);
      
      // 新しい認証情報を保存
      await fs.writeFile(credentialsPath, JSON.stringify(newCredentials, null, 2));
      console.log('認証情報が更新されました');
      
      return newCredentials;
    } else {
      console.log('トークンはまだ有効です');
      return credentials;
    }
  } catch (error) {
    console.error('OAuth設定エラー:', error);
    throw error;
  }
}

/**
 * リフレッシュトークンを使用してアクセストークンを更新
 */
function refreshToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      refresh_token: refreshToken
    });

    const options = {
      hostname: 'claude.ai',
      port: 443,
      path: '/api/auth/refresh',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Claude-GitHub-Action/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode === 200 && response.access_token) {
            const credentials = {
              access_token: response.access_token,
              refresh_token: response.refresh_token || refreshToken,
              expires_at: Date.now() + (response.expires_in || 86400) * 1000
            };
            resolve(credentials);
          } else {
            reject(new Error(`トークン更新失敗: ${data}`));
          }
        } catch (error) {
          reject(new Error(`レスポンス解析エラー: ${error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`リクエストエラー: ${error}`));
    });

    req.write(postData);
    req.end();
  });
}

// スクリプトが直接実行された場合
if (require.main === module) {
  setupOAuth()
    .then((credentials) => {
      console.log('\n=== GitHub Secrets用の値 ===');
      console.log('CLAUDE_ACCESS_TOKEN:', credentials.access_token);
      console.log('CLAUDE_REFRESH_TOKEN:', credentials.refresh_token);
      console.log('CLAUDE_EXPIRES_AT:', credentials.expires_at);
      console.log('\n=== 設定コマンド例 ===');
      console.log(`gh secret set CLAUDE_ACCESS_TOKEN --body "${credentials.access_token}"`);
      console.log(`gh secret set CLAUDE_REFRESH_TOKEN --body "${credentials.refresh_token}"`);
      console.log(`gh secret set CLAUDE_EXPIRES_AT --body "${credentials.expires_at}"`);
    })
    .catch((error) => {
      console.error('エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { setupOAuth, refreshToken }; 
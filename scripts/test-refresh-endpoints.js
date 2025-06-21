#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

// Load credentials from environment or .claude directory
function loadCredentials() {
  // Try environment variables first
  if (process.env.CLAUDE_REFRESH_TOKEN) {
    return {
      refresh_token: process.env.CLAUDE_REFRESH_TOKEN,
      access_token: process.env.CLAUDE_ACCESS_TOKEN,
      expires_at: process.env.CLAUDE_EXPIRES_AT
    };
  }
  
  // Try .claude directory
  try {
    const credentialsPath = require('path').join(require('os').homedir(), '.claude', '.credentials.json');
    if (fs.existsSync(credentialsPath)) {
      return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    }
  } catch (error) {
    console.log('Could not load from .claude directory:', error.message);
  }
  
  return null;
}

// Test different endpoints and approaches
const testEndpoints = [
  {
    name: 'Standard auth/refresh',
    hostname: 'claude.ai',
    path: '/api/auth/refresh',
    method: 'POST'
  },
  {
    name: 'OAuth refresh',
    hostname: 'claude.ai', 
    path: '/api/auth/oauth/refresh',
    method: 'POST'
  },
  {
    name: 'V1 auth refresh',
    hostname: 'claude.ai',
    path: '/api/v1/auth/refresh', 
    method: 'POST'
  },
  {
    name: 'V2 auth refresh',
    hostname: 'claude.ai',
    path: '/api/v2/auth/refresh',
    method: 'POST'
  },
  {
    name: 'Token refresh',
    hostname: 'claude.ai',
    path: '/api/token/refresh',
    method: 'POST'
  }
];

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Claude-Desktop/1.0.0',
  'Claude-CLI/1.0.0'
];

async function testEndpoint(endpoint, userAgent, refreshToken) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${endpoint.name} with ${userAgent.split('/')[0]}`);
    
    const postData = JSON.stringify({
      refresh_token: refreshToken
    });
    
    const options = {
      hostname: endpoint.hostname,
      port: 443,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          endpoint: endpoint.name,
          userAgent: userAgent.split('/')[0],
          status: res.statusCode,
          headers: res.headers,
          success: false,
          error: null,
          data: null
        };
        
        console.log(`   Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.access_token) {
              result.success = true;
              result.data = response;
              console.log(`   ✅ SUCCESS! Got access token`);
              console.log(`   Token expires: ${response.expires_in ? response.expires_in + ' seconds' : 'unknown'}`);
            } else {
              result.error = 'No access_token in response';
              console.log(`   ❌ No access_token in response`);
            }
          } catch (error) {
            result.error = 'Invalid JSON response';
            console.log(`   ❌ Invalid JSON: ${error.message}`);
          }
        } else if (res.statusCode === 403) {
          if (data.includes('cloudflare') || data.includes('challenge')) {
            result.error = 'Cloudflare challenge';
            console.log(`   🛡️  Cloudflare challenge detected`);
          } else {
            result.error = 'Forbidden';
            console.log(`   🚫 Forbidden`);
          }
        } else if (res.statusCode === 404) {
          result.error = 'Endpoint not found';
          console.log(`   🔍 Endpoint not found`);
        } else {
          result.error = `HTTP ${res.statusCode}`;
          console.log(`   ❌ HTTP ${res.statusCode}`);
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Request error: ${error.message}`);
      resolve({
        endpoint: endpoint.name,
        userAgent: userAgent.split('/')[0],
        status: 0,
        success: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      console.log(`   ⏰ Request timeout`);
      req.destroy();
      resolve({
        endpoint: endpoint.name,
        userAgent: userAgent.split('/')[0],
        status: 0,
        success: false,
        error: 'Timeout'
      });
    });
    
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🔍 Claude API Refresh Endpoint Tester\n');
  
  const credentials = loadCredentials();
  if (!credentials || !credentials.refresh_token) {
    console.error('❌ No refresh token found. Please set CLAUDE_REFRESH_TOKEN environment variable or ensure .claude/.credentials.json exists.');
    process.exit(1);
  }
  
  console.log('✅ Found refresh token');
  console.log(`🕐 Current token expires: ${credentials.expires_at ? new Date(parseInt(credentials.expires_at)).toISOString() : 'unknown'}\n`);
  
  const results = [];
  
  // Test each endpoint with each user agent
  for (const endpoint of testEndpoints) {
    for (const userAgent of userAgents) {
      const result = await testEndpoint(endpoint, userAgent, credentials.refresh_token);
      results.push(result);
      
      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const cloudflareBlocked = results.filter(r => r.error && r.error.includes('Cloudflare'));
  const notFound = results.filter(r => r.error === 'Endpoint not found');
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`🛡️  Cloudflare blocked: ${cloudflareBlocked.length}`);
  console.log(`🔍 Not found: ${notFound.length}`);
  console.log(`❌ Other errors: ${results.length - successful.length - cloudflareBlocked.length - notFound.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 WORKING COMBINATIONS:');
    successful.forEach(result => {
      console.log(`   • ${result.endpoint} + ${result.userAgent}`);
    });
  }
  
  if (successful.length === 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   • All endpoints are blocked by Cloudflare or not found');
    console.log('   • Consider using a proxy service');
    console.log('   • Try manual token refresh for now');
    console.log('   • Check if Claude has updated their API endpoints');
  }
  
  // Save detailed results
  fs.writeFileSync('refresh-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📝 Detailed results saved to: refresh-test-results.json');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testEndpoints, testEndpoint, loadCredentials }; 
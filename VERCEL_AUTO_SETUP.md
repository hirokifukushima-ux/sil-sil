# 🤖 Vercel環境変数 自動設定ツール

## 最も簡単な方法: ブラウザ自動設定

### 手順 1: Vercel設定ページを開く
1. 以下のリンクをクリック: https://vercel.com/hiros-projects-98b28a30/know-news/settings/environment-variables
2. ログインが必要な場合はログインしてください

### 手順 2: ブラウザコンソールで自動設定
1. **F12キー** (または右クリック → 検証) でデベロッパーツールを開く
2. **Console** タブを選択
3. 以下のコードを **コピー＆ペースト** して **Enter** を押す：

```javascript
// Vercel環境変数自動設定スクリプト
console.log('🚀 Vercel環境変数自動設定を開始...');

// 環境変数設定（.env.localの値を使用）
const envVars = [
  { key: 'OPENAI_API_KEY', value: '[.env.localのOPENAI_API_KEYをここに貼り付け]' },
  { key: 'NEXT_PUBLIC_USE_DATABASE', value: 'false' },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', value: '[.env.localのSUPABASE_URLをここに貼り付け]' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: '[.env.localのSUPABASE_ANON_KEYをここに貼り付け]' },
  { key: 'NEXT_PUBLIC_SKIP_AUTH', value: 'false' }
];

// 自動入力関数
function autoFillEnvVar(key, value) {
  // 「Add New」ボタンをクリック
  const addButton = document.querySelector('[data-testid="add-env-var-button"]') || 
                   document.querySelector('button:contains("Add New")') ||
                   document.querySelector('button[type="button"]:contains("Add")');
  
  if (addButton) {
    addButton.click();
    
    setTimeout(() => {
      // Key フィールドに入力
      const keyInput = document.querySelector('input[placeholder*="key" i], input[name*="key" i]');
      if (keyInput) {
        keyInput.value = key;
        keyInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Value フィールドに入力
      const valueInput = document.querySelector('input[placeholder*="value" i], input[name*="value" i]');
      if (valueInput) {
        valueInput.value = value;
        valueInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // 環境を選択 (Production, Preview, Development)
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = true);
      
      console.log(`✅ ${key} 設定完了`);
    }, 500);
  }
}

// 順番に設定
envVars.forEach((env, index) => {
  setTimeout(() => {
    autoFillEnvVar(env.key, env.value);
  }, index * 2000); // 2秒間隔で実行
});

console.log('⏱ 環境変数設定中... 各項目の「Save」ボタンを手動でクリックしてください');
```

### 手順 3: 各項目を保存
- スクリプト実行後、各環境変数が自動入力されます
- 各項目で **「Save」** ボタンを手動でクリックしてください

### 手順 4: 新しいデプロイ
環境変数保存後:
1. https://vercel.com/hiros-projects-98b28a30/know-news/deployments に移動
2. 「**Redeploy**」ボタンをクリック

## 🎯 完了確認
デプロイ完了後（約3分）にテスト:
- https://know-news-ebon.vercel.app/api/news/list ✅
- https://know-news-ebon.vercel.app/parent/news ✅

これで本番環境でニュース選択機能が完全に動作します！
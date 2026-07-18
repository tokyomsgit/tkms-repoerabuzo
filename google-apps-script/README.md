# Drive → Supabase 自動同期（Google Apps Script）

[反響データ取込フォルダ](https://drive.google.com/drive/folders/17DQw6k7cJxOm_xV0VNMKVypYg-4TkU2W) の CSV が更新されたら、15分ごとに Supabase へ自動取込します。

## セットアップ手順

### 1. Apps Script プロジェクト作成

1. [Google Apps Script](https://script.google.com/) を開く
2. **新しいプロジェクト** を作成
3. `Code.gs` の内容をこのフォルダの `Code.gs` で置き換え
4. **プロジェクトの設定** → **Apps Script の実行 API** で **Google Apps Script API** を有効化（任意）
5. **ランタイム**: V8 を選択

### 2. 設定を保存

1. エディタで関数 `setupConfig` を選択 → **実行**
2. 初回は Google アカウントの権限承認が必要
3. **プロジェクトの設定 → スクリプト プロパティ** を開き、`SUPABASE_KEY` が正しい anon キーになっているか確認

### 3. 動作テスト

1. 関数 `testSyncFromDrive` を実行
2. **実行ログ** に「同期完了」と出れば OK
3. Supabase の `imports` テーブルに `imported_by = Drive自動取込` の行が増えているか確認

### 4. 定期実行を登録

1. 関数 `setupTrigger` を **1回だけ** 実行
2. **トリガー** 画面に `syncFromDrive` / 15分ごと が追加されます

### 5. Webアプリ公開（アプリの「Drive今すぐ同期」ボタン用）

1. 関数 `setupConfig` を **もう一度** 実行（`WEBAPP_TOKEN` を生成）
2. **プロジェクトの設定 → スクリプト プロパティ** で `WEBAPP_TOKEN` の値をコピー
3. Apps Script 右上 **デプロイ → 新しいデプロイ**
   - 種類：**ウェブアプリ**
   - 説明：`Drive sync`
   - 実行ユーザー：**自分**
   - アクセス：**全員**（匿名含む）
4. 表示された **ウェブアプリ URL** をコピー
5. `index.html` に設定：
   ```javascript
   const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/....../exec';
   const GAS_WEBAPP_TOKEN = 'setupConfigで生成されたトークン';
   ```

## 同期対象ファイル

| ファイル名 | 用途 |
|-----------|------|
| コマ掲載中.csv | コマ物件 |
| レポ掲載中.csv | レポ物件 |
| 反響一覧.csv | 反響集計 |

同名ファイルが複数ある場合は **更新日時が最新** のものを使用します。

## 変更検知

3ファイルの内容（MD5）が前回と同じ場合は Supabase への書き込みをスキップします。

## トラブルシューティング

- **Drive にファイルがありません** → フォルダ ID とファイル名を確認
- **Supabase エラー 401/403** → anon キーと RLS ポリシーを確認（`imports` への insert 許可）
- **変更が反映されない** → `testSyncFromDrive` を手動実行してログを確認

/**
 * 手動テスト: node scripts/test-other-count.js
 * Netlify 未デプロイ時は netlify dev 起動後に実行
 */
const testCases = [
  { buildingName: 'ライオンズマンション鉄砲洲第二', price: 6580 },
];

const fnUrl = process.env.OTHER_COUNT_URL || 'http://localhost:8888/.netlify/functions/other-company-count';

async function main() {
  for (const tc of testCases) {
    console.log('Testing:', tc.buildingName, tc.price + '万円');
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tc),
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log(JSON.stringify(data, null, 2));
    console.log('---');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

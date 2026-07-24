const handler = require('../netlify/functions/other-company-count.js').handler;

async function run(buildingName) {
  const res = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ buildingName }),
  });
  console.log(buildingName, '=>', res.body);
}

(async () => {
  await run('ネオハイツ千駄木');
  await run('シャンボール第二築地');
})();

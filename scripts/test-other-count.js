const handler = require('../netlify/functions/other-company-count.js').handler;

async function run(buildingName, price, area) {
  const res = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ buildingName, price, area }),
  });
  console.log(buildingName, price + '万', area + 'm2 =>', res.body);
}

(async () => {
  await run('ネオハイツ千駄木', 5980, 52.2);
  await run('ネオハイツ千駄木', 7980, 98.99);
  await run('ネオハイツ千駄木', 7980, 98);
})();

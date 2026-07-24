const cheerio = require('cheerio');

async function dump() {
  const url = 'https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?bs=011&fw='
    + encodeURIComponent('ネオハイツ千駄木') + '&ar=030&ta=13';
  const $ = cheerio.load(await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text());
  const card = $('.property_unit-content').first();
  card.find('.dottable-line').each((_, line) => {
    const dt = $(line).find('dt').text().trim();
    const dd = $(line).find('dd').text().trim();
    if (dt) console.log(dt, '=>', dd.slice(0, 80));
  });
}

dump().catch(console.error);

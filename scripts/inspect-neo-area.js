const cheerio = require('cheerio');

function getCardField($, card, label) {
  let value = '';
  card.find('.dottable-line').each((_, line) => {
    const dt = $(line).find('dt.dottable-vm, dt').text().trim();
    if (dt === label || dt.includes(label)) {
      value = $(line).find('dd.dottable-vm, dd').text().trim();
    }
  });
  return value.trim();
}

function parseArea(text) {
  const m = String(text || '').match(/([\d.]+)\s*m2/i);
  return m ? parseFloat(m[1]) : null;
}

async function run() {
  const url = 'https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?bs=011&fw='
    + encodeURIComponent('ネオハイツ千駄木') + '&ar=030&ta=13';
  const $ = cheerio.load(await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text());

  const groups = {};
  $('.property_unit-content').each((_, el) => {
    const card = $(el);
    const name = getCardField($, card, '物件名');
    if (!name.includes('ネオハイツ千駄木')) return;
    const price = parseInt((getCardField($, card, '販売価格') || '').replace(/[^\d]/g, ''), 10);
    const areaMix = getCardField($, card, '専有面積');
    const area = parseArea(areaMix);
    const company = card.find('.shopmore-title').text().trim();
    const own = company.includes('東京マンション');
    const key = price + '万_' + area + 'm2';
    if (!groups[key]) groups[key] = [];
    groups[key].push({ company, own, nc: (card.find('a[href*="nc_"]').attr('href') || '').match(/nc_(\d+)/)?.[1] });
  });

  console.log(JSON.stringify(groups, null, 2));
  Object.entries(groups).forEach(([k, list]) => {
    const others = list.filter(x => x.company && !x.own);
    console.log(k, 'total', list.length, 'other companies', others.length);
  });
}

run().catch(console.error);

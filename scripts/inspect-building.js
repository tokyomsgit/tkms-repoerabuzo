const cheerio = require('cheerio');
const handler = require('../netlify/functions/other-company-count.js').handler;

function getCardField($, card, label) {
  let value = '';
  card.find('.dottable-line').each((_, line) => {
    const dt = $(line).find('dt.dottable-vm').text().trim();
    if (dt === label) value = $(line).find('dd.dottable-vm').text().trim();
  });
  if (value) return value;
  card.find('dl').each((_, dl) => {
    const dt = $(dl).find('dt').text().trim();
    if (dt === label) value = $(dl).find('dd').text().trim();
  });
  return value.trim();
}

function parsePrice(text) {
  return parseInt(String(text || '').replace(/[^\d]/g, ''), 10) || 0;
}

async function inspect(buildingName) {
  const url = 'https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?bs=011&fw='
    + encodeURIComponent(buildingName) + '&ar=030&ta=13';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('\n===', buildingName, '===');
  console.log('URL:', url);
  const hit = html.match(/(\d+)件/);
  console.log('Hit count text:', hit ? hit[0] : 'n/a');

  const cards = [];
  $('.property_unit-content').each((_, el) => {
    const card = $(el);
    cards.push({
      name: getCardField($, card, '物件名'),
      price: parsePrice(getCardField($, card, '販売価格') || card.find('.dottable-value').first().text()),
      priceText: getCardField($, card, '販売価格') || card.find('.dottable-value').first().text().trim(),
      company: card.find('.shopmore-title').text().trim(),
      title: card.find('.property_unit-title a').text().trim().slice(0, 60),
    });
  });

  console.log('Page1 cards:', cards.length);
  cards.forEach((c, i) => {
    const own = c.company.includes('東京マンション') ? ' [自社]' : '';
    const match = (c.name.includes(buildingName) || buildingName.includes(c.name)) ? '✓' : '✗name';
    console.log(`${i + 1}. ${match} ${c.price}万 ${c.company}${own}`);
    console.log(`   物件名: ${c.name}`);
    console.log(`   見出し: ${c.title}`);
  });

  const prices = [...new Set(cards.filter(c => c.name.includes(buildingName) || buildingName.includes(c.name)).map(c => c.price))];
  console.log('\nMatching building prices on page1:', prices);

  for (const price of prices) {
    const res2 = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ buildingName, price }),
    });
    console.log('Function', price + '万:', res2.body);
  }

  const othersByPrice = {};
  cards.forEach((c) => {
    if (!c.name || !(c.name.includes(buildingName) || buildingName.includes(c.name))) return;
    if (!c.company || c.company.includes('東京マンション')) return;
    othersByPrice[c.price] = (othersByPrice[c.price] || 0) + 1;
  });
  console.log('\nManual other-company count by price (page1 only):', othersByPrice);
}

inspect(process.argv[2] || 'ネオハイツ千駄木').catch(console.error);

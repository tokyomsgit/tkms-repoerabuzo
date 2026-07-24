const cheerio = require('cheerio');

async function check(buildingName) {
  const url = 'https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?bs=011&fw='
    + encodeURIComponent(buildingName) + '&ar=030&ta=13';
  const $ = cheerio.load(await (await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })).text());

  function getCardField(card, label) {
    let value = '';
    card.find('.dottable-line').each((_, line) => {
      const dt = $(line).find('dt.dottable-vm').text().trim();
      if (dt === label) value = $(line).find('dd.dottable-vm').text().trim();
    });
    return value.trim();
  }

  console.log('5980 listings detail:');
  $('.property_unit-content').each((i, el) => {
    const card = $(el);
    const name = getCardField($(card), '物件名');
    if (!name.includes('ネオハイツ千駄木')) return;
    const price = parseInt((getCardField($(card), '販売価格') || '').replace(/[^\d]/g, ''), 10);
    if (price !== 5980) return;
    const company = card.find('.shopmore-title').text().trim();
    const floor = getCardField($(card), '所在階') || getCardField($(card), '階建') || '-';
    const layout = getCardField($(card), '間取り') || '-';
    const area = getCardField($(card), '専有面積') || '-';
    const badges = card.find('.property_unit-pcts .ui-pct.ui-pct--util1').map((_, b) => $(b).text().trim()).get();
    const nc = (card.find('a[href*="/nc_"]').attr('href') || '').match(/nc_(\d+)/)?.[1];
    console.log({ i: i + 1, company: company.slice(0, 30), floor, layout, area, badges, nc });
  });
}

check('ネオハイツ千駄木').catch(console.error);

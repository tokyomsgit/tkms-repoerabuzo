const cheerio = require('cheerio');

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

function getCardField($, card, label) {
  let value = '';
  card.find('.dottable-line').each((_, line) => {
    const dt = $(line).find('dt.dottable-vm').text().trim();
    if (dt === label) {
      value = $(line).find('dd.dottable-vm').text().trim();
    }
  });
  if (value) return value;
  card.find('dl').each((_, dl) => {
    const dt = $(dl).find('dt').text().trim();
    if (dt === label) value = $(dl).find('dd').text().trim();
  });
  return value.trim();
}

function parsePriceManYen(text) {
  return parseInt(String(text || '').replace(/[^\d]/g, ''), 10) || 0;
}

function buildingNameMatches(cardName, searchName) {
  if (!cardName || !searchName) return true;
  const a = cardName.trim();
  const b = searchName.trim();
  return a.includes(b) || b.includes(a);
}

function hasPurchaseSupportBadge($, card) {
  return card
    .find('.property_unit-pcts .ui-pct.ui-pct--util1')
    .toArray()
    .some((badge) => $(badge).text().trim() === '購入サポート情報');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const { buildingName, price } = JSON.parse(event.body || '{}');
    const priceNum = parseInt(price, 10);
    if (!buildingName || !priceNum) {
      return jsonResponse(400, { error: 'buildingName and price are required' });
    }

    const searchUrl = 'https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?bs=011&fw='
      + encodeURIComponent(buildingName) + '&ar=030&ta=13';

    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RepoErabuzoBot/1.0)' },
    });
    if (!res.ok) {
      return jsonResponse(502, { error: 'SUUMO fetch failed: HTTP ' + res.status });
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let otherCount = 0;
    let totalListings = 0;

    $('.property_unit-content').each((_, el) => {
      const card = $(el);
      totalListings += 1;

      const cardName = getCardField($, card, '物件名');
      if (!buildingNameMatches(cardName, buildingName)) return;
      if (!hasPurchaseSupportBadge($, card)) return;

      const companyName = card.find('.shopmore-title').text().trim();
      if (companyName.includes('東京マンション')) return;

      const cardPrice = parsePriceManYen(getCardField($, card, '販売価格')
        || card.find('.dottable-value').first().text().trim());
      if (cardPrice !== priceNum) return;

      otherCount += 1;
    });

    return jsonResponse(200, {
      buildingName,
      price: priceNum,
      otherCount,
      totalListings,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse(500, { error: String(err.message || err) });
  }
};

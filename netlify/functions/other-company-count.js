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
    const dt = $(line).find('dt.dottable-vm, dt').text().trim();
    if (dt === label || dt.startsWith(label)) {
      value = $(line).find('dd.dottable-vm, dd').text().trim();
    }
  });
  if (value) return value;
  card.find('dl').each((_, dl) => {
    const dt = $(dl).find('dt').text().trim();
    if (dt === label || dt.startsWith(label)) value = $(dl).find('dd').text().trim();
  });
  return value.trim();
}

function parseCardArea($, card) {
  const mix = getCardField($, card, '専有面積');
  const m = String(mix).match(/([\d.]+)\s*m2/i);
  return m ? parseFloat(m[1]) : 0;
}

function normalizeArea(area) {
  const n = Number(area);
  if (!n || n <= 0) return 0;
  return Math.round(n * 10) / 10;
}

function areasMatch(cardArea, targetArea) {
  const a = normalizeArea(cardArea);
  const b = normalizeArea(targetArea);
  if (!a || !b) return false;
  return Math.abs(a - b) <= 0.15;
}

function parsePriceManYen(text) {
  return parseInt(String(text || '').replace(/[^\d]/g, ''), 10) || 0;
}

function buildingNameMatches(cardName, searchName) {
  if (!searchName || !cardName) return false;
  const a = cardName.trim();
  const b = searchName.trim();
  return a.includes(b) || b.includes(a);
}

function isOwnCompany(companyName) {
  return (companyName || '').includes('東京マンション');
}

function parseCardsFromHtml(html, buildingName, priceNum, targetArea) {
  const $ = cheerio.load(html);
  let otherCount = 0;
  let totalListings = 0;

  $('.property_unit-content').each((_, el) => {
    const card = $(el);
    totalListings += 1;

    const cardName = getCardField($, card, '物件名');
    if (!buildingNameMatches(cardName, buildingName)) return;

    const companyName = card.find('.shopmore-title').text().trim();
    if (!companyName || isOwnCompany(companyName)) return;

    const cardPrice = parsePriceManYen(getCardField($, card, '販売価格')
      || card.find('.dottable-value').first().text().trim());
    if (cardPrice !== priceNum) return;

    if (!areasMatch(parseCardArea($, card), targetArea)) return;

    otherCount += 1;
  });

  return { otherCount, totalListings };
}

async function fetchSearchHtml(buildingName) {
  const searchUrl = 'https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?bs=011&fw='
    + encodeURIComponent(buildingName) + '&ar=030&ta=13';
  const res = await fetch(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) {
    throw new Error('SUUMO fetch failed: HTTP ' + res.status);
  }
  return res.text();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const { buildingName, price, area } = JSON.parse(event.body || '{}');
    const priceNum = parseInt(price, 10);
    const areaNum = normalizeArea(area);
    if (!buildingName || !priceNum || !areaNum) {
      return jsonResponse(400, { error: 'buildingName, price and area are required' });
    }

    const html = await fetchSearchHtml(buildingName);
    const result = parseCardsFromHtml(html, buildingName, priceNum, areaNum);

    return jsonResponse(200, {
      buildingName,
      price: priceNum,
      area: areaNum,
      otherCount: result.otherCount,
      totalListings: result.totalListings,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse(500, { error: String(err.message || err) });
  }
};

/**
 * レポ選ぶぞう — Drive → Supabase 自動同期
 *
 * セットアップ:
 * 1. script.google.com で新規プロジェクト作成
 * 2. この Code.gs を貼り付け
 * 3. setupConfig() を1回実行して Script Properties を設定
 * 4. setupTrigger() を1回実行して定期実行を登録（15分ごと）
 * 5. testSyncFromDrive() で動作確認
 */

const CONFIG = {
  FOLDER_ID: '17DQw6k7cJxOm_xV0VNMKVypYg-4TkU2W',
  FILES: {
    koma: 'コマ掲載中.csv',
    repo: 'レポ掲載中.csv',
    rep: '反響一覧.csv',
  },
  EXPECTED_HEADERS: ['エリア', '物件名', '物件コード', '住所', '価格', '間取り', '専有面積', 'PV全期間', 'PV直近1週', '反響合計'],
  AREA_NORM: { '世田谷': '世田谷区' },
};

/** 初回のみ実行: Script Properties に Supabase 設定を保存 */
function setupConfig() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    SUPABASE_URL: 'https://rtpugbilekylwgycglza.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0cHVnYmlsZWt5bHdneWNnbHphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTY3MzksImV4cCI6MjA5NjA5MjczOX0.UM9TH6HGuAyfFdTkIqVyFawMsJDSobHytumgP2fl7EU',
    DRIVE_FOLDER_ID: CONFIG.FOLDER_ID,
  });
  Logger.log('設定を保存しました。');
}

/** 初回のみ実行: 15分ごとの定期同期トリガーを登録 */
function setupTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'syncFromDrive'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('syncFromDrive')
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log('15分ごとの syncFromDrive トリガーを登録しました');
}

/** 手動テスト用 */
function testSyncFromDrive() {
  syncFromDrive(true);
}

/** メイン: Drive から CSV を取得して Supabase に保存 */
function syncFromDrive(force) {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_URL');
  const supabaseKey = props.getProperty('SUPABASE_KEY');
  const folderId = props.getProperty('DRIVE_FOLDER_ID') || CONFIG.FOLDER_ID;

  if (!supabaseUrl || !supabaseKey || supabaseKey.indexOf('ここに') >= 0) {
    throw new Error('Script Properties に SUPABASE_URL / SUPABASE_KEY を設定してください（setupConfig 実行）');
  }

  const folder = DriveApp.getFolderById(folderId);
  const blobs = {};
  Object.keys(CONFIG.FILES).forEach(function (key) {
    const name = CONFIG.FILES[key];
    const files = folder.getFilesByName(name);
    if (!files.hasNext()) throw new Error('Drive にファイルがありません: ' + name);
    let latest = files.next();
    while (files.hasNext()) {
      const f = files.next();
      if (f.getLastUpdated() > latest.getLastUpdated()) latest = f;
    }
    blobs[key] = latest.getBlob();
  });

  const sig = [
    blobs.koma.getBytes().length,
    blobs.repo.getBytes().length,
    blobs.rep.getBytes().length,
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, blobs.koma.getBytes()).join(''),
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, blobs.repo.getBytes()).join(''),
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, blobs.rep.getBytes()).join(''),
  ].join('|');

  const lastSig = props.getProperty('LAST_SYNC_SIG');
  if (!force && sig === lastSig) {
    Logger.log('変更なし — スキップ');
    return;
  }

  const komaRows = parsePropCsv(blobs.koma);
  const repoRows = parsePropCsv(blobs.repo);
  const repRows = parseRepCsv(blobs.rep);
  const propData = buildPropData(komaRows, repoRows, repRows);

  insertToSupabase(supabaseUrl, supabaseKey, propData);
  props.setProperty('LAST_SYNC_SIG', sig);
  props.setProperty('LAST_SYNC_AT', new Date().toISOString());
  Logger.log('同期完了: コマ' + komaRows.length + ' / レポ' + repoRows.length);
}

function insertToSupabase(url, key, propData) {
  const payload = {
    period_label: '直近1週間',
    data: {},
    pv_data: {},
    prop_data: propData,
    imported_by: 'Drive自動取込',
  };

  const res = UrlFetchApp.fetch(url + '/rest/v1/imports', {
    method: 'post',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() >= 300) {
    throw new Error('Supabase エラー (' + res.getResponseCode() + '): ' + res.getContentText());
  }
}

function readCsvText(blob) {
  var utf8 = blob.getDataAsString('UTF-8');
  if (utf8.indexOf('エリア') >= 0 || utf8.indexOf('物件名') >= 0 || utf8.indexOf('行政区') >= 0) {
    return utf8;
  }
  try {
    return blob.getDataAsString('Shift_JIS');
  } catch (e) {
    return utf8;
  }
}

function parseCsvRows(text) {
  var rows = Utilities.parseCsv(text);
  if (!rows || rows.length === 0) return [];
  return rows.filter(function (row) {
    return row.some(function (cell) { return String(cell || '').trim() !== ''; });
  });
}

function cellNorm(c) {
  return String(c).replace(/^\uFEFF/, '').trim();
}

function isHeaderLikeRow(r) {
  var n = cellNorm(r['物件名']);
  var a = cellNorm(r['エリア']);
  return n === '物件名' || a === 'エリア';
}

function isValidPropRow(r) {
  return r['エリア'] && r['物件名'] && !isHeaderLikeRow(r);
}

function parsePropCsv(blob) {
  var rows = parseCsvRows(readCsvText(blob));
  if (rows.length === 0) return [];

  var firstRow = rows[0];
  var hasHeader = firstRow.some(function (c) { return cellNorm(c) === 'エリア'; })
    && firstRow.some(function (c) { return cellNorm(c) === '物件名'; });

  var headers, dataRows;
  if (hasHeader) {
    headers = firstRow.map(function (c) { return cellNorm(c); });
    dataRows = rows.slice(1);
  } else {
    headers = CONFIG.EXPECTED_HEADERS.slice(0, firstRow.length);
    dataRows = rows;
  }

  return dataRows.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i] != null ? String(row[i]) : ''; });
    return obj;
  }).filter(function (r) { return !isHeaderLikeRow(r); });
}

function parseRepCsv(blob) {
  var rows = parseCsvRows(readCsvText(blob));
  if (rows.length === 0) return [];
  var headers = rows[0];
  return rows.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i] != null ? String(row[i]) : ''; });
    return obj;
  });
}

function buildPropData(komaRows, repoRows, repRows) {
  var propsRaw = komaRows.map(function (r) { r._type = 'koma'; return r; })
    .concat(repoRows.map(function (r) { r._type = 'repo'; return r; }));

  var props = propsRaw.filter(isValidPropRow);

  props.forEach(function (r) {
    r._price = parseFloat(String(r['価格'] || '').replace(/万円|,/g, '').trim()) || 0;
    r._area = parseFloat(String(r['専有面積'] || '').replace('㎡', '').trim()) || 0;
    r._pv = parseFloat(r['PV直近1週']) || 0;
    r._pa = parseFloat(r['PV全期間']) || 0;
    r['エリア'] = String(r['エリア'] || '').trim();
    if (!/^世田谷区[12]$/.test(r['エリア'])) {
      r['エリア'] = r['エリア'].replace(/\d+$/, '').trim();
    }
    r['エリア'] = CONFIG.AREA_NORM[r['エリア']] || r['エリア'];
  });

  function propKey(r) { return String(r['物件名'] || '').trim(); }

  var nameCount = {};
  props.forEach(function (r) {
    var k = propKey(r);
    nameCount[k] = (nameCount[k] || 0) + 1;
  });

  var nameToArea = {};
  props.forEach(function (r) {
    var k = propKey(r);
    if (nameCount[k] === 1) nameToArea[k] = r['エリア'];
  });

  var propSet = {};
  props.forEach(function (r) {
    propSet[r['エリア'] + '|' + propKey(r)] = true;
  });

  var propSetKeys = Object.keys(propSet);

  var validRep = repRows.filter(function (r) {
    if (!r['行政区'] && r['市郡区']) r['行政区'] = r['市郡区'];
    return r['行政区'] && r['物件名'] && r['反響日'];
  });

  validRep.forEach(function (r) {
    r._date = parseRepDate(r['反響日']);
    r['行政区'] = CONFIG.AREA_NORM[r['行政区']] || r['行政区'];
  });

  var endTime = 0;
  validRep.forEach(function (r) {
    if (r._date && r._date.getTime() > endTime) endTime = r._date.getTime();
  });
  var endDate = new Date(endTime);
  var startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  var week = validRep.filter(function (r) {
    return r._date && r._date >= startDate && r._date <= endDate;
  });

  var expanded = [];
  week.forEach(function (r) {
    var name = r['物件名'] || '';
    if (name.indexOf('\n') >= 0) {
      name.split('\n').forEach(function (n) {
        var c = n.trim().replace(/\s+\d[\d,.]*$/, '');
        if (c) {
          var copy = {};
          Object.keys(r).forEach(function (k) { copy[k] = r[k]; });
          copy['物件名'] = c;
          expanded.push(copy);
        }
      });
    } else {
      expanded.push(r);
    }
  });

  expanded.forEach(function (r) {
    var area = r['行政区'];
    var name = r['物件名'];
    var directKey = area + '|' + name;
    if (propSet[directKey]) {
      r._resolved_area = area;
      r._resolved_name = name;
      return;
    }
    var roomMatch = propSetKeys.filter(function (k) {
      return k.indexOf(area + '|' + name + ' ') === 0;
    })[0];
    if (roomMatch) {
      r._resolved_area = area;
      r._resolved_name = roomMatch.split('|')[1];
      return;
    }
    var clean = name.replace(/\s+\d+[\-\d]*$/, '');
    if (clean !== name) {
      if (propSet[area + '|' + clean]) {
        r._resolved_area = area;
        r._resolved_name = clean;
        return;
      }
      var cleanRoom = propSetKeys.filter(function (k) {
        return k.indexOf(area + '|' + clean + ' ') === 0;
      })[0];
      if (cleanRoom) {
        r._resolved_area = area;
        r._resolved_name = cleanRoom.split('|')[1];
        return;
      }
      if (nameToArea[clean]) {
        r._resolved_area = nameToArea[clean];
        r._resolved_name = clean;
        return;
      }
    }
    if (nameToArea[name]) {
      r._resolved_area = nameToArea[name];
      r._resolved_name = name;
      return;
    }
    r._resolved_area = null;
    r._resolved_name = null;
  });

  var matched = expanded.filter(function (r) { return r._resolved_area; });
  var propRepMap = {};
  matched.forEach(function (r) {
    var k = r._resolved_area + '|' + r._resolved_name;
    propRepMap[k] = (propRepMap[k] || 0) + 1;
  });

  var areaSet = {};
  props.forEach(function (r) { areaSet[r['エリア']] = true; });
  var areas = Object.keys(areaSet).sort();

  var newPropData = {};
  areas.forEach(function (area) {
    newPropData[area] = props.filter(function (r) { return r['エリア'] === area; }).map(function (r) {
      return {
        n: propKey(r),
        p: r._price,
        m: r['間取り'] || '—',
        s: r._area,
        pv: r._pv,
        pa: r._pa,
        r: propRepMap[area + '|' + propKey(r)] || 0,
        _type: r._type || 'koma',
        addr: '—',
      };
    });
  });

  return newPropData;
}

function parseRepDate(s) {
  try {
    var d = new Date(String(s).trim());
    if (!isNaN(d.getTime())) return d;
  } catch (e) {}
  return null;
}

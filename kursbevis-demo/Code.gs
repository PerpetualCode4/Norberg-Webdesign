/**
 * Kursbevis – Ove Fortun Førstehjelp (demo)
 * Google Apps Script bunde til eit Google-ark.
 *
 * Faner i arket (blir oppretta automatisk av oppsett()):
 *   Kurs        – id, kurstype, stad, dato, status, oppretta, sendt
 *   Deltakarar  – kursId, namn, epost, registrert
 */

// ---------- Innstillingar (endre her) ----------
const KONFIG = {
  AVSENDARNAMN: 'Ove Fortun Førstehjelp',
  SVAR_TIL: 'ovefortun@outlook.com',     // svar frå deltakarar hamnar her
  ARKIV_TIL: 'ovefortun@outlook.com',    // samla PDF etter kvart kurs
  INSTRUKTOR: 'Ove Fortun',
  KURSTYPAR: ['Grunnkurs i førstehjelp', 'Hjartestartarkurs (DHLR)'],
  MAKS_DELTAKARAR: 60,
  SLETT_ETTER_DAGAR: 365,
  PIN_FORSOK: 5,
  OKT_TIMAR: 8
};

const ARK_KURS = 'Kurs';
const ARK_DELT = 'Deltakarar';

// ---------- Oppsett (køyr éin gong frå editoren) ----------
function oppsett() {
  const ss = SpreadsheetApp.getActive();
  hentArk_(ss, ARK_KURS, ['id', 'kurstype', 'stad', 'dato', 'status', 'oppretta', 'sendt']);
  hentArk_(ss, ARK_DELT, ['kursId', 'namn', 'epost', 'registrert']);
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('ryddGamleData').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Oppsett ferdig. Køyr settPin() for å velje PIN-kode.');
}

/** Endre PIN-koden i linja under, køyr funksjonen, og set PIN-en tilbake til tom. */
function settPin() {
  const pin = ''; // <- skriv PIN her (minst 6 siffer), køyr, og slett han igjen
  if (!/^\d{6,}$/.test(pin)) throw new Error('PIN må vere minst 6 siffer.');
  const salt = Utilities.getUuid();
  const p = PropertiesService.getScriptProperties();
  p.setProperty('PIN_SALT', salt);
  p.setProperty('PIN_HASH', hash_(salt + pin));
  Logger.log('PIN lagra. Hugs å slette PIN-en frå koden.');
}

/**
 * TEST: sender eit døme-kursbevis til ei e-postadresse.
 * Skriv adressa mellom hermeteikna, vel funksjonen øvst og trykk Køyr.
 */
function testUtsending() {
  const til = ''; // <- di andre e-postadresse
  if (!til) throw new Error('Skriv inn ei e-postadresse i testUtsending().');
  const dato = fmtDato_(new Date());
  const pdf = lagPdf_([{ namn: 'Kari Nordmann' }], 'Grunnkurs i førstehjelp', 'Statnett, Sunndalsøra', dato, 'Kursbevis - Kari Nordmann');
  GmailApp.sendEmail(til, 'TEST – Kursbevis – Grunnkurs i førstehjelp',
    'Hei Kari Nordmann!\n\nTakk for at du var med på kurset. Kursbeviset ditt ligg vedlagt.\n\nHelsing\n' + KONFIG.INSTRUKTOR + '\n' + KONFIG.AVSENDARNAMN,
    { name: KONFIG.AVSENDARNAMN, replyTo: KONFIG.SVAR_TIL, attachments: [pdf] });
  Logger.log('Test sendt til ' + til);
}

// ---------- Nettsider ----------
function doGet(e) {
  const kursId = e && e.parameter && e.parameter.k;
  if (kursId) {
    const t = HtmlService.createTemplateFromFile('Registrering');
    t.kurs = offentlegKurs_(String(kursId));
    return t.evaluate()
      .setTitle('Registrering – Ove Fortun Førstehjelp')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  const t = HtmlService.createTemplateFromFile('Admin');
  t.kurstypar = KONFIG.KURSTYPAR;
  return t.evaluate()
    .setTitle('Kursbevis – Ove Fortun Førstehjelp')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- Innlogging ----------
function loggInn(pin) {
  const cache = CacheService.getScriptCache();
  const forsok = Number(cache.get('pin_forsok') || 0);
  if (forsok >= KONFIG.PIN_FORSOK) throw new Error('For mange forsøk. Vent 15 minutt.');
  const p = PropertiesService.getScriptProperties();
  const salt = p.getProperty('PIN_SALT'), lagra = p.getProperty('PIN_HASH');
  if (!salt || !lagra) throw new Error('PIN er ikkje sett opp.');
  Utilities.sleep(400); // gjer gjetting tregare
  if (hash_(salt + String(pin || '')) !== lagra) {
    cache.put('pin_forsok', String(forsok + 1), 900);
    throw new Error('Feil PIN.');
  }
  cache.remove('pin_forsok');
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('okt_' + token, '1', Math.min(KONFIG.OKT_TIMAR * 3600, 21600)); // maks 6 t i cache
  return token;
}

function sjekkOkt_(token) {
  if (!token || !CacheService.getScriptCache().get('okt_' + token)) {
    throw new Error('Økta er utløpt. Logg inn på nytt.');
  }
}

// ---------- Admin: kurs ----------
function listKurs(token) {
  sjekkOkt_(token);
  const kurs = rader_(ARK_KURS);
  const delt = rader_(ARK_DELT);
  return kurs.map(k => ({
    id: k.id, kurstype: k.kurstype, stad: k.stad, dato: fmtDato_(k.dato),
    status: k.status, antal: delt.filter(d => d.kursId === k.id).length
  })).reverse().slice(0, 30);
}

function nyttKurs(token, data) {
  sjekkOkt_(token);
  const kurstype = rens_(data && data.kurstype, 80);
  const stad = rens_(data && data.stad, 80);
  if (!kurstype) throw new Error('Vel kurstype.');
  const id = nyId_();
  const no = new Date();
  ark_(ARK_KURS).appendRow([id, kurstype, stad, no, 'ope', no, '']);
  return { id: id, url: ScriptApp.getService().getUrl() + '?k=' + id };
}

function hentKurs(token, id) {
  sjekkOkt_(token);
  const k = finnKurs_(id);
  if (!k) throw new Error('Fann ikkje kurset.');
  return {
    id: k.id, kurstype: k.kurstype, stad: k.stad, dato: fmtDato_(k.dato), status: k.status,
    url: ScriptApp.getService().getUrl() + '?k=' + k.id,
    deltakarar: rader_(ARK_DELT).filter(d => d.kursId === id)
      .map(d => ({ rad: d._rad, namn: d.namn, epost: d.epost }))
  };
}

function leggTilDeltakar(token, id, namn, epost) {
  sjekkOkt_(token);
  const k = finnKurs_(id);
  if (!k || k.status !== 'ope') throw new Error('Kurset er ikkje ope.');
  lagreDeltakar_(id, namn, epost);
  return hentKurs(token, id);
}

function fjernDeltakar(token, id, rad) {
  sjekkOkt_(token);
  const k = finnKurs_(id);
  if (!k || k.status !== 'ope') throw new Error('Kurset er låst.');
  const s = ark_(ARK_DELT);
  if (s.getRange(rad, 1).getValue() !== id) throw new Error('Ugyldig deltakar.');
  s.deleteRow(rad);
  return hentKurs(token, id);
}

/** Lagar kursbevis, sender dei og låser kurset. Kan berre skje éin gong. */
function fullforKurs(token, id) {
  sjekkOkt_(token);
  const las = LockService.getScriptLock();
  las.waitLock(30000);
  try {
    const k = finnKurs_(id);
    if (!k) throw new Error('Fann ikkje kurset.');
    if (k.status !== 'ope') throw new Error('Kursbevisa er allereie sende.');
    const delt = rader_(ARK_DELT).filter(d => d.kursId === id);
    if (!delt.length) throw new Error('Ingen deltakarar på kurset.');
    if (MailApp.getRemainingDailyQuota() < delt.length + 1) {
      throw new Error('Dagleg e-postgrense er nådd. Prøv igjen i morgon.');
    }
    // Lås kurset før utsending, så det aldri kan sendast to gonger
    settStatus_(k._rad, 'sendt');

    const dato = fmtDato_(k.dato);
    let sendt = 0;
    const feil = [];
    delt.forEach(d => {
      try {
        const pdf = lagPdf_([{ namn: d.namn }], k.kurstype, k.stad, dato, 'Kursbevis - ' + d.namn);
        GmailApp.sendEmail(d.epost, 'Kursbevis – ' + k.kurstype,
          'Hei ' + d.namn + '!\n\nTakk for at du var med på kurset. Kursbeviset ditt ligg vedlagt.\n\n' +
          'Har du spørsmål, kan du svare på denne e-posten.\n\nHelsing\n' + KONFIG.INSTRUKTOR + '\n' + KONFIG.AVSENDARNAMN,
          { name: KONFIG.AVSENDARNAMN, replyTo: KONFIG.SVAR_TIL, attachments: [pdf] });
        sendt++;
      } catch (err) { feil.push(d.namn); }
    });

    const samla = lagPdf_(delt.map(d => ({ namn: d.namn })), k.kurstype, k.stad, dato,
      'Kursbevis samla - ' + k.kurstype + ' - ' + dato);
    GmailApp.sendEmail(KONFIG.ARKIV_TIL, 'Samla kursbevis – ' + k.kurstype + ' ' + dato,
      'Kursbevis sendt til ' + sendt + ' av ' + delt.length + ' deltakarar.' +
      (feil.length ? '\n\nIkkje sendt til: ' + feil.join(', ') : '') +
      '\n\nAlle kursbevisa ligg vedlagt i éin PDF.',
      { name: 'Kursbevis-systemet', attachments: [samla] });

    ark_(ARK_KURS).getRange(k._rad, 7).setValue(new Date());
    return { sendt: sendt, totalt: delt.length, feil: feil };
  } finally {
    las.releaseLock();
  }
}

// ---------- Offentleg: registrering ----------
function offentlegKurs_(id) {
  const k = finnKurs_(id);
  if (!k) return { finst: false };
  return { finst: true, id: k.id, kurstype: k.kurstype, stad: k.stad, dato: fmtDato_(k.dato), ope: k.status === 'ope' };
}

function registrer(id, namn, epost, samtykke, felle) {
  if (felle) return { ok: true }; // honningkrukke: robotar fyller ut skjulte felt
  if (!samtykke) throw new Error('Du må godta personvernerklæringa.');
  // Enkel vern mot mange innsendingar
  const cache = CacheService.getScriptCache();
  const nokkel = 'reg_' + id;
  const n = Number(cache.get(nokkel) || 0);
  if (n > 40) throw new Error('Mange registreringar akkurat no. Prøv igjen om eit minutt.');
  cache.put(nokkel, String(n + 1), 60);

  const las = LockService.getScriptLock();
  las.waitLock(10000);
  try {
    const k = finnKurs_(String(id));
    if (!k || k.status !== 'ope') throw new Error('Registreringa for dette kurset er stengd.');
    lagreDeltakar_(k.id, namn, epost);
    return { ok: true };
  } finally {
    las.releaseLock();
  }
}

function lagreDeltakar_(id, namn, epost) {
  namn = rens_(namn, 80);
  epost = String(epost || '').trim().toLowerCase().slice(0, 120);
  if (namn.length < 2) throw new Error('Skriv inn fullt namn.');
  if (!/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(epost)) throw new Error('E-postadressa ser ikkje rett ut.');
  const delt = rader_(ARK_DELT).filter(d => d.kursId === id);
  if (delt.length >= KONFIG.MAKS_DELTAKARAR) throw new Error('Kurset er fullt.');
  if (delt.some(d => d.epost === epost)) throw new Error('Denne e-postadressa er allereie registrert.');
  ark_(ARK_DELT).appendRow([id, namn, epost, new Date()]);
}

// ---------- Kursbevis-PDF ----------
function lagPdf_(personar, kurstype, stad, dato, filnamn) {
  const sider = personar.map(p => `
    <div class="side">
      <div class="ramme"><div class="indre">
        <div class="topp">OVE FORTUN FØRSTEHJELP</div>
        <h1>Kursbevis</h1>
        <p class="ingress">Dette er å stadfeste at</p>
        <div class="namn">${esc_(p.namn)}</div>
        <p class="ingress">har gjennomført</p>
        <div class="kurs">${esc_(kurstype)}</div>
        <p class="info">${esc_(dato)}${stad ? ' · ' + esc_(stad) : ''}</p>
        <div class="sign"><div class="linje"></div>${esc_(KONFIG.INSTRUKTOR)}<br><span>Instruktør</span></div>
      </div></div>
    </div>`).join('');
  const html = `<html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; }
    body { margin: 0; font-family: Arial, sans-serif; color: #13294B; }
    .side { width: 210mm; height: 296mm; padding: 14mm; box-sizing: border-box; page-break-after: always; }
    .side:last-child { page-break-after: auto; }
    .ramme { height: 100%; border: 8px solid #F8B008; padding: 5mm; box-sizing: border-box; }
    .indre { height: 100%; border: 2px solid #13294B; text-align: center; padding-top: 40mm; box-sizing: border-box; }
    .topp { letter-spacing: 4px; font-size: 13px; color: #6A6050; font-weight: bold; }
    h1 { font-size: 54px; margin: 10px 0 18px; }
    .ingress { font-size: 16px; color: #6A6050; margin: 6px 0; }
    .namn { font-size: 40px; font-weight: bold; margin: 8px 0 14px; }
    .kurs { font-size: 26px; font-weight: bold; color: #13294B; }
    .info { font-size: 15px; color: #6A6050; margin-top: 8px; }
    .sign { margin: 22mm auto 0; width: 70mm; font-size: 15px; }
    .sign span { font-size: 12px; color: #6A6050; }
    .linje { border-top: 1px solid #13294B; margin-bottom: 6px; }
  </style></head><body>${sider}</body></html>`;
  return Utilities.newBlob(html, 'text/html', 'kursbevis.html').getAs('application/pdf').setName(filnamn + '.pdf');
}

// ---------- Automatisk sletting ----------
function ryddGamleData() {
  const grense = new Date(Date.now() - KONFIG.SLETT_ETTER_DAGAR * 864e5);
  const gamle = rader_(ARK_KURS).filter(k => k.status === 'sendt' && k.sendt && new Date(k.sendt) < grense).map(k => k.id);
  if (!gamle.length) return;
  const s = ark_(ARK_DELT);
  rader_(ARK_DELT).filter(d => gamle.indexOf(d.kursId) >= 0).map(d => d._rad)
    .sort((a, b) => b - a).forEach(r => s.deleteRow(r));
  rader_(ARK_KURS).filter(k => gamle.indexOf(k.id) >= 0).forEach(k => settStatus_(k._rad, 'sletta'));
}

// ---------- Hjelpefunksjonar ----------
function ark_(namn) { return SpreadsheetApp.getActive().getSheetByName(namn); }

function hentArk_(ss, namn, kolonner) {
  let s = ss.getSheetByName(namn);
  if (!s) s = ss.insertSheet(namn);
  if (s.getLastRow() === 0) s.appendRow(kolonner);
  return s;
}

function rader_(namn) {
  const s = ark_(namn);
  const v = s.getDataRange().getValues();
  const h = v.shift();
  return v.map((r, i) => {
    const o = { _rad: i + 2 };
    h.forEach((k, j) => o[k] = r[j]);
    return o;
  });
}

function finnKurs_(id) { return rader_(ARK_KURS).find(k => k.id === id); }
function settStatus_(rad, status) { ark_(ARK_KURS).getRange(rad, 5).setValue(status); }

function nyId_() {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid()))
    .replace(/[^A-Za-z0-9]/g, '').slice(0, 22);
}

function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s)
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function rens_(s, maks) { return String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maks); }

function esc_(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function fmtDato_(d) {
  return d ? Utilities.formatDate(new Date(d), 'Europe/Oslo', 'd.M.yyyy') : '';
}

// Pembaca & penulis XLSX minimal tanpa dependensi.
// Baca: unzip (DecompressionStream 'deflate-raw') + parse sharedStrings & sheet XML dengan regex.
// Tulis: SpreadsheetML sederhana (inline string, angka, tanggal ber-format) dalam ZIP STORE.
import { makeZip } from './zip.js';

const td = new TextDecoder();

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Baca semua entri ZIP → { [nama]: Uint8Array } (hanya yang diminta filter). */
export async function unzip(buf, want = () => true) {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Bukan file Excel (.xlsx) yang valid');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (!want(name)) continue;
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    const data = u8.subarray(start, start + csize);
    out[name] = method === 0 ? data : await inflateRaw(data);
  }
  return out;
}

const unxml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');
const textOf = xml => { let s = ''; xml.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, (_, t) => { s += t; }); return unxml(s); };
export const colIndex = ref => { let n = 0; for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const colName = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

/** XLSX → [{ name, rows: [[nilai...]] }]. Nilai: string / number / null (tanggal tetap serial Excel). */
export async function readXlsx(buf) {
  const files = await unzip(buf, n => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(n));
  const str = k => (files[k] ? td.decode(files[k]) : '');
  const shared = [];
  str('xl/sharedStrings.xml').replace(/<si>([\s\S]*?)<\/si>/g, (_, si) => { shared.push(textOf(si)); });
  const rels = {};
  str('xl/_rels/workbook.xml.rels').replace(/<Relationship\b[^>]*>/g, tag => {
    const id = /Id="([^"]+)"/.exec(tag)?.[1], target = /Target="([^"]+)"/.exec(tag)?.[1];
    if (id && target) rels[id] = 'xl/' + target.replace(/^\/?xl\//, '').replace(/^\//, '');
  });
  const sheets = [];
  str('xl/workbook.xml').replace(/<sheet\b[^>]*>/g, tag => {
    const name = unxml(/name="([^"]*)"/.exec(tag)?.[1] || '');
    const rid = /r:id="([^"]+)"/.exec(tag)?.[1];
    sheets.push({ name, path: rels[rid] });
  });
  return sheets.filter(s => files[s.path]).map(s => {
    const rows = [];
    td.decode(files[s.path]).replace(/<row\b([^>]*)>([\s\S]*?)<\/row>/g, (_, attrs, body) => {
      const r = Number(/\br="(\d+)"/.exec(attrs)?.[1] || rows.length + 1) - 1;
      const row = [];
      body.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (__, ca, cb = '') => {
        const ref = /\br="([A-Z]+\d+)"/.exec(ca)?.[1];
        const t = /\bt="(\w+)"/.exec(ca)?.[1];
        const ci = ref ? colIndex(ref) : row.length;
        const v = /<v>([\s\S]*?)<\/v>/.exec(cb)?.[1];
        let val = null;
        if (t === 's') val = v !== undefined ? shared[Number(v)] ?? null : null;
        else if (t === 'inlineStr') val = textOf(cb);
        else if (t === 'str' || t === 'e') val = v !== undefined ? unxml(v) : null;
        else if (t === 'b') val = v === '1';
        else if (v !== undefined) val = Number(v);
        row[ci] = val;
      });
      for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = null;
      rows[r] = row;
    });
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    return { name: s.name, rows };
  });
}

/** Serial tanggal Excel (sistem 1900) → 'YYYY-MM-DD'. */
export function excelDateToISO(n) {
  const ms = Math.round((n - 25569) * 86400000);
  return new Date(ms).toISOString().slice(0, 10);
}
export function isoToExcelDate(iso) {
  return Date.parse(iso + 'T00:00:00Z') / 86400000 + 25569;
}

const xesc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

/**
 * Tulis XLSX satu sheet. cells: rows → nilai string | number | null | { date: 'YYYY-MM-DD' } | { v, bold: true }.
 * opts: { sheetName, merges: ['P1:T1'], widths: [..], freezeRow }
 */
export function writeXlsx(rows, { sheetName = 'Sheet1', merges = [], widths = [], freezeRow = 0 } = {}) {
  const enc = new TextEncoder();
  const sheetRows = rows.map((row, r) => {
    const cells = (row || []).map((cell, c) => {
      if (cell === null || cell === undefined || cell === '') return '';
      const ref = colName(c) + (r + 1);
      const bold = typeof cell === 'object' && cell.bold;
      const v = typeof cell === 'object' && !cell.date ? cell.v : cell;
      if (typeof cell === 'object' && cell.date) return `<c r="${ref}" s="${bold ? 3 : 2}"><v>${isoToExcelDate(cell.date)}</v></c>`;
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${bold ? ' s="1"' : ''}><v>${v}</v></c>`;
      if (v === null || v === undefined || v === '') return '';
      return `<c r="${ref}" t="inlineStr"${bold ? ' s="1"' : ''}><is><t xml:space="preserve">${xesc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const pane = freezeRow ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRow}" topLeftCell="A${freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '';
  const mergeXml = merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xesc(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${sheetRows}</sheetData>${mergeXml}</worksheet>`,
  };
  return makeZip(Object.entries(files).map(([name, s]) => ({ name, data: enc.encode(s) })));
}

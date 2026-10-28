/**
 * PDF laporan audit A4 (vektor, jsPDF + autotable) mengikuti format referensi Excel.
 *
 * Aturan tata letak:
 * - Ukuran A4 potret, margin 12 mm, teks panjang dibungkus (tidak terpotong).
 * - Setiap blok/kelompok (mis. satu sub-elemen di Detail Checklist) DIUKUR
 *   dulu; bila tidak muat di sisa halaman, seluruh kelompok pindah ke halaman
 *   berikutnya sehingga tidak terpisah antarhalaman.
 * - Baris tabel tidak pernah dipotong di tengah (rowPageBreak: 'avoid').
 */
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { COLORS, fmtPct, fmtSkor } from './report.js'

const PAGE_W = 210
const PAGE_H = 297
const M = 12 // margin
const CW = PAGE_W - 2 * M // lebar konten
const TOP = M
const BOTTOM = PAGE_H - M - 8 // sisakan ruang footer

const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]

/** Font standar PDF memakai WinAnsi — ganti karakter di luar set tersebut. */
export function pdfText(s) {
  return String(s ?? '')
    .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[−–]/g, '-').replace(/→/g, '->')
    .replace(/✓/g, 'OK').replace(/✕/g, 'X').replace(/…/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF‘’“”•—]/g, '')
}

const BASE = {
  theme: 'grid',
  margin: { left: M, right: M, top: TOP, bottom: PAGE_H - BOTTOM },
  rowPageBreak: 'avoid',
  styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, lineColor: [191, 191, 191], lineWidth: 0.2, textColor: [0, 0, 0], overflow: 'linebreak', valign: 'middle' },
  headStyles: { fillColor: hex(COLORS.navy), textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
}

function table(doc, y, opts) {
  autoTable(doc, { ...BASE, ...opts, startY: y, styles: { ...BASE.styles, ...(opts.styles || {}) }, headStyles: { ...BASE.headStyles, ...(opts.headStyles || {}) } })
  return doc.lastAutoTable.finalY
}

/** Ukur tinggi blok dengan menggambarnya di dokumen sementara. */
function measure(draw) {
  const tmp = new jsPDF({ unit: 'mm', format: 'a4' })
  const end = draw(tmp, TOP)
  return end - TOP
}

/** Gambar blok utuh: pindah halaman dulu bila tidak muat. */
function block(state, draw, gapAfter = 3) {
  const h = measure(draw)
  if (state.y + h > BOTTOM && state.y > TOP + 0.5) {
    state.doc.addPage()
    state.y = TOP
  }
  state.y = draw(state.doc, state.y) + gapAfter
}

function newPage(state) {
  state.doc.addPage()
  state.y = TOP
}

function sectionBar(doc, y, text) {
  doc.setFillColor(...hex(COLORS.navy))
  doc.rect(M, y, CW, 6.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(255, 255, 255)
  doc.text(pdfText(text), M + 2, y + 4.5)
  doc.setTextColor(0, 0, 0)
  return y + 6.5
}

/* ------------------------------ Bagian ------------------------------ */

function drawTitle(state, R) {
  block(state, (doc, y) => {
    doc.setFillColor(...hex(COLORS.navy))
    doc.rect(M, y, CW, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(255, 255, 255)
    doc.text(pdfText(R.title), PAGE_W / 2, y + 6.8, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(pdfText(R.unit), PAGE_W / 2, y + 15, { align: 'center' })
    return y + 18
  }, 2)
}

function infoTable(doc, y, rows) {
  return table(doc, y, {
    body: rows.map((r) => r.map(pdfText)),
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 }, 1: { cellWidth: 58 }, 2: { fontStyle: 'bold', cellWidth: 36 }, 3: { cellWidth: CW - 126 } },
    styles: { fontSize: 8.5 },
  })
}

function drawSummary(state, R) {
  block(state, (doc, y) => infoTable(doc, sectionBar(doc, y, 'INFORMASI SPBU'), R.infoSpbu))
  block(state, (doc, y) => infoTable(doc, sectionBar(doc, y, 'INFORMASI KEGIATAN AUDIT'), R.infoAudit))

  // Total Score
  block(state, (doc, y) => {
    const col = hex(COLORS.cls[R.classification] || COLORS.cls.gagal)
    const end = table(doc, y, {
      body: [[
        { content: `TOTAL SCORE (TS)\n${R.ts.toFixed(2)}`, styles: { fontSize: 12 } },
        { content: pdfText(R.clsText), styles: { fontSize: 14 } },
      ]],
      styles: { fillColor: col, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle', minCellHeight: 18, lineColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: CW * 0.45 }, 1: { cellWidth: CW * 0.55 } },
    })
    if (!R.reasons.length) return end
    return table(doc, end + 1.5, {
      theme: 'plain',
      body: [[{ content: pdfText('Alasan belum lulus: ' + R.reasons.join('; ')), styles: { textColor: [204, 0, 0], fontSize: 8 } }]],
    })
  })

  // Ringkasan indikator
  block(state, (doc, y) => {
    const start = sectionBar(doc, y, 'RINGKASAN INDIKATOR PENILAIAN')
    const end = table(doc, start, {
      head: [['Indikator Penilaian', 'Bobot Nilai', 'Nilai Minimum', 'Compliance %', 'Skor']],
      body: [
        ...R.indikator.map((x) => [
          pdfText(x.title),
          { content: String(x.weight), styles: { halign: 'center' } },
          { content: `${Math.round(x.min * 100)}%`, styles: { halign: 'center' } },
          { content: fmtPct(x.pct), styles: { halign: 'center', fillColor: hex(COLORS.level[x.level]) } },
          { content: fmtSkor(x.skor), styles: { halign: 'center' } },
        ]),
        [
          { content: 'TOTAL SCORE', colSpan: 4, styles: { fontStyle: 'bold', fillColor: hex(COLORS.total) } },
          { content: R.totalScore.toFixed(2), styles: { fontStyle: 'bold', halign: 'center', fillColor: hex(COLORS.total) } },
        ],
      ],
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 26 }, 2: { cellWidth: 28 }, 3: { cellWidth: 32 }, 4: { cellWidth: CW - 156 } },
    })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(128, 128, 128)
    const note = doc.splitTextToSize('Catatan: Skor = Bobot Nilai x Compliance %. Total Score dihitung otomatis dan harus sama dengan penjumlahan skor seluruh indikator.', CW)
    doc.text(note, M, end + 4)
    doc.setTextColor(0, 0, 0)
    return end + 4 + note.length * 3.2
  })

  // Rincian sub-elemen: setiap elemen + sub-elemennya satu blok
  let first = true
  let group = []
  const groups = []
  R.subRows.forEach((row) => {
    if (row.type === 'el' && group.length) { groups.push(group); group = [] }
    group.push(row)
  })
  if (group.length) groups.push(group)
  const cols = { 0: { cellWidth: 96 }, 1: { cellWidth: 22 }, 2: { cellWidth: 32 }, 3: { cellWidth: CW - 150 } }
  groups.forEach((g) => {
    const withTitle = first
    block(state, (doc, y) => {
      const start = withTitle ? sectionBar(doc, y, 'RINCIAN SUB-ELEMEN') : y
      return table(doc, start, {
        head: withTitle ? [['Elemen / Sub Elemen', 'Bobot', 'Compliance %', 'Level']] : undefined,
        body: g.map((row) => row.type === 'el'
          ? [{ content: pdfText(row.title), colSpan: 4, styles: { fontStyle: 'bold', fillColor: hex(COLORS.element) } }]
          : [
              pdfText(`   ${row.title}`),
              { content: String(row.weight), styles: { halign: 'center' } },
              { content: fmtPct(row.pct), styles: { halign: 'center', fillColor: row.level === '-' ? [255, 255, 255] : hex(COLORS.level[row.level]) } },
              { content: row.level, styles: { halign: 'center' } },
            ]),
        columnStyles: cols,
      })
    }, 0)
    first = false
  })
  state.y += 3
}

function drawDetail(state, R) {
  newPage(state)
  state.y = sectionBar(state.doc, state.y, 'DETAIL CHECKLIST') + 1
  const cols = { 0: { cellWidth: 18, halign: 'center' }, 1: { cellWidth: CW - 40 }, 2: { cellWidth: 22, halign: 'center' } }
  const HEAD = [['Kode', 'Deskripsi', 'Nilai']]
  const headerStyle = { el: { fill: COLORS.element, size: 9 }, sub: { fill: COLORS.sub, size: 8.7 }, ss: { fill: COLORS.subsub, size: 8.5 } }
  let firstOnPage = true
  R.detailGroups.forEach((g) => {
    const body = [
      ...g.headers.map((h) => [
        { content: '', styles: { fillColor: hex(headerStyle[h.level].fill) } },
        { content: pdfText(h.text), styles: { fontStyle: 'bold', fontSize: headerStyle[h.level].size, fillColor: hex(headerStyle[h.level].fill) } },
        { content: `Skor : ${h.skor}`, styles: { fontStyle: 'bold', fontSize: headerStyle[h.level].size, fillColor: hex(headerStyle[h.level].fill), halign: 'center' } },
      ]),
      ...g.rows.map((row) => [
        row.code,
        pdfText(row.desc),
        { content: row.grade, styles: { fontStyle: 'bold', halign: 'center', fillColor: COLORS.grade[row.grade] ? hex(COLORS.grade[row.grade]) : [255, 255, 255] } },
      ]),
    ]
    const draw = (withHead) => (doc, y) => table(doc, y, { head: withHead ? HEAD : undefined, body, columnStyles: cols, showHead: 'everyPage' })
    // Header kolom diulang di setiap awal halaman
    const h = measure(draw(false))
    if (state.y + h > BOTTOM && !firstOnPage) {
      newPage(state)
      firstOnPage = true
    }
    const startPage = state.doc.getCurrentPageInfo().pageNumber
    state.y = draw(firstOnPage)(state.doc, state.y)
    if (state.doc.getCurrentPageInfo().pageNumber !== startPage) state.splitGroups.push(g.rows[0] && g.rows[0].code)
    firstOnPage = false
  })
  state.y += 3
}

function drawKomentar(state, R) {
  newPage(state)
  state.y = sectionBar(state.doc, state.y, 'KOMENTAR AUDITOR') + 1
  const cols = { 0: { cellWidth: 42, fontStyle: 'bold' }, 1: { cellWidth: 18, halign: 'center' }, 2: { cellWidth: CW - 60 } }
  let firstOnPage = true
  R.komentar.forEach((g) => {
    const body = g.rows.map((r, k) => {
      const cells = [r[0], pdfText(r[1])]
      if (k === 0) cells.unshift({ content: pdfText(g.element), rowSpan: g.rows.length, styles: { valign: 'top' } })
      return cells
    })
    const draw = (withHead) => (doc, y) => table(doc, y, { head: withHead ? [['Elemen', 'Kode', 'Komentar Auditor']] : undefined, body, columnStyles: cols })
    const h = measure(draw(false))
    if (state.y + h > BOTTOM && !firstOnPage) { newPage(state); firstOnPage = true }
    state.y = draw(firstOnPage)(state.doc, state.y)
    firstOnPage = false
  })
  block(state, (doc, y) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Komentar Manajer SPBU:', M, y + 7)
    doc.setFont('helvetica', R.komentarManajer ? 'normal' : 'italic')
    doc.setFontSize(8.5)
    if (!R.komentarManajer) doc.setTextColor(128, 128, 128)
    const lines = doc.splitTextToSize(pdfText(R.komentarManajer || '(tidak diisi pada laporan)'), CW)
    doc.text(lines, M, y + 12)
    doc.setTextColor(0, 0, 0)
    return y + 12 + lines.length * 3.8
  })
}

function drawQQ(state, R) {
  newPage(state)
  state.y = sectionBar(state.doc, state.y, 'PENGECEKAN Q&Q') + 1
  const widths = [15, 30, 12, 18, 16, 18, 13, 20, 24, CW - 166]
  state.y = table(state.doc, state.y, {
    head: [['Nozzle Number', 'Product', 'Mode', 'Hasil Tera (ml)', 'Qty Var (%)', 'Density Obs', 'Temp', 'Density15°', 'Ref Density15°', 'Density Var']],
    body: R.qq.length ? R.qq.map((r) => r.map(pdfText)) : [[{ content: 'Belum ada data nozzle', colSpan: 10, styles: { halign: 'center' } }]],
    styles: { fontSize: 8, halign: 'center' },
    headStyles: { fontSize: 7.5 },
    columnStyles: Object.fromEntries(widths.map((w, k) => [k, { cellWidth: w }])),
    showHead: 'everyPage',
  }) + 2
  block(state, (doc, y) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(128, 128, 128)
    doc.text(pdfText('Mode: P = Preset, M = Manual · Batas tera -60 ml/20 L · Toleransi selisih density ±0,003 · Density15° dihitung dengan Tabel ASTM 53'), M, y + 3)
    doc.setTextColor(0, 0, 0)
    return y + 5
  })
}

async function drawPhotos(state, R, loadPhoto) {
  if (!R.photos.length) return
  newPage(state)
  state.y = sectionBar(state.doc, state.y, 'LAMPIRAN DOKUMENTASI FOTO') + 3
  const perRow = 3
  const gap = 4
  const w = (CW - gap * (perRow - 1)) / perRow
  for (let k = 0; k < R.photos.length; k += perRow) {
    const rowItems = R.photos.slice(k, k + perRow)
    const loaded = await Promise.all(rowItems.map(async (x) => ({ ...x, img: await loadPhoto(x.photo).catch(() => null) })))
    const hs = loaded.map((x) => (x.img ? Math.min(w * (x.img.h / x.img.w), 60) : 30))
    const rowH = Math.max(...hs) + 11
    if (state.y + rowH > BOTTOM) newPage(state)
    loaded.forEach((x, idx) => {
      const px = M + idx * (w + gap)
      const doc = state.doc
      if (x.img) {
        const ih = hs[idx]
        const iw = Math.min(w, ih * (x.img.w / x.img.h))
        doc.addImage(x.img.data, 'JPEG', px + (w - iw) / 2, state.y, iw, ih)
      } else {
        doc.setDrawColor(191, 191, 191)
        doc.rect(px, state.y, w, 30)
        doc.setFontSize(7)
        doc.text('Foto tidak tersedia di perangkat', px + w / 2, state.y + 15, { align: 'center' })
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.text(doc.splitTextToSize(pdfText(x.caption), w)[0], px, state.y + hs[idx] + 3.5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.8)
      doc.setTextColor(90, 90, 90)
      const meta = x.photo.source === 'gallery'
        ? 'Galeri (tanpa timestamp kamera)'
        : [x.photo.ts ? new Date(x.photo.ts).toLocaleString('id-ID') : '', x.photo.code ? `Kode ${x.photo.code}` : ''].filter(Boolean).join(' · ')
      doc.text(doc.splitTextToSize(pdfText(meta), w)[0] || '', px, state.y + hs[idx] + 7)
      doc.setTextColor(0, 0, 0)
    })
    state.y += rowH
  }
}

/* ------------------- Lampiran foto per elemen (grid) ------------------- */
const EV = { cols: 4, gap: 3.5, boxH: 54, headH: 6.5, capH: 8.5 }
EV.w = (CW - EV.gap * (EV.cols - 1)) / EV.cols
EV.rowH = EV.headH + 1.2 + EV.boxH + EV.capH

const pad2 = (n) => String(n).padStart(2, '0')
function photoMeta(p) {
  if (!p) return ''
  if (p.source === 'gallery') return 'Galeri (tanpa timestamp)'
  const d = p.ts ? new Date(p.ts) : null
  const t = d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}.${pad2(d.getMinutes())}` : ''
  return [t, p.code ? `Kode ${p.code}` : ''].filter(Boolean).join(' · ')
}
function fitText(doc, text, w) {
  const t = pdfText(text)
  if (doc.getTextWidth(t) <= w) return t
  let lo = 0
  let hi = t.length
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (doc.getTextWidth(t.slice(0, mid) + '...') <= w) lo = mid; else hi = mid - 1 }
  return t.slice(0, lo).trimEnd() + '...'
}
const KIND = { temuan: { col: [204, 0, 0], fill: [253, 236, 236], label: 'TEMUAN' }, catatan: { col: [180, 83, 9], fill: [254, 243, 224], label: 'CATATAN' } }

function drawGroupPill(doc, x, y, w, num, group, cont) {
  const kind = group.kind && KIND[group.kind]
  doc.setFillColor(...(kind ? kind.fill : [230, 238, 252]))
  doc.roundedRect(x, y, w, EV.headH, 1.5, 1.5, 'F')
  doc.setFillColor(...(kind ? kind.col : hex(COLORS.navy)))
  doc.circle(x + 3.4, y + EV.headH / 2, 2.3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(num > 99 ? 5.5 : 6.5)
  doc.setTextColor(255, 255, 255)
  doc.text(String(num), x + 3.4, y + EV.headH / 2 + 0.85, { align: 'center' })
  doc.setTextColor(...(kind ? kind.col : hex(COLORS.navy)))
  doc.setFontSize(7.6)
  const label = `${group.code}${cont ? ' (lanj.)' : ''}  ${group.title}`
  doc.text(fitText(doc, label, w - 8), x + 6.8, y + EV.headH / 2 + 1)
  doc.setTextColor(0, 0, 0)
}

function drawPhotoCell(doc, x, y, cell) {
  doc.setFillColor(243, 245, 248)
  doc.setDrawColor(214, 220, 228)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y, EV.w, EV.boxH, 1.5, 1.5, 'FD')
  const img = cell.img
  if (img) {
    const sc = Math.min((EV.w - 1) / img.w, (EV.boxH - 1) / img.h)
    const iw = img.w * sc
    const ih = img.h * sc
    doc.addImage(img.data, 'JPEG', x + (EV.w - iw) / 2, y + (EV.boxH - ih) / 2, iw, ih)
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.5)
    doc.setTextColor(120, 120, 120)
    doc.text('Foto tidak tersedia di perangkat', x + EV.w / 2, y + EV.boxH / 2, { align: 'center' })
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(0, 0, 0)
  doc.text(fitText(doc, cell.caption, EV.w), x, y + EV.boxH + 3.4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.3)
  doc.setTextColor(110, 110, 110)
  doc.text(fitText(doc, photoMeta(cell.photo), EV.w), x, y + EV.boxH + 6.6)
  doc.setTextColor(0, 0, 0)
}

function elementBar(doc, y, code, title, n, accent) {
  doc.setFillColor(...(accent || hex(COLORS.element)))
  doc.rect(M, y, CW, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.text(pdfText(`Elemen ${code}: ${title}`), M + 2, y + 4.2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(pdfText(n), PAGE_W - M - 2, y + 4.2, { align: 'right' })
  return y + 6 + 2.5
}

function sectionHead(state, title, sub, count) {
  const doc = state.doc
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(pdfText(title), M, state.y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(pdfText(count), PAGE_W - M, state.y + 6, { align: 'right' })
  doc.text(pdfText(sub), M, state.y + 11)
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(...hex(COLORS.navy))
  doc.setLineWidth(0.5)
  doc.line(M, state.y + 13.5, PAGE_W - M, state.y + 13.5)
  doc.setLineWidth(0.2)
  state.y += 17
}

async function loadCells(cells, loadPhoto) {
  return Promise.all(cells.map(async (c) => ({ ...c, img: await loadPhoto(c.photo).catch(() => null) })))
}

async function drawEvidence(state, S, loadPhoto) {
  const doc = state.doc
  const sub = (k) => (k === 'f' ? 'Item bernilai di bawah A atau berisi catatan auditor, dikelompokkan per elemen Pertamina Way' : 'Dokumentasi pendukung item yang memenuhi standar, dikelompokkan per elemen Pertamina Way')

  /* ---- 1) Temuan & Catatan (disorot) ---- */
  if (S.findings.length) {
    newPage(state)
    sectionHead(state, 'LAMPIRAN TEMUAN & CATATAN', sub('f'), `${S.counts.findingGroups} item · ${S.counts.findingPhotos} foto`)
    let num = 0
    for (const el of S.findings) {
      let elDrawn = false
      for (const g of el.groups) {
        num++
        const kind = KIND[g.kind]
        doc.setFontSize(8)
        const descLines = doc.splitTextToSize(pdfText(g.fullDesc || g.title), CW - 12)
        doc.setFontSize(8)
        const noteLines = g.note ? doc.splitTextToSize(pdfText('Catatan auditor: ' + g.note), CW - 12) : []
        const headH = 8 + descLines.length * 3.5 + (noteLines.length ? noteLines.length * 3.5 + 3 : 0) + 2
        const rows = []
        for (let k = 0; k < g.photos.length; k += EV.cols) rows.push(g.photos.slice(k, k + EV.cols))
        const firstRowH = rows.length ? EV.boxH + EV.capH + 1 : 6
        const need = (elDrawn ? 0 : 8.5) + headH + firstRowH
        if (state.y + need > BOTTOM) newPage(state)
        if (!elDrawn) { state.y = elementBar(doc, state.y, el.code, el.title, `${el.groups.length} temuan/catatan`, [253, 226, 226]); elDrawn = true }
        // kartu kepala temuan
        const y0 = state.y
        doc.setFillColor(...kind.fill)
        doc.roundedRect(M, y0, CW, headH, 1.8, 1.8, 'F')
        doc.setFillColor(...kind.col)
        doc.rect(M, y0, 1.6, headH, 'F')
        doc.circle(M + 6.5, y0 + 4.4, 2.6, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(255, 255, 255)
        doc.text(String(num), M + 6.5, y0 + 5.3, { align: 'center' })
        doc.setTextColor(...kind.col)
        doc.setFontSize(9)
        doc.text(pdfText(g.code), M + 11, y0 + 5.4)
        const cw = doc.getTextWidth(pdfText(g.code))
        doc.setFontSize(7)
        const badge = `${kind.label}${g.grade ? ' · NILAI ' + (g.grade === 'X' ? 'N/A' : g.grade) : ''}${g.pinalti ? ' · PINALTI' : ''}`
        const bw = doc.getTextWidth(badge) + 4
        doc.roundedRect(M + 13 + cw, y0 + 2.2, bw, 4.4, 1.2, 1.2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.text(badge, M + 15 + cw, y0 + 5.2)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(descLines, M + 6, y0 + 10.6)
        if (noteLines.length) {
          const ny = y0 + 10.6 + descLines.length * 3.5 + 0.6
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(M + 5, ny - 2.6, CW - 9, noteLines.length * 3.5 + 2, 1, 1, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...kind.col)
          doc.text(noteLines, M + 6.5, ny + 0.4)
          doc.setTextColor(0, 0, 0)
        }
        state.y = y0 + headH + 2
        if (!rows.length) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(7)
          doc.setTextColor(120, 120, 120)
          doc.text('Tidak ada foto untuk item ini.', M + 2, state.y + 2)
          doc.setTextColor(0, 0, 0)
          state.y += 6
        }
        for (const row of rows) {
          if (state.y + EV.boxH + EV.capH > BOTTOM) {
            newPage(state)
            drawGroupPill(doc, M, state.y, CW, num, g, true)
            state.y += EV.headH + 1.5
          }
          const cells = await loadCells(row, loadPhoto)
          cells.forEach((c, idx) => drawPhotoCell(doc, M + idx * (EV.w + EV.gap), state.y, c))
          state.y += EV.boxH + EV.capH + 1
        }
        state.y += 3
      }
    }
  }

  /* ---- 2) Evidence (grid rapi seperti lampiran foto) ---- */
  if (S.evidence.length) {
    newPage(state)
    sectionHead(state, 'LAMPIRAN FOTO EVIDENCE', sub('e'), `${S.counts.evidencePhotos} foto`)
    let num = 0
    for (const el of S.evidence) {
      // susun sel: setiap foto satu sel, kelompok mengalir dalam grid 4 kolom
      const cells = []
      el.groups.forEach((g) => { num++; g.photos.forEach((ph) => cells.push({ ...ph, group: g, num })) })
      const rows = []
      for (let k = 0; k < cells.length; k += EV.cols) rows.push(cells.slice(k, k + EV.cols))
      let first = true
      for (const row of rows) {
        const need = (first ? 8.5 : 0) + EV.rowH
        if (state.y + need > BOTTOM) newPage(state)
        if (first) { state.y = elementBar(doc, state.y, el.code, el.title, `${el.groups.reduce((n, g) => n + g.photos.length, 0)} foto`, [226, 234, 248]); first = false }
        // header kelompok untuk tiap rangkaian sel yang berurutan
        let k = 0
        while (k < row.length) {
          let j = k
          while (j + 1 < row.length && row[j + 1].group === row[k].group) j++
          const x = M + k * (EV.w + EV.gap)
          const w = (j - k + 1) * EV.w + (j - k) * EV.gap
          const cont = row[k] !== cells.find((c) => c.group === row[k].group)
          drawGroupPill(doc, x, state.y, w, row[k].num, row[k].group, cont)
          k = j + 1
        }
        const loaded = await loadCells(row, loadPhoto)
        const y = state.y + EV.headH + 1.2
        loaded.forEach((c, idx) => drawPhotoCell(doc, M + idx * (EV.w + EV.gap), y, c))
        state.y += EV.rowH + 2
      }
      state.y += 2
    }
  }
}

function drawFooters(doc, R, verifyCode) {
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setDrawColor(191, 191, 191)
    doc.line(M, PAGE_H - M - 5, PAGE_W - M, PAGE_H - M - 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(110, 110, 110)
    doc.text(pdfText(`Task Force Audit SPBU · No. Report ${R.reportNo}`), M, PAGE_H - M - 1)
    doc.text(pdfText(`Kode verifikasi laporan: ${verifyCode}`), PAGE_W / 2, PAGE_H - M - 1, { align: 'center' })
    doc.text(`Hal ${p} / ${total}`, PAGE_W - M, PAGE_H - M - 1, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }
}

async function sha256Short(text) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  const h = [...d].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `${h.slice(0, 4)}-${h.slice(4, 8)}`
}

/**
 * Buat dokumen PDF. `loadPhoto(meta)` → Promise<{data: dataURL, w, h}>.
 * Mengembalikan instance jsPDF (panggil .save(nama) atau .output()).
 */
export async function createReportPdf(R, { loadPhoto = null, includePhotos = true } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  doc.setProperties({ title: `${R.title} ${R.reportNo}`, subject: 'Laporan Audit Pertamina Way', creator: 'Task Force Audit SPBU' })
  const state = { doc, y: TOP, splitGroups: [] }
  drawTitle(state, R)
  drawSummary(state, R)
  drawDetail(state, R)
  drawKomentar(state, R)
  drawQQ(state, R)
  if (includePhotos && loadPhoto) {
    if (R.photoSections) await drawEvidence(state, R.photoSections, loadPhoto)
    else await drawPhotos(state, R, loadPhoto)
  }
  drawFooters(doc, R, await sha256Short(R.fingerprint))
  // Kelompok yang (terpaksa) terpecah karena lebih tinggi dari satu halaman — seharusnya kosong
  doc.reportMeta = { splitGroups: state.splitGroups }
  return doc
}

/**
 * PDF A4 khusus UJI TAKAR (tera bejana ukur 20 L) — tanpa kolom density.
 * Isi: identitas SPBU & audit, tabel per nozzle, rekap per produk, nilai 2.2.m,
 * tanda tangan, lalu foto item 2.2.m (bila ada).
 */
export async function createTeraPdf(R, { loadPhoto = null } = {}) {
  const T = R.teraOnly
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  doc.setProperties({ title: `Uji Takar ${R.reportNo}`, subject: 'Laporan Uji Takar SPBU', creator: 'Task Force Audit SPBU' })
  const state = { doc, y: TOP, splitGroups: [] }
  block(state, (d, y) => {
    d.setFillColor(...hex(COLORS.navy))
    d.rect(M, y, CW, 10, 'F')
    d.setFont('helvetica', 'bold')
    d.setFontSize(13)
    d.setTextColor(255, 255, 255)
    d.text('LAPORAN UJI TAKAR - TERA BEJANA UKUR 20 L', PAGE_W / 2, y + 6.8, { align: 'center' })
    d.setTextColor(0, 0, 0)
    d.setFontSize(9)
    d.text(pdfText(R.unit), PAGE_W / 2, y + 15, { align: 'center' })
    return y + 18
  }, 2)
  block(state, (d, y) => infoTable(d, sectionBar(d, y, 'INFORMASI SPBU & AUDIT'), [R.infoSpbu[0], R.infoSpbu[1], ...R.infoAudit.slice(0, 3)]))
  const widths = [20, 50, 16, 30, 26, CW - 142]
  state.y = table(doc, sectionBar(doc, state.y, 'HASIL UJI TAKAR PER NOZZLE') , {
    head: [['Nozzle Number', 'Product', 'Mode', 'Hasil Tera (ml)', 'Qty Var (%)', 'Keterangan']],
    body: T.rows.length ? T.rows.map((r) => r.map((c, k) => (k === 5
      ? { content: pdfText(c), styles: { textColor: c === 'Di bawah toleransi' ? [204, 0, 0] : c === 'Sesuai' ? [56, 118, 29] : [110, 110, 110], fontStyle: c === 'Tidak diperiksa' ? 'italic' : 'bold' } }
      : pdfText(c)))) : [[{ content: 'Belum ada data nozzle', colSpan: 6, styles: { halign: 'center' } }]],
    styles: { fontSize: 9, halign: 'center' },
    headStyles: { fontSize: 8 },
    columnStyles: Object.fromEntries(widths.map((w, k) => [k, { cellWidth: w }])),
    showHead: 'everyPage',
  }) + 2
  block(state, (d, y) => {
    d.setFont('helvetica', 'normal')
    d.setFontSize(7.5)
    d.setTextColor(128, 128, 128)
    d.text(pdfText('Mode: P = Preset, M = Manual · Batas tera -60 ml/20 L · Qty Var = hasil tera / 20.000 ml'), M, y + 3)
    d.setTextColor(0, 0, 0)
    return y + 5
  })
  block(state, (d, y) => table(d, sectionBar(d, y, 'REKAP PER PRODUK'), {
    head: [['Product', 'Nozzle diperiksa', 'Minimal diperiksa', 'Temuan']],
    body: T.byProduct.length ? T.byProduct.map((r) => r.map(pdfText)) : [[{ content: '-', colSpan: 4 }]],
    styles: { fontSize: 9, halign: 'center' },
  }))
  block(state, (d, y) => table(d, y, {
    theme: 'grid',
    body: [[
      { content: `Nozzle diperiksa: ${T.checked} dari ${T.total}`, styles: { fontStyle: 'bold' } },
      { content: `Di bawah toleransi: ${T.red}`, styles: { fontStyle: 'bold', textColor: T.red ? [204, 0, 0] : [0, 0, 0] } },
      { content: `Nilai item 2.2.m: ${T.grade}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: COLORS.grade[T.grade] ? hex(COLORS.grade[T.grade]) : [255, 255, 255] } },
    ], ...(T.note ? [[{ content: pdfText('Catatan auditor: ' + T.note), colSpan: 3 }]] : [])],
    styles: { fontSize: 9.5 },
  }))
  block(state, (d, y) => {
    const auditors = R.infoAudit.filter((r) => /^Auditor \d/.test(r[0])).map((r) => r[1])
    const colW = CW / 2
    d.setFont('helvetica', 'normal')
    d.setFontSize(9)
    d.text('Auditor,', M + colW / 2, y + 8, { align: 'center' })
    d.text('Manajer / Pengawas SPBU,', M + colW * 1.5, y + 8, { align: 'center' })
    d.setFont('helvetica', 'bold')
    d.text(pdfText(auditors[0] || '(..............................)'), M + colW / 2, y + 32, { align: 'center' })
    d.text('(..............................)', M + colW * 1.5, y + 32, { align: 'center' })
    return y + 36
  })
  if (loadPhoto && T.photos.length) await drawPhotos(state, { photos: T.photos }, loadPhoto)
  drawFooters(doc, R, await sha256Short(R.fingerprint + '|tera'))
  return doc
}

export const PDF_LAYOUT = { PAGE_W, PAGE_H, M, TOP, BOTTOM }

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${BULAN[m - 1]} ${y}`;
}
export function fmtPeriode(p) {
  if (!p) return '—';
  const [y, m] = String(p).split('-').map(Number);
  return m ? `${BULAN_PANJANG[m - 1]} ${y}` : p;
}
export function fmtDateTime(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function fmtNum(n, digits = 0) {
  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function fmtPct(r) { return r === null || r === undefined ? '—' : `${fmtNum(r * 100, 1)}%`; }
export function fmtSize(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

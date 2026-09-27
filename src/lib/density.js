/**
 * Kalkulator Density at 15°C — diport dari aplikasi PANTAS (bongkaran-app/src/lib/density.ts).
 *
 * Sumber utama: Tabel ASTM-IP 53 "Density Reduction to 15°C" (data/table53.js).
 * Nilai di antara baris/kolom dihitung dengan interpolasi linear (bilinear),
 * sama seperti cara membaca tabel cetak. Di luar cakupan tabel dipakai rumus
 * standar ASTM D1250 / API MPMS 11.1 Tabel 53B sebagai cadangan.
 */
import table from '../data/table53.js'
import { parseAngka } from './format.js'

const EPS = 1e-9
const DENSITIES = table.densities
const TEMPS = table.temps
const VALUES = table.values

/** Toleransi selisih density 15°C terhadap penerimaan terakhir (checklist 2.2.f–2.2.l). */
export const DENSITY_TOLERANCE = 0.003

export const METHOD_LABEL = {
  table: 'Tabel ASTM 53',
  formula: 'Rumus ASTM 53B',
}

/** Terima input g/mL ("0,745") maupun kg/m³ ("745"). */
export function normalizeDensity(input) {
  const n = parseAngka(input)
  if (n === null || n <= 0) return null
  return n > 2 ? n / 1000 : n
}

function bracket(arr, x, maxGap) {
  for (let i = 0; i < arr.length; i++) {
    if (Math.abs(arr[i] - x) < EPS) return [i, i]
    if (i < arr.length - 1 && arr[i] < x && x < arr[i + 1]) {
      return arr[i + 1] - arr[i] <= maxGap + EPS ? [i, i + 1] : null
    }
  }
  return null
}

function fromTable(d, t) {
  const di = bracket(DENSITIES, d, 0.001)
  const ti = bracket(TEMPS, t, 0.5)
  if (!di || !ti) return null
  const c00 = VALUES[ti[0]][di[0]]
  const c01 = VALUES[ti[0]][di[1]]
  const c10 = VALUES[ti[1]][di[0]]
  const c11 = VALUES[ti[1]][di[1]]
  if (c00 === null || c01 === null || c10 === null || c11 === null) return null
  const fd = di[0] === di[1] ? 0 : (d - DENSITIES[di[0]]) / (DENSITIES[di[1]] - DENSITIES[di[0]])
  const ft = ti[0] === ti[1] ? 0 : (t - TEMPS[ti[0]]) / (TEMPS[ti[1]] - TEMPS[ti[0]])
  const top = c00 + (c01 - c00) * fd
  const bottom = c10 + (c11 - c10) * fd
  return top + (bottom - top) * ft
}

/** ASTM D1250-80 Tabel 53B (generalized products), densitas dalam kg/m³. */
function alpha53B(rho15) {
  if (rho15 < 770.5) return 346.4228 / rho15 ** 2 + 0.4388 / rho15
  if (rho15 < 787.5) return -0.00336312 + 2680.3206 / rho15 ** 2
  if (rho15 < 838.5) return 594.5418 / rho15 ** 2
  return 186.9696 / rho15 ** 2 + 0.4862 / rho15
}

function fromFormula53B(d, t) {
  const rhoObs = d * 1000
  if (rhoObs < 610 || rhoObs > 1075 || t < -18 || t > 95) return null
  let rho15 = rhoObs
  for (let i = 0; i < 50; i++) {
    const a = alpha53B(rho15)
    const dt = t - 15
    const next = rhoObs / Math.exp(-a * dt * (1 + 0.8 * a * dt))
    const done = Math.abs(next - rho15) < 1e-7
    rho15 = next
    if (done) break
  }
  return rho15 / 1000
}

export function round4(n) {
  return Math.round(n * 10000) / 10000
}

/** Density at 15°C dari density observasi & suhu. Null bila input tidak valid. */
export function density15(obs, suhu) {
  const d = normalizeDensity(obs)
  const t = parseAngka(suhu)
  if (d === null || t === null) return null
  const tableValue = fromTable(d, t)
  if (tableValue !== null) return { value: round4(tableValue), method: 'table' }
  const formulaValue = fromFormula53B(d, t)
  if (formulaValue !== null) return { value: round4(formulaValue), method: 'formula' }
  return null
}

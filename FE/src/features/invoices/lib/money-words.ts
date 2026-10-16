/**
 * Đọc số tiền bằng chữ tiếng Việt cho dòng "Bằng chữ" trên phiếu thu:
 * 1.055.000 → "Một triệu không trăm năm mươi lăm nghìn đồng".
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
const GROUPS = ['', 'nghìn', 'triệu', 'tỷ']

/** Đọc nhóm 3 chữ số; `full` = nhóm không đứng đầu nên đọc cả "không trăm", "linh" */
function readTriple(n: number, full: boolean): string {
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const u = n % 10
  const words: string[] = []
  if (h > 0 || full) words.push(DIGITS[h], 'trăm')
  if (t === 0) {
    if (u > 0 && (h > 0 || full)) words.push('linh')
    if (u > 0) words.push(DIGITS[u])
  } else if (t === 1) {
    words.push('mười')
    if (u === 5) words.push('lăm')
    else if (u > 0) words.push(DIGITS[u])
  } else {
    words.push(DIGITS[t], 'mươi')
    if (u === 1) words.push('mốt')
    else if (u === 4) words.push('tư')
    else if (u === 5) words.push('lăm')
    else if (u > 0) words.push(DIGITS[u])
  }
  return words.join(' ')
}

export function vndInWords(value: number): string {
  let n = Math.round(Math.abs(value))
  if (n === 0) return 'Không đồng'
  const groups: number[] = []
  while (n > 0) {
    groups.push(n % 1000)
    n = Math.floor(n / 1000)
  }
  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (g === 0) continue
    const text = readTriple(g, i < groups.length - 1)
    parts.push(GROUPS[i] ? `${text} ${GROUPS[i]}` : text)
  }
  const sentence = `${parts.join(' ')} đồng`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

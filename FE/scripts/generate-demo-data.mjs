/**
 * Sinh FE/src/mock/seed/demo-data.json cho demo Quản lý Phòng khám (docs/06-THIET-KE-CSDL.md §5).
 *
 *   pnpm seed:generate
 *
 * Danh mục viết tay ở đầu file; lịch hẹn, lượt khám mô phỏng 16 tuần (tuần −13 tới tuần +2 so với tuần hiện tại)
 * bằng bộ sinh số giả ngẫu nhiên có hạt giống cố định: chạy lại ra đúng file cũ.
 * Ngày ghi dạng chỉ số ngày `i` tính từ Thứ Hai của tuần hiện tại (i = tuần × 7 + thứ − 1) để rơi đúng thứ trong tuần
 * dù nạp vào ngày nào; dữ liệu của kịch bản kiểm thử ghi dạng lệch ngày `d` so với hôm nay (06 §5.3, §5.6).
 * Trạng thái (đã khám, đang chờ, chưa đến…) không ghi trong file: lúc nạp so mốc thời gian với giờ hiện tại.
 */
import { writeFileSync } from 'node:fs'

const OUT = new URL('../src/mock/seed/demo-data.json', import.meta.url)

// ───────────────────────────── Bộ sinh ngẫu nhiên (mulberry32)
let seed = 20261110
function rnd() {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const chance = (p) => rnd() < p
function weighted(entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rnd() * total
  for (const [v, w] of entries) {
    r -= w
    if (r < 0) return v
  }
  return entries[entries.length - 1][0]
}
function sample(arr, n) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}
const pad = (n, w) => String(n).padStart(w, '0')

// ───────────────────────────── Danh mục (06 §5.1, 05 §1)
const specialties = [
  { code: 'RHM', name: 'Răng hàm mặt', exam: 'KB01', max: 1 },
  { code: 'NOI', name: 'Nội tổng quát', exam: 'KB02', max: 2 },
  { code: 'NHI', name: 'Nhi', exam: 'KB03', max: 2 },
]

// [code, name, group, specialty|null, unit, price, tooth?]
const SV = [
  ['KB01', 'Khám răng hàm mặt', 'Kham', 'RHM', 'Lan', 100000],
  ['KB02', 'Khám nội tổng quát', 'Kham', 'NOI', 'Lan', 150000],
  ['KB03', 'Khám nhi', 'Kham', 'NHI', 'Lan', 120000],
  ['NK01', 'Cạo vôi răng, đánh bóng', 'ThuThuat', 'RHM', 'Lan', 300000],
  ['NK02', 'Trám răng composite', 'ThuThuat', 'RHM', 'Rang', 400000, true],
  ['NK03', 'Nhổ răng sữa', 'ThuThuat', 'RHM', 'Rang', 100000, true],
  ['NK04', 'Điều trị tủy răng hàm', 'ThuThuat', 'RHM', 'Rang', 1500000, true],
  ['NK05', 'Điều trị tủy răng cửa', 'ThuThuat', 'RHM', 'Rang', 1000000, true],
  ['NK06', 'Răng sứ Zirconia', 'ThuThuat', 'RHM', 'Rang', 4500000, true],
  ['NK07', 'Răng sứ kim loại', 'ThuThuat', 'RHM', 'Rang', 1500000, true],
  ['NK08', 'Nhổ răng thường', 'ThuThuat', 'RHM', 'Rang', 500000, true],
  ['NK10', 'Tẩy trắng răng tại phòng', 'ThuThuat', 'RHM', 'Lan', 2500000],
  ['NK11', 'Bôi fluor phòng sâu răng', 'ThuThuat', 'RHM', 'Lan', 200000],
  ['NK12', 'Trám bít hố rãnh', 'ThuThuat', 'RHM', 'Rang', 250000, true],
  ['NK13', 'Làm mão tạm', 'ThuThuat', 'RHM', 'Rang', 300000, true],
  ['CLS01', 'Chụp phim răng quanh chóp', 'CanLamSang', 'RHM', 'Phim', 80000],
  ['CLS02', 'Chụp phim toàn cảnh Panorex', 'CanLamSang', 'RHM', 'Phim', 200000],
  ['CLS03', 'Chụp CT Cone Beam một hàm', 'CanLamSang', 'RHM', 'Lan', 600000],
  ['CLS04', 'Tổng phân tích tế bào máu', 'CanLamSang', null, 'Lan', 120000],
  ['CLS05', 'Đường huyết mao mạch', 'CanLamSang', null, 'Lan', 40000],
  ['CLS06', 'Mỡ máu (Cholesterol, Triglycerid)', 'CanLamSang', 'NOI', 'Lan', 150000],
  ['CLS07', 'Siêu âm ổ bụng', 'CanLamSang', 'NOI', 'Ca', 200000],
  ['CLS08', 'Điện tim', 'CanLamSang', 'NOI', 'Lan', 100000],
  ['CLS09', 'Test nhanh cúm A/B', 'CanLamSang', null, 'Lan', 180000],
  ['CLS10', 'X-quang ngực thẳng', 'CanLamSang', null, 'Phim', 150000],
]
const services = SV.map(([code, name, group, spec, unit, price, tooth]) => ({
  code,
  name,
  group,
  spec,
  unit,
  price,
  ...(tooth ? { tooth: true } : {}),
}))
const svc = Object.fromEntries(services.map((s) => [s.code, s]))

// [code, name, ingredient, strength, form, unit, price, active?]
const MD = [
  ['T001', 'Paracetamol 500 mg', 'Paracetamol', '500 mg', 'Viên nén', 'viên', 1000],
  ['T002', 'Amoxicillin 500 mg', 'Amoxicillin', '500 mg', 'Viên nang', 'viên', 2000],
  ['T003', 'Nước súc miệng Chlorhexidine 0,12%', 'Chlorhexidine', '0,12%', 'Dung dịch', 'chai', 65000],
  ['T004', 'Ibuprofen 400 mg', 'Ibuprofen', '400 mg', 'Viên nén', 'viên', 1500],
  ['T005', 'Metronidazol 250 mg', 'Metronidazol', '250 mg', 'Viên nén', 'viên', 800],
  ['T006', 'Rodogyl', 'Spiramycin, Metronidazol', '0,75 MIU/125 mg', 'Viên nén', 'viên', 3500],
  ['T007', 'Augmentin 625 mg', 'Amoxicillin, Acid clavulanic', '500 mg/125 mg', 'Viên nén', 'viên', 12000],
  ['T008', 'Cephalexin 500 mg', 'Cephalexin', '500 mg', 'Viên nang', 'viên', 2500],
  ['T009', 'Clindamycin 300 mg', 'Clindamycin', '300 mg', 'Viên nang', 'viên', 4000],
  ['T010', 'Alpha chymotrypsin 4,2 mg', 'Chymotrypsin', '4,2 mg', 'Viên nén', 'viên', 1200],
  ['T011', 'Gel bôi lợi Metrogyl Denta', 'Metronidazol, Chlorhexidine', '20 g', 'Gel', 'tuýp', 45000],
  ['T012', 'Kem chống ê buốt răng', 'Kali nitrat, Natri fluorid', '75 g', 'Kem', 'tuýp', 75000],
  ['T013', 'Dexamethason 0,5 mg', 'Dexamethason', '0,5 mg', 'Viên nén', 'viên', 500],
  ['T014', 'Prednisolon 5 mg', 'Prednisolon', '5 mg', 'Viên nén', 'viên', 600],
  ['T015', 'Loratadin 10 mg', 'Loratadin', '10 mg', 'Viên nén', 'viên', 1500],
  ['T016', 'Cetirizin 10 mg', 'Cetirizin', '10 mg', 'Viên nén', 'viên', 1000],
  ['T017', 'Omeprazol 20 mg', 'Omeprazol', '20 mg', 'Viên nang', 'viên', 2000],
  ['T018', 'Esomeprazol 40 mg', 'Esomeprazol', '40 mg', 'Viên nén', 'viên', 6000],
  ['T019', 'Domperidon 10 mg', 'Domperidon', '10 mg', 'Viên nén', 'viên', 1500],
  ['T020', 'Smecta 3 g', 'Diosmectit', '3 g', 'Bột pha', 'gói', 4000],
  ['T021', 'Oresol', 'Natri clorid, Kali clorid, Glucose', '4,1 g', 'Bột pha', 'gói', 2500],
  ['T022', 'Enterogermina', 'Bacillus clausii', '2 tỷ bào tử', 'Hỗn dịch', 'ống', 7500],
  ['T023', 'Berberin 100 mg', 'Berberin', '100 mg', 'Viên nén', 'viên', 500],
  ['T024', 'Acetylcystein 200 mg', 'Acetylcystein', '200 mg', 'Bột pha', 'gói', 2500],
  ['T025', 'Ambroxol 30 mg', 'Ambroxol', '30 mg', 'Viên nén', 'viên', 1000],
  ['T026', 'Siro ho Prospan 100 ml', 'Cao lá thường xuân', '100 ml', 'Siro', 'chai', 85000],
  ['T027', 'Salbutamol 2 mg', 'Salbutamol', '2 mg', 'Viên nén', 'viên', 500],
  ['T028', 'Amlodipin 5 mg', 'Amlodipin', '5 mg', 'Viên nén', 'viên', 1000],
  ['T029', 'Losartan 50 mg', 'Losartan', '50 mg', 'Viên nén', 'viên', 2500],
  ['T030', 'Metformin 500 mg', 'Metformin', '500 mg', 'Viên nén', 'viên', 800],
  ['T031', 'Atorvastatin 20 mg', 'Atorvastatin', '20 mg', 'Viên nén', 'viên', 3000],
  ['T032', 'Vitamin 3B', 'Vitamin B1, B6, B12', '125/125/0,25 mg', 'Viên nén', 'viên', 1200],
  ['T033', 'Calci D3', 'Calci carbonat, Vitamin D3', '500 mg/200 IU', 'Viên nén', 'viên', 3500],
  ['T034', 'Sắt và acid folic', 'Sắt fumarat, Acid folic', '162 mg/0,75 mg', 'Viên nang', 'viên', 2000],
  ['T035', 'Siro kẽm gluconat', 'Kẽm gluconat', '100 ml', 'Siro', 'chai', 55000],
  ['T036', 'Paracetamol 250 mg trẻ em', 'Paracetamol', '250 mg', 'Bột sủi', 'gói', 2500],
  ['T037', 'Siro Ibuprofen 100 mg/5 ml', 'Ibuprofen', '60 ml', 'Hỗn dịch', 'chai', 45000],
  ['T038', 'Amoxicillin 250 mg trẻ em', 'Amoxicillin', '250 mg', 'Bột pha', 'gói', 3000],
  ['T039', 'Cefixim 100 mg', 'Cefixim', '100 mg', 'Bột pha', 'gói', 6000],
  ['T040', 'Siro Azithromycin 200 mg/5 ml', 'Azithromycin', '15 ml', 'Bột pha hỗn dịch', 'chai', 95000],
  ['T041', 'Natri clorid 0,9% nhỏ mũi', 'Natri clorid', '10 ml', 'Dung dịch', 'lọ', 5000],
  ['T042', 'Xịt mũi Otrivin', 'Xylometazolin', '0,05%', 'Dung dịch xịt', 'lọ', 60000],
  ['T043', 'Nhỏ mắt Natri clorid 0,9%', 'Natri clorid', '10 ml', 'Dung dịch', 'lọ', 4000],
  ['T044', 'Kem bôi Fucidin', 'Acid fusidic', '15 g', 'Kem', 'tuýp', 85000],
  ['T045', 'Kem bôi Hydrocortison 1%', 'Hydrocortison', '15 g', 'Kem', 'tuýp', 25000],
  ['T046', 'Diclofenac 50 mg', 'Diclofenac', '50 mg', 'Viên nén', 'viên', 800],
  ['T047', 'Meloxicam 7,5 mg', 'Meloxicam', '7,5 mg', 'Viên nén', 'viên', 1500],
  ['T048', 'Celecoxib 200 mg', 'Celecoxib', '200 mg', 'Viên nang', 'viên', 5000],
  ['T049', 'Tramadol Paracetamol', 'Tramadol, Paracetamol', '37,5/325 mg', 'Viên nén', 'viên', 6500],
  ['T050', 'Vitamin C 500 mg', 'Acid ascorbic', '500 mg', 'Viên nén', 'viên', 1000, false],
  ['T051', 'Vitamin C 1000 mg sủi', 'Acid ascorbic', '1000 mg', 'Viên sủi', 'viên', 3000],
  ['T052', 'Magne B6', 'Magnesi lactat, Vitamin B6', '470/5 mg', 'Viên nén', 'viên', 1500],
  ['T053', 'Siro ho Bảo Thanh', 'Dược liệu', '125 ml', 'Siro', 'chai', 45000],
  ['T054', 'Tiffy', 'Paracetamol, Clorpheniramin, Phenylephrin', '500/2/10 mg', 'Viên nén', 'viên', 1000],
  ['T055', 'Decolgen', 'Paracetamol, Phenylephrin, Clorpheniramin', '500/10/2 mg', 'Viên nén', 'viên', 1200],
  ['T056', 'Panadol Extra', 'Paracetamol, Cafein', '500/65 mg', 'Viên nén', 'viên', 1800],
  ['T057', 'Efferalgan 500 mg', 'Paracetamol', '500 mg', 'Viên sủi', 'viên', 2500],
  ['T058', 'Hapacol 150', 'Paracetamol', '150 mg', 'Bột sủi', 'gói', 1800],
  ['T059', 'Gaviscon', 'Natri alginat, Natri bicarbonat', '10 ml', 'Hỗn dịch', 'gói', 6000],
  ['T060', 'Phosphalugel', 'Nhôm phosphat', '20 g', 'Gel', 'gói', 5000],
  ['T061', 'Motilium-M', 'Domperidon', '10 mg', 'Viên nén', 'viên', 2000],
  ['T062', 'Buscopan 10 mg', 'Hyoscin butylbromid', '10 mg', 'Viên nén', 'viên', 2500],
  ['T063', 'Spasmaverine 40 mg', 'Alverin', '40 mg', 'Viên nén', 'viên', 1000],
  ['T064', 'Clorpheniramin 4 mg', 'Clorpheniramin', '4 mg', 'Viên nén', 'viên', 300],
  ['T065', 'Fexofenadin 60 mg', 'Fexofenadin', '60 mg', 'Viên nén', 'viên', 3000],
  ['T066', 'Montelukast 4 mg', 'Montelukast', '4 mg', 'Cốm', 'gói', 9000],
  ['T067', 'Budesonid khí dung 0,5 mg', 'Budesonid', '0,5 mg/2 ml', 'Hỗn dịch khí dung', 'ống', 18000],
  ['T068', 'Ventolin khí dung 2,5 mg', 'Salbutamol', '2,5 mg/2,5 ml', 'Dung dịch khí dung', 'ống', 9000],
  ['T069', 'Nystatin rơ miệng', 'Nystatin', '25.000 IU', 'Bột', 'gói', 2000],
  ['T070', 'Gel Kamistad', 'Lidocain, Chiết xuất hoa cúc', '10 g', 'Gel', 'tuýp', 65000],
  ['T071', 'Nước súc miệng T-B', 'Natri fluorid', '250 ml', 'Dung dịch', 'chai', 30000],
  ['T072', 'Gel fluor chống sâu răng', 'Natri fluorid', '1,23%', 'Gel', 'tuýp', 120000],
  ['T073', 'Nước súc miệng Eludril', 'Chlorhexidine, Clorobutanol', '90 ml', 'Dung dịch', 'chai', 95000],
  ['T074', 'Paracetamol Codein', 'Paracetamol, Codein', '500/30 mg', 'Viên sủi', 'viên', 2500],
  ['T075', 'Gabapentin 300 mg', 'Gabapentin', '300 mg', 'Viên nang', 'viên', 4500],
  ['T076', 'Vitamin E 400 IU', 'Tocopherol', '400 IU', 'Viên nang mềm', 'viên', 1500],
  ['T077', 'Glucosamin 500 mg', 'Glucosamin', '500 mg', 'Viên nang', 'viên', 3000],
  ['T078', 'Siro Ích nhi', 'Dược liệu', '90 ml', 'Siro', 'chai', 52000],
  ['T079', 'Men vi sinh Biogaia', 'Lactobacillus reuteri', '5 ml', 'Dung dịch nhỏ giọt', 'lọ', 250000],
  ['T080', 'Kem Bepanthen', 'Dexpanthenol', '30 g', 'Kem', 'tuýp', 95000],
]
const medicines = MD.map(([code, name, ing, str, form, unit, price, active]) => ({
  code,
  name,
  ing,
  str,
  form,
  unit,
  price,
  ...(active === false ? { active: false } : {}),
}))
const med = Object.fromEntries(medicines.map((m) => [m.code, m]))

// [icd, name, specialty]
const diagnoses = [
  ['K02.0', 'Sâu men răng', 'RHM'],
  ['K02.1', 'Sâu ngà răng', 'RHM'],
  ['K02.2', 'Sâu cement răng', 'RHM'],
  ['K03.2', 'Mòn răng', 'RHM'],
  ['K03.6', 'Cao răng, mảng bám', 'RHM'],
  ['K03.8', 'Ê buốt ngà răng', 'RHM'],
  ['K04.0', 'Viêm tủy răng', 'RHM'],
  ['K04.1', 'Hoại tử tủy răng', 'RHM'],
  ['K04.5', 'Viêm quanh chóp mạn', 'RHM'],
  ['K04.7', 'Áp xe quanh chóp', 'RHM'],
  ['K05.0', 'Viêm lợi cấp', 'RHM'],
  ['K05.1', 'Viêm lợi mạn', 'RHM'],
  ['K05.3', 'Viêm quanh răng mạn', 'RHM'],
  ['K01.1', 'Răng khôn mọc lệch, ngầm', 'RHM'],
  ['K07.3', 'Lệch lạc vị trí răng', 'RHM'],
  ['K08.1', 'Mất răng do nhổ hoặc chấn thương', 'RHM'],
  ['S02.5', 'Gãy răng', 'RHM'],
  ['K00.6', 'Rối loạn thay răng sữa', 'RHM'],
  ['K12.0', 'Loét áp-tơ miệng tái phát', 'RHM'],
  ['J00', 'Viêm mũi họng cấp', 'NOI'],
  ['J02.9', 'Viêm họng cấp', 'NOI'],
  ['J06.9', 'Nhiễm trùng hô hấp trên cấp', 'NOI'],
  ['J20.9', 'Viêm phế quản cấp', 'NOI'],
  ['I10', 'Tăng huyết áp vô căn', 'NOI'],
  ['E11.9', 'Đái tháo đường type 2', 'NOI'],
  ['E78.5', 'Rối loạn lipid máu', 'NOI'],
  ['K21.9', 'Trào ngược dạ dày thực quản', 'NOI'],
  ['K29.7', 'Viêm dạ dày', 'NOI'],
  ['K59.0', 'Táo bón', 'NOI'],
  ['A09', 'Tiêu chảy, viêm dạ dày ruột nhiễm trùng', 'NOI'],
  ['M54.5', 'Đau thắt lưng', 'NOI'],
  ['R51', 'Đau đầu', 'NOI'],
  ['J30.4', 'Viêm mũi dị ứng', 'NOI'],
  ['J21.9', 'Viêm tiểu phế quản cấp', 'NHI'],
  ['J18.9', 'Viêm phổi', 'NHI'],
  ['H66.9', 'Viêm tai giữa', 'NHI'],
  ['B08.4', 'Bệnh tay chân miệng', 'NHI'],
  ['A08.4', 'Nhiễm virus đường ruột', 'NHI'],
  ['L20.9', 'Viêm da cơ địa', 'NHI'],
  ['J45.9', 'Hen phế quản', 'NHI'],
  ['R63.0', 'Chán ăn', 'NHI'],
].map(([icd, name, spec]) => ({ icd, name, spec }))
const dx = Object.fromEntries(diagnoses.map((d) => [d.icd, d]))

// Giờ làm việc: [thứ, phút bắt đầu, phút kết thúc]; 1 = Thứ Hai
const range = (days, s, e) => days.map((d) => [d, s, e])
const doctors = [
  {
    code: 'BS01',
    name: 'Nguyễn Minh Khoa',
    title: 'ThS. BS.',
    spec: 'RHM',
    room: 'Phòng 1',
    bio: 'Hơn 12 năm điều trị nội nha, phục hình răng sứ.',
    user: 'bacsi',
    slot: 30,
    max: 1,
    hours: [...range([1, 2, 3, 4, 5, 6], 480, 720), ...range([1, 2, 3, 4, 5, 6], 810, 1050)],
  },
  {
    code: 'BS02',
    name: 'Trần Thu Hà',
    title: 'BS. CKI',
    spec: 'RHM',
    room: 'Phòng 2',
    bio: 'Nha khoa trẻ em, chỉnh nha, điều trị nha chu.',
    slot: 30,
    max: 1,
    hours: [...range([1, 2, 3, 4, 5, 6], 480, 720), ...range([1, 2, 3, 4, 5, 6], 810, 1050), ...range([1, 3, 5], 1050, 1200)],
  },
  {
    code: 'BS03',
    name: 'Lê Quốc Bảo',
    title: 'BS.',
    spec: 'RHM',
    room: 'Phòng 3',
    bio: 'Phẫu thuật nhổ răng khôn, cấy ghép implant.',
    slot: 30,
    max: 1,
    hours: [...range([1, 2, 3, 4, 5, 6], 480, 720), ...range([1, 2, 3, 4, 5, 6], 810, 1050)],
  },
  {
    code: 'BS04',
    name: 'Phạm Thị Lan',
    title: 'BS. CKII',
    spec: 'NOI',
    room: 'Phòng 4',
    bio: 'Nội tổng quát, quản lý tăng huyết áp, đái tháo đường.',
    slot: 30,
    max: 2,
    hours: [...range([1, 2, 3, 4, 5], 480, 720), ...range([1, 2, 3, 4, 5], 810, 1140), [6, 480, 720]],
  },
  {
    code: 'BS05',
    name: 'Võ Hoàng Nam',
    title: 'ThS. BS.',
    spec: 'NHI',
    room: 'Phòng 5',
    bio: 'Nhi khoa tổng quát, hô hấp, tiêu hóa trẻ em.',
    slot: 20,
    max: 2,
    hours: [...range([1, 2, 3, 4, 5], 900, 1200), ...range([6, 7], 480, 720)],
  },
]
const docByCode = Object.fromEntries(doctors.map((d) => [d.code, d]))

// Ngày nghỉ đột xuất theo chỉ số ngày (tuần × 7 + thứ − 1)
const di = (w, wd) => w * 7 + wd - 1
const daysOff = [
  { doc: 'BS03', i: di(-9, 6), part: 'CaNgay', reason: 'Nghỉ ốm' },
  { doc: 'BS02', i: di(-6, 3), part: 'CaNgay', reason: 'Dự hội thảo nha khoa' },
  { doc: 'BS04', i: di(-3, 5), part: 'Sang', reason: 'Khám sức khỏe cho doanh nghiệp' },
  { doc: 'BS05', i: di(2, 2), part: 'CaNgay', reason: 'Nghỉ phép' },
]
const offOf = (code, i) => daysOff.find((o) => o.doc === code && o.i === i)

function slotsOf(doc, i) {
  const wd = (((i % 7) + 7) % 7) + 1
  const off = offOf(doc.code, i)
  if (off?.part === 'CaNgay') return []
  const list = []
  for (const [d, s, e] of doc.hours) {
    if (d !== wd) continue
    for (let t = s; t + doc.slot <= e; t += doc.slot) {
      if (off?.part === 'Sang' && t < 720) continue
      if (off?.part === 'Chieu' && t >= 720) continue
      list.push(t)
    }
  }
  return list.sort((a, b) => a - b)
}

// ───────────────────────────── Bệnh nhân
const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Trương', 'Đinh', 'Mai', 'Lâm', 'Tô', 'Châu', 'Cao', 'Lương', 'Tạ', 'Hà', 'Thái', 'Văn']
const MID_F = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Minh', 'Bảo', 'Kim', 'Mỹ', 'Khánh', 'Phương', 'Diệu', 'Hoài', 'Quỳnh', 'Tuyết', 'Như', 'Thùy']
const GIVEN_F = ['Anh', 'Trang', 'Linh', 'Hương', 'Lan', 'Hà', 'Thảo', 'Vy', 'Nhi', 'Ngân', 'Hằng', 'Huyền', 'Quyên', 'Trâm', 'Uyên', 'Yến', 'Châu', 'My', 'Thư', 'Hạnh', 'Phương', 'Giang', 'Hoa', 'Nga', 'Oanh', 'Thủy', 'Vân', 'Loan', 'Nhung', 'Diễm', 'Xuân', 'Trinh', 'Dung', 'Liên']
const MID_M = ['Văn', 'Minh', 'Quốc', 'Hoàng', 'Đức', 'Gia', 'Thành', 'Anh', 'Hữu', 'Công', 'Tuấn', 'Ngọc']
const GIVEN_M = ['Huy', 'Nam', 'Khoa', 'Long', 'Tuấn', 'Phúc', 'Hải', 'Sơn', 'Duy', 'Khang', 'Bình', 'Dũng', 'Hùng', 'Thắng', 'Quân', 'Trung', 'Tài', 'Lộc', 'Phát', 'Kiên', 'Minh', 'Đạt']
const STREETS = ['Nguyễn Văn Linh', 'Hùng Vương', 'Lê Duẩn', 'Điện Biên Phủ', 'Hàm Nghi', 'Nguyễn Tri Phương', 'Tôn Đức Thắng', 'Ngô Quyền', 'Nguyễn Hữu Thọ', 'Phạm Văn Đồng', 'Lê Văn Hiến', 'Trưng Nữ Vương', 'Ông Ích Khiêm', 'Lê Thanh Nghị', 'Nguyễn Lương Bằng']
const DISTRICTS = ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ']
const ALLERGIES = ['Penicillin', 'Amoxicillin', 'Aspirin', 'Ibuprofen', 'Hải sản', 'Tôm cua', 'Phấn hoa', 'Sulfamid', 'Cephalexin']
const HISTORY = ['Tăng huyết áp', 'Đái tháo đường type 2', 'Hen phế quản', 'Viêm dạ dày', 'Rối loạn mỡ máu', 'Thoái hóa cột sống', 'Viêm mũi dị ứng']
const PREFIX = ['090', '091', '093', '094', '097', '098', '077', '070', '079', '081', '083', '084', '085', '086', '088', '096', '032', '033', '034', '035', '036', '037', '038', '039']

// Kịch bản kiểm thử (05 §1, 06 §5.6)
const fixtures = [
  { code: 'BN000125', name: 'Nguyễn Văn An', birth: '1985-03-15', g: 'Nam', phone: '0912345678', allergy: 'Amoxicillin, tôm cua', addr: '45 Lê Duẩn, Hải Châu, Đà Nẵng' },
  { code: 'BN000126', name: 'Trần Thị Bình', birth: '1990-09-02', g: 'Nu', phone: '0987654321', addr: '12 Hàm Nghi, Thanh Khê, Đà Nẵng' },
  { code: 'BN000127', name: 'Lê Gia Huy', bdo: -1580, g: 'Nam', phone: '0905111227', contact: 'Mẹ: Nguyễn Thị Hồng, 0905111227' },
  { code: 'BN000128', name: 'Phạm Văn Đức', birth: '1945-05-10', g: 'Nam', phone: '0905128128', history: 'Tăng huyết áp' },
  { code: 'BN000129', name: 'Võ Thị Hạnh', birth: '1979-06-21', g: 'Nu', phone: '0935129129' },
  { code: 'BN000130', name: 'Đặng Quốc Việt', birth: '1988-12-01', g: 'Nam', phone: '0935130130' },
  { code: 'BN000131', name: 'Bùi Thanh Tâm', birth: '1995-08-08', g: 'Nam', phone: '0916131131' },
  { code: 'BN000132', name: 'Đinh Văn Long', birth: '1979-01-21', g: 'Nam', phone: '0916132132' },
  { code: 'BN000133', name: 'Hồ Minh Thư', birth: '1992-04-17', g: 'Nu', phone: '0901133133' },
  { code: 'BN000134', name: 'Lương Đức Tài', birth: '1987-10-05', g: 'Nam', phone: '0901134134' },
  { code: 'BN000135', name: 'Kiều Phương Anh', birth: '1990-02-28', g: 'Nu', phone: '0901135135' },
  { code: 'BN000136', name: 'Tạ Quang Vinh', birth: '1983-07-09', g: 'Nam', phone: '0901136136' },
  { code: 'BN000137', name: 'Mạc Thị Yến', birth: '1976-11-30', g: 'Nu', phone: '0901137137' },
]
const FIXTURE_CODES = new Set(fixtures.map((f) => f.code))
const RESERVED_PHONES = new Set(['0978123456', '0933000111', '0977888999'])
const RESERVED_NAMES = new Set(['Hoàng Thị Mai', 'Lê Thị Thu', 'Đỗ Minh Tuấn', 'Nguyễn An'])

const usedPhones = new Set([...fixtures.map((f) => f.phone), ...RESERVED_PHONES])
const usedNames = new Set([...fixtures.map((f) => f.name), ...RESERVED_NAMES])
const newPhone = () => {
  let p
  do p = pick(PREFIX) + pad(int(0, 9999999), 7)
  while (usedPhones.has(p) || !/^0(3|5|7|8|9)\d{8}$/.test(p))
  usedPhones.add(p)
  return p
}
const newName = (male) => {
  let n
  do n = male ? `${pick(FAMILY)} ${pick(MID_M)} ${pick(GIVEN_M)}` : `${pick(FAMILY)} ${pick(MID_F)} ${pick(GIVEN_F)}`
  while (usedNames.has(n))
  usedNames.add(n)
  return n
}
const BASE_YEAR = 2026
const birthOfAge = (age) => `${BASE_YEAR - age}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`
const ageOf = (p) => (p.bdo !== undefined ? Math.floor(-p.bdo / 365.25) : BASE_YEAR - Number(p.birth.slice(0, 4)))

const patients = []
const adults = []
for (let n = 1; n <= 300; n++) {
  const code = `BN${pad(n, 6)}`
  const fx = fixtures.find((f) => f.code === code)
  if (fx) {
    patients.push(fx)
    continue
  }
  const kind = weighted([
    ['child', 25],
    ['adult', 60],
    ['elder', 15],
  ])
  const age = kind === 'child' ? int(1, 15) : kind === 'adult' ? int(16, 64) : int(65, 88)
  const male = chance(0.47)
  const p = { code, name: newName(male), birth: birthOfAge(age), g: male ? 'Nam' : 'Nu' }
  if (kind === 'child' && adults.length && chance(0.6)) {
    const parent = pick(adults)
    p.phone = parent.phone
    p.contact = `${parent.g === 'Nu' ? 'Mẹ' : 'Bố'}: ${parent.name}, ${parent.phone}`
  } else p.phone = newPhone()
  if (chance(0.7)) p.addr = `${int(2, 420)} ${pick(STREETS)}, ${pick(DISTRICTS)}, Đà Nẵng`
  if (chance(0.1)) p.allergy = sample(ALLERGIES, int(1, 2)).join(', ')
  if (kind !== 'child' && chance(age > 50 ? 0.45 : 0.12)) p.history = sample(HISTORY, int(1, 2)).join(', ')
  patients.push(p)
  if (kind !== 'child') adults.push(p)
}
const patByCode = Object.fromEntries(patients.map((p) => [p.code, p]))
const bulk = patients.filter((p) => !FIXTURE_CODES.has(p.code))
const regular = new Set(sample(bulk, 90).map((p) => p.code))
const poolFor = (spec) =>
  bulk
    .filter((p) => (spec === 'NHI' ? ageOf(p) <= 15 : spec === 'NOI' ? ageOf(p) >= 16 : ageOf(p) >= 3))
    .map((p) => [p.code, regular.has(p.code) ? 4 : 1])
const pools = { RHM: poolFor('RHM'), NOI: poolFor('NOI'), NHI: poolFor('NHI') }

// ───────────────────────────── Nội dung khám
const DENTAL = [
  { w: 22, reason: 'Khám răng định kỳ', sym: 'Không đau, muốn kiểm tra răng định kỳ.', ex: 'Cao răng độ 1–2 hai hàm, lợi viền nề nhẹ.', dx: ['K03.6'], orders: [['NK01']], rx: 0.2 },
  { w: 20, reason: 'Ê buốt khi ăn đồ lạnh', sym: 'Ê buốt khi uống nước lạnh khoảng 2 tuần.', ex: 'Lỗ sâu mặt nhai, đáy ngà mềm, thử lạnh dương tính, hết khi bỏ kích thích.', dx: ['K02.1'], orders: [['NK02', 1, 2]], cls: 0.3, rx: 0.3 },
  { w: 12, reason: 'Đau nhức răng hàm', sym: 'Đau nhức từng cơn về đêm, lan lên thái dương.', ex: 'Răng sâu lớn sát tủy, gõ dọc đau, thử lạnh đau kéo dài.', dx: ['K04.0'], orders: [['CLS01'], ['NK04', 1, 1]], rx: 0.95 },
  { w: 6, reason: 'Sưng lợi, đau răng', sym: 'Sưng lợi quanh răng, đau khi nhai 3 ngày.', ex: 'Răng đổi màu, ngách lợi sưng, có lỗ dò.', dx: ['K04.7', 'K04.1'], orders: [['CLS01'], ['NK05', 1, 1]], rx: 1 },
  { w: 10, reason: 'Chảy máu chân răng', sym: 'Chảy máu chân răng khi chải, hơi thở có mùi.', ex: 'Lợi viêm đỏ, cao răng nhiều, túi lợi 3–4 mm.', dx: ['K05.1'], orders: [['NK01']], rx: 0.6 },
  { w: 6, reason: 'Răng khôn mọc lệch', sym: 'Đau vùng góc hàm dưới, há miệng hạn chế nhẹ.', ex: 'Răng 38 mọc lệch gần, lợi trùm viêm.', dx: ['K01.1'], orders: [['CLS02'], ['NK08', 1, 1]], rx: 1 },
  { w: 6, reason: 'Trẻ lung lay răng sữa', sym: 'Răng sữa lung lay, răng vĩnh viễn đã mọc phía trong.', ex: 'Răng sữa lung lay độ 3.', dx: ['K00.6'], orders: [['NK03', 1, 1]], rx: 0.2, kids: true },
  { w: 6, reason: 'Trẻ sâu răng', sym: 'Ba mẹ thấy răng có lỗ đen.', ex: 'Sâu men nhiều răng sữa, vệ sinh kém.', dx: ['K02.0'], orders: [['NK11'], ['NK12', 1, 2]], rx: 0, kids: true },
  { w: 5, reason: 'Tư vấn bọc răng sứ', sym: 'Răng đã chữa tủy, muốn bọc sứ.', ex: 'Răng đã điều trị tủy, thân răng vỡ lớn.', dx: ['S02.5'], orders: [['CLS01']], rx: 0 },
  { w: 4, reason: 'Muốn tẩy trắng răng', sym: 'Răng ngả vàng, muốn tẩy trắng.', ex: 'Răng nhiễm màu ngoại sinh, không sâu.', dx: ['K03.2'], orders: [['NK01'], ['NK10']], rx: 0 },
  { w: 3, reason: 'Loét miệng', sym: 'Vết loét trong má, đau khi ăn.', ex: 'Vết loét áp-tơ 3 mm niêm mạc má.', dx: ['K12.0'], orders: [], rx: 1 },
]
const INTERNAL = [
  { w: 18, reason: 'Sốt, ho 3 ngày', sym: 'Sốt 38,5 °C, ho khan, đau họng.', ex: 'Họng đỏ, phổi không ran.', dx: ['J06.9'], cls: [['CLS04', 0.4]], rx: [['T001', 10], ['T025', 10], ['T016', 7]] },
  { w: 12, reason: 'Đau họng', sym: 'Đau họng, nuốt vướng.', ex: 'Amidan sưng đỏ, không mủ.', dx: ['J02.9'], rx: [['T008', 14], ['T001', 10]] },
  { w: 14, reason: 'Đau thượng vị', sym: 'Đau thượng vị sau ăn, ợ chua.', ex: 'Ấn thượng vị tức nhẹ, bụng mềm.', dx: ['K29.7', 'K21.9'], cls: [['CLS07', 0.4]], rx: [['T018', 14], ['T059', 14], ['T019', 10]] },
  { w: 16, reason: 'Tái khám huyết áp', sym: 'Thỉnh thoảng nhức đầu, đang uống thuốc huyết áp.', ex: 'Tim đều, phổi trong.', dx: ['I10'], cls: [['CLS08', 0.3], ['CLS06', 0.3]], rx: [['T028', 30], ['T029', 30]] },
  { w: 10, reason: 'Kiểm tra đường huyết', sym: 'Khát nhiều, tiểu nhiều.', ex: 'Thể trạng trung bình.', dx: ['E11.9'], cls: [['CLS05', 0.9], ['CLS06', 0.4]], rx: [['T030', 60], ['T031', 30]] },
  { w: 8, reason: 'Đau đầu, chóng mặt', sym: 'Đau đầu vùng thái dương, mất ngủ.', ex: 'Không dấu thần kinh khu trú.', dx: ['R51'], rx: [['T056', 10], ['T052', 20]] },
  { w: 8, reason: 'Tiêu chảy', sym: 'Đi ngoài phân lỏng 5 lần/ngày, đau quặn bụng.', ex: 'Bụng mềm, nhu động ruột tăng.', dx: ['A09'], rx: [['T020', 9], ['T021', 6], ['T023', 20]] },
  { w: 6, reason: 'Ho kéo dài', sym: 'Ho có đờm hơn 1 tuần.', ex: 'Phổi rải rác ran ngáy.', dx: ['J20.9'], cls: [['CLS10', 0.5]], rx: [['T024', 10], ['T007', 14], ['T026', 1]] },
  { w: 6, reason: 'Đau lưng', sym: 'Đau thắt lưng sau mang vác nặng.', ex: 'Co cứng cơ cạnh sống thắt lưng.', dx: ['M54.5'], rx: [['T047', 10], ['T032', 20]] },
  { w: 6, reason: 'Hắt hơi, sổ mũi', sym: 'Hắt hơi, ngứa mũi buổi sáng.', ex: 'Niêm mạc mũi nhợt, phù nề.', dx: ['J30.4'], rx: [['T065', 14], ['T042', 1]] },
]
const PEDIATRIC = [
  { w: 22, reason: 'Sốt, ho, sổ mũi', sym: 'Bé sốt 38 °C, ho, chảy mũi trong 2 ngày.', ex: 'Họng đỏ, phổi không ran.', dx: ['J00'], cls: [['CLS09', 0.3]], rx: [['T036', 6], ['T041', 2], ['T053', 1]] },
  { w: 12, reason: 'Ho khò khè', sym: 'Ho, thở khò khè về đêm.', ex: 'Phổi ran rít hai bên.', dx: ['J21.9'], rx: [['T068', 6], ['T024', 8]] },
  { w: 12, reason: 'Tiêu chảy', sym: 'Bé đi ngoài phân lỏng 4–5 lần/ngày.', ex: 'Không dấu mất nước.', dx: ['A08.4'], rx: [['T021', 6], ['T022', 10], ['T035', 1]] },
  { w: 8, reason: 'Phát ban, sốt', sym: 'Sốt nhẹ, nổi bóng nước lòng bàn tay, chân.', ex: 'Loét miệng, bóng nước lòng bàn tay, bàn chân.', dx: ['B08.4'], rx: [['T037', 1], ['T069', 6]] },
  { w: 8, reason: 'Đau tai', sym: 'Bé quấy khóc, kêu đau tai.', ex: 'Màng nhĩ phải đỏ, phồng.', dx: ['H66.9'], rx: [['T038', 14], ['T037', 1]] },
  { w: 6, reason: 'Ngứa, nổi mẩn', sym: 'Da khô, ngứa nhiều vùng khuỷu tay.', ex: 'Mảng da đỏ, khô, có vết gãi.', dx: ['L20.9'], rx: [['T080', 1], ['T045', 1]] },
  { w: 6, reason: 'Biếng ăn', sym: 'Bé biếng ăn, chậm tăng cân.', ex: 'Thể trạng gầy nhẹ.', dx: ['R63.0'], rx: [['T078', 1], ['T035', 1]] },
]

DENTAL.forEach((t, n) => (t.id = `R${n}`))
INTERNAL.forEach((t, n) => (t.id = `N${n}`))
PEDIATRIC.forEach((t, n) => (t.id = `P${n}`))
const templates = {}
for (const t of [...DENTAL, ...INTERNAL, ...PEDIATRIC]) templates[t.id] = { reason: t.reason, sym: t.sym, ex: t.ex, dx: t.dx }
templates.K = { reason: 'Điều trị theo kế hoạch', sym: 'Bệnh nhân đến làm tiếp kế hoạch điều trị.', ex: 'Tình trạng răng ổn định, đủ điều kiện làm tiếp.', dx: ['K04.1'] }
let customSeq = 0
const ADVICE = ['Vệ sinh răng miệng kỹ, chải răng 2 lần/ngày.', 'Ăn nhẹ, uống nhiều nước, nghỉ ngơi.', 'Tái khám khi có bất thường.', 'Uống thuốc đúng giờ, tránh đồ cay nóng.', 'Không ăn nhai bên răng vừa điều trị trong 2 giờ.']
const USAGE = {
  viên: ['Uống 1 viên sau ăn sáng, tối', 'Uống 1 viên x 3 lần/ngày sau ăn', 'Uống 1 viên khi đau, cách nhau ít nhất 6 giờ', 'Uống 1 viên buổi sáng'],
  gói: ['Pha 1 gói với nước, uống 2 lần/ngày', 'Pha 1 gói uống x 3 lần/ngày'],
  chai: ['Súc miệng 15 ml x 2 lần/ngày sau chải răng', 'Uống 5 ml x 3 lần/ngày'],
  lọ: ['Nhỏ mỗi bên mũi 2 giọt x 3 lần/ngày', 'Xịt mỗi bên 1 nhát x 2 lần/ngày'],
  tuýp: ['Bôi lớp mỏng x 2 lần/ngày'],
  ống: ['Khí dung 1 ống x 2 lần/ngày', 'Uống 1 ống/ngày'],
}
const USAGES = [...new Set([...Object.values(USAGE).flat(), 'Dùng theo hướng dẫn'])]
const usageOf = (code) => USAGES.indexOf(pick(USAGE[med[code].unit] ?? ['Dùng theo hướng dẫn']))
const TEETH_POST = [16, 17, 26, 27, 36, 37, 46, 47, 15, 25, 35, 45]
const TEETH_ANT = [11, 12, 21, 22, 13, 23, 31, 41]
const TEETH_KID = [51, 52, 61, 62, 71, 72, 81, 82, 54, 64, 74, 84]
const pickTeeth = (n, kids, anterior) => sample(kids ? TEETH_KID : anterior ? TEETH_ANT : TEETH_POST, n).sort((a, b) => a - b)

// ───────────────────────────── Mô phỏng theo ngày
const I_MIN = di(-13, 1)
const I_MAX = di(2, 7)
const records = [] // lịch hẹn và lượt đến trực tiếp
const followUps = []
const plans = []
const reservations = new Map() // i → [{ doc, p, kind, ... }]
let seqKey = 0
const key = (prefix) => `${prefix}${++seqKey}`
const patVisits = new Map() // code → [i] để không khám 2 lần cùng ngày
const busyDay = (p, i) => (patVisits.get(p) ?? []).includes(i)
const markDay = (p, i) => (patVisits.has(p) ? patVisits.get(p).push(i) : patVisits.set(p, [i]))

// Mật độ theo tuần: [khung tối đa 1, mỗi chỗ của khung tối đa 2]; tuần 0 có phần thêm `x` (bỏ khi ngày đã qua)
function density(i, doc) {
  const w = Math.floor(i / 7)
  const one = doc.max === 1
  if (w <= -1) return { base: one ? 0.19 : 0.13, extra: 0 }
  if (w === 0) return { base: one ? 0.19 : 0.13, extra: one ? 0.5 : 0.32 }
  if (w === 1) return { base: one ? 0.36 : 0.22, extra: 0 }
  return { base: one ? 0.16 : 0.1, extra: 0 }
}

function examContent(doc, p, plan) {
  const spec = doc.spec
  const kid = ageOf(p) <= 12
  if (spec === 'RHM') {
    const list = DENTAL.filter((t) => (t.kids ? kid : !kid || chance(0.15)))
    const t = weighted(list.map((x) => [x, x.w]))
    const orders = []
    if (t.cls && chance(t.cls)) orders.push(['CLS01', null, 1])
    for (const [code, , nTeeth] of t.orders) {
      const s = svc[code]
      if (s.tooth) {
        const n = int(1, nTeeth ?? 1)
        const teeth = pickTeeth(n, kid, code === 'NK05')
        orders.push([code, teeth.join(','), teeth.length])
      } else orders.push([code, null, 1])
    }
    const rx = []
    if (chance(t.rx)) {
      const set = weighted([
        [[['T002', 15], ['T001', 10]], 4],
        [[['T006', 15], ['T004', 10], ['T003', 1]], 3],
        [[['T001', 10], ['T003', 1]], 3],
        [[['T008', 15], ['T010', 15]], 2],
        [[['T004', 10]], 2],
        [[['T012', 1]], 1],
      ])
      for (const [code, qty] of set) rx.push([code, kid ? Math.min(qty, 6) : qty])
    }
    return { tid: t.id, dxs: t.dx, orders, rx, vit: null }
  }
  const list = spec === 'NOI' ? INTERNAL : PEDIATRIC
  const t = weighted(list.map((x) => [x, x.w]))
  const orders = []
  for (const [code, pr] of t.cls ?? []) if (chance(pr)) orders.push([code, null, 1])
  const rx = t.rx.map(([code, qty]) => [code, qty])
  const age = ageOf(p)
  const vit =
    spec === 'NHI'
      ? [Number((36.8 + rnd() * 2).toFixed(1)), int(90, 140), null, null, Number((Math.max(3, age * 2.6 + 8 + rnd() * 4)).toFixed(1)), Math.round(Math.min(165, 60 + age * 6.5))]
      : [Number((36.4 + rnd() * 1.4).toFixed(1)), int(64, 96), int(105, 160), int(65, 98), Number((48 + rnd() * 30).toFixed(1)), int(150, 178)]
  if (vit[3] !== null && vit[3] >= vit[2]) vit[3] = vit[2] - 30
  return { tid: t.id, dxs: t.dx, orders, rx, vit }
}

function avoidAllergy(p, rx) {
  if (!p.allergy) return rx
  const keys = p.allergy
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
  return rx.filter(([code]) => !keys.some((k) => med[code].ing.toLowerCase().includes(k) || k.includes(med[code].ing.toLowerCase())))
}

/** Lượt khám đầy đủ: lý do, sinh hiệu, chẩn đoán, chỉ định, đơn, hẹn tái khám, thanh toán */
function makeVisit(doc, p, i, opts = {}) {
  const c = opts.content ?? examContent(doc, p)
  const v = { t: c.tid }
  if (c.dxo) v.dxo = c.dxo
  if (c.vit) v.vit = c.vit
  if (c.dxs.length === 1 && chance(0.25) && doc.spec !== 'RHM') {
    const extra = pick(diagnoses.filter((d) => d.spec === doc.spec && d.icd !== c.dxs[0]))
    v.dx2 = extra.icd
  }
  const ord = c.orders.map(([code, teeth, qty]) => {
    const o = [code, teeth, qty]
    if (svc[code].group === 'CanLamSang') o.push(clsResult(code))
    return o
  })
  if (opts.planItems) for (const it of opts.planItems) ord.push([it.code, it.teeth, it.qty, -1, `${it.plan}#${it.idx}`])
  if (ord.length) v.ord = ord
  const rx = avoidAllergy(p, c.rx).map(([code, qty]) => {
    const line = [code, qty, Math.max(1, Math.min(90, Math.ceil(qty / 2))), usageOf(code)]
    if (chance(0.05)) line.push(1) // mua ngoài
    return line
  })
  if (rx.length) v.rx = rx
  v.adv = int(0, ADVICE.length - 1)
  return v
}

const RESULTS = {
  CLS01: ['Tổn thương sâu lan sát buồng tủy, chưa thấy tổn thương quanh chóp.', 'Vùng thấu quang quanh chóp đường kính khoảng 3 mm.', 'Ống tủy thẳng, chưa thấy bất thường quanh chóp.'],
  CLS02: ['Răng 38 mọc lệch gần 45 độ, chân răng cách ống thần kinh khoảng 2 mm.'],
  CLS03: ['Xương hàm đủ chiều cao, chiều rộng cho cấy ghép.'],
  CLS04: ['Bạch cầu 11,2 G/L, tăng nhẹ bạch cầu trung tính.', 'Công thức máu trong giới hạn bình thường.'],
  CLS05: ['Đường huyết mao mạch lúc đói 7,8 mmol/L.', 'Đường huyết mao mạch 6,1 mmol/L.'],
  CLS06: ['Cholesterol 6,2 mmol/L, Triglycerid 2,4 mmol/L.'],
  CLS07: ['Gan nhiễm mỡ độ 1, các tạng khác chưa thấy bất thường.', 'Chưa thấy bất thường trên siêu âm.'],
  CLS08: ['Nhịp xoang đều 78 lần/phút, trục trung gian.'],
  CLS09: ['Âm tính cúm A, cúm B.', 'Dương tính cúm A.'],
  CLS10: ['Phổi hai bên rõ, bóng tim không to.'],
}
const RESULT_LIST = Object.values(RESULTS).flat()
const clsResult = (code) => RESULT_LIST.indexOf(pick(RESULTS[code]))

const FU_DAYS = { RHM: [[7, 3], [14, 2], [30, 2], [90, 2]], NOI: [[7, 3], [14, 3], [30, 3]], NHI: [[3, 3], [5, 2], [7, 2]] }
const FU_NOTE = { RHM: ['Kiểm tra sau điều trị', 'Tái khám, làm tiếp răng còn lại', 'Cạo vôi định kỳ'], NOI: ['Tái khám, xem lại xét nghiệm', 'Đo lại huyết áp, chỉnh thuốc', 'Kiểm tra đường huyết'], NHI: ['Tái khám nếu còn sốt', 'Kiểm tra lại phổi', 'Xem lại tai'] }

function reserve(i, item) {
  if (!reservations.has(i)) reservations.set(i, [])
  reservations.get(i).push(item)
}

/** Tạo một lịch hẹn ở khung `m` của ngày `i`, kèm lượt khám nếu kết cục là đã khám */
function makeAppointment(doc, i, m, p, opts = {}) {
  const online = opts.src ? opts.src === 'O' : chance(0.35)
  const rec = { k: key('a'), i, m, doc: doc.code, p: p.code, src: online ? 'O' : 'L' }
  if (opts.x) rec.x = 1
  // Tạo trước ngày hẹn cd ngày, phút trong ngày cm
  let cd = opts.cd ?? (online ? weighted([[0, 3], [1, 4], [2, 3], [3, 2], [5, 2], [7, 1]]) : weighted([[0, 2], [1, 3], [2, 3], [4, 2], [7, 2], [14, 1]]))
  let cm = int(450, 1260)
  if (cd === 0 && cm > m - 90) {
    if (m - 90 >= 450) cm = int(420, m - 90)
    else cd = 1
  }
  rec.cd = cd
  rec.cm = cm
  if (online && chance(0.92) && !opts.nc) rec.conf = int(20, 240) // xác nhận sau bao nhiêu phút
  if (chance(0.25)) rec.svc = doc.spec === 'RHM' ? pick(['KB01', 'NK01', 'NK02']) : svc[specialties.find((s) => s.code === doc.spec).exam].code
  if (chance(0.4)) rec.rs = pick(doc.spec === 'RHM' ? ['Đau răng', 'Khám răng định kỳ', 'Ê buốt răng', 'Tư vấn bọc sứ'] : doc.spec === 'NOI' ? ['Sốt, ho', 'Đau bụng', 'Khám tổng quát', 'Tái khám'] : ['Bé sốt', 'Bé ho', 'Tiêm ngừa tư vấn', 'Bé biếng ăn'])
  const outcome = opts.outcome ?? weighted([['done', 83], ['noshow', 10], ['cancel', 7]])
  if (outcome === 'cancel') {
    rec.o = 'cancel'
    rec.cr = weighted([['BenhNhanBan', 6], ['DatTrung', 2], ['Khac', 1]])
    if (rec.cr === 'Khac') rec.cn = 'Bệnh nhân chuyển sang khám nơi khác'
    rec.ca = Math.max(1, Math.floor((cd * 1440 + m - cm) * (0.3 + rnd() * 0.6))) // hủy sau khi tạo bao nhiêu phút
  } else if (outcome === 'noshow') rec.o = 'noshow'
  else {
    rec.o = 'done'
    rec.ci = weighted([[int(-20, -6), 30], [int(-5, 5), 45], [int(6, 15), 17], [int(16, 40), 8]])
  }
  return rec
}

function runSimulation() {
for (let i = I_MIN; i <= I_MAX; i++) {
  for (const doc of doctors) {
    const slots = slotsOf(doc, i)
    if (!slots.length) continue
    const taken = new Map() // phút → số lịch
    const dayRecs = []
    const pool = pools[doc.spec]
    const pickPatient = () => {
      for (let t = 0; t < 30; t++) {
        const code = weighted(pool)
        if (!busyDay(code, i)) return patByCode[code]
      }
      return null
    }
    const freeSlot = (from = 0) => slots.find((s) => s >= from && (taken.get(s) ?? 0) < doc.max)
    // Lịch giữ chỗ: tái khám theo hẹn, buổi thực hiện kế hoạch
    for (const r of (reservations.get(i) ?? []).filter((r) => r.doc === doc.code)) {
      const s = freeSlot(r.prefer ?? 0) ?? freeSlot(0)
      if (s === undefined || busyDay(r.p, i)) {
        r.failed = true
        continue
      }
      taken.set(s, (taken.get(s) ?? 0) + 1)
      const p = patByCode[r.p]
      const rec = makeAppointment(doc, i, s, p, { src: 'L', outcome: 'done', cd: r.cd ?? 2 })
      rec.ci = int(-10, 5)
      if (r.kind === 'ret') {
        rec.fuRet = r.fu
        rec.free = r.free ? 1 : undefined
      }
      rec.v = makeVisit(doc, p, i, r.kind === 'plan' ? { planItems: r.items, content: planContent(r) } : {})
      if (r.kind === 'plan') rec.planVisit = r.plan
      r.rec = rec
      markDay(r.p, i)
      dayRecs.push(rec)
    }
    // Lịch ngẫu nhiên
    const d = density(i, doc)
    for (const s of slots) {
      for (let unit = 0; unit < doc.max; unit++) {
        if ((taken.get(s) ?? 0) > unit) continue
        const p0 = unit === 0 ? 1 : 0.55
        const isBase = chance(d.base * p0)
        const isExtra = !isBase && d.extra > 0 && chance(d.extra * p0)
        if (!isBase && !isExtra) continue
        const p = pickPatient()
        if (!p) continue
        const peak = s < 600 || (s >= 1020 && s < 1140) ? 1 : 0.75 // giờ đông 8–10h, 17–19h (NFR-07)
        if (!chance(peak)) continue
        taken.set(s, (taken.get(s) ?? 0) + 1)
        const rec = makeAppointment(doc, i, s, p, { x: isExtra })
        if (rec.o === 'done') rec.v = makeVisit(doc, p, i)
        markDay(p.code, i)
        dayRecs.push(rec)
      }
    }
    // Bệnh nhân đến trực tiếp
    const w = Math.floor(i / 7)
    const walkBase = doc.spec === 'RHM' ? int(0, 1) : int(0, 2)
    const walkExtra = w === 0 ? (doc.spec === 'RHM' ? int(0, 2) : int(1, 3)) : 0
    if (w <= 0) {
      for (let n = 0; n < walkBase + walkExtra; n++) {
        const p = pickPatient()
        if (!p) continue
        const s = pick(slots)
        const m = s + int(0, doc.slot - 1)
        const rec = { k: key('w'), i, m, doc: doc.code, p: p.code, src: 'W', o: 'done', ci: 0 }
        if (n >= walkBase) rec.x = 1
        rec.v = makeVisit(doc, p, i)
        markDay(p.code, i)
        dayRecs.push(rec)
      }
    }
    simulateQueue(doc, i, dayRecs)
    for (const rec of dayRecs) {
      records.push(rec)
      if (rec.v && i <= -8 && !rec.x && !rec.planVisit) maybeFollowUp(doc, rec)
    }
    if (doc.spec === 'RHM') maybePlan(doc, i, dayRecs)
  }
}
}

/** Mô phỏng hàng chờ một bác sĩ một ngày: giờ tiếp đón, bắt đầu, kết thúc khám (phút trong ngày) */
function simulateQueue(doc, i, dayRecs) {
  const visits = dayRecs.filter((r) => r.o === 'done')
  for (const r of visits) {
    r.cim = r.src === 'W' ? r.m : r.m + r.ci // phút tiếp đón
    r.qm = r.src !== 'W' && r.ci <= 15 ? r.m : r.cim // giờ xếp hàng (BR-09)
    const p = patByCode[r.p]
    const age = ageOf(p)
    if (age < 6 || age >= 75) r.pri = age < 6 ? 'Trẻ dưới 6 tuổi' : 'Người từ 75 tuổi'
    else if (chance(0.01) && p.g === 'Nu' && age >= 20 && age <= 40) {
      r.pri = 'Phụ nữ có thai'
      r.prm = 1
    }
  }
  const pending = [...visits].sort((a, b) => a.cim - b.cim)
  const firstStart = Math.min(...slotsOf(doc, i))
  let t = firstStart
  const done = new Set()
  while (done.size < pending.length) {
    const ready = pending.filter((r) => !done.has(r.k) && r.cim <= t)
    if (!ready.length) {
      t = Math.max(t, Math.min(...pending.filter((r) => !done.has(r.k)).map((r) => r.cim)))
      continue
    }
    ready.sort((a, b) => (a.pri ? 0 : 1) - (b.pri ? 0 : 1) || a.qm - b.qm || a.cim - b.cim)
    const r = ready[0]
    const dur = doc.spec === 'RHM' ? int(15, 40) + 8 * (r.v.ord?.filter((o) => svc[o[0]].group === 'ThuThuat').length ?? 0) : doc.spec === 'NOI' ? int(10, 20) : int(8, 16)
    r.sm = t
    r.fm = t + dur
    r.pd = int(3, 15) // thu tiền sau khi kết thúc bao nhiêu phút
    r.pm = weighted([['TienMat', 55], ['ChuyenKhoan', 35], ['The', 10]])
    if (i <= -1 && chance(0.03)) r.part = 1 // thu một phần, còn nợ
    t = r.fm
    done.add(r.k)
  }
}

function maybeFollowUp(doc, rec) {
  const pr = doc.spec === 'RHM' ? 0.35 : doc.spec === 'NOI' ? 0.5 : 0.3
  if (!chance(pr)) return
  const n = weighted(FU_DAYS[doc.spec])
  const due = rec.i + n
  const fu = { k: key('f'), v: rec.k, p: rec.p, doc: doc.code, due, note: pick(FU_NOTE[doc.spec]) }
  rec.v.fu = [n, fu.note]
  // Quay lại đúng hẹn khi ngày quay lại chắc chắn đã qua (tuần −1 trở về trước)
  const back = due + weighted([[-2, 1], [-1, 2], [0, 4], [1, 3], [2, 2], [4, 1], [6, 1]])
  if (back <= -1 && back > rec.i && chance(0.55)) {
    reserve(back, { doc: doc.code, p: rec.p, kind: 'ret', fu: fu.k, free: back >= due - 3 && back <= due + 7, prefer: int(0, 1) ? 0 : 780, cd: Math.min(3, back - rec.i - 1) })
    fu.ret = 1 // gắn lượt sau khi mô phỏng
    fu.sends = [due - 1]
    fu.appt = 1
  } else {
    const k = weighted([[0, 2], [1, 4], [2, 2], [3, 1]])
    fu.sends = [due - 1, due + 1, due + 3].slice(0, k)
    if (chance(0.35)) fu.call = [weighted([['KhongLienLacDuoc', 3], ['HenNgayKhac', 2], ['DongYDen', 1]]), due]
  }
  followUps.push(fu)
}

// ───────────────────────────── Kế hoạch điều trị (giữ chỗ trước vòng ngày nên tạo ở bước riêng)
function planContent(r) {
  return { tid: 'K', dxo: r.dx, dxs: [r.dx ?? 'K04.1'], orders: [], rx: chance(0.4) ? [['T001', 10]] : [], vit: null }
}

const PLAN_QUOTA = { DangDieuTri: 8, HoanThanh: 4, DungDieuTri: 2, DaBaoGia: 4, ChoDuyet: 2, Nhap: 2, TuChoi: 2 }
const planCount = {}
const PLAN_TEMPLATES = [
  {
    note: 'Điều trị tủy, bọc sứ răng hàm',
    big: 1,
    items: () => {
      const t = pick([36, 46, 26, 16])
      return [['NK04', [t]], ['NK06', [t]], ['NK01', null]]
    },
  },
  {
    note: 'Điều trị tủy, bọc sứ răng cửa',
    big: 1,
    items: () => {
      const t = pick([11, 21, 12])
      return [['NK05', [t]], ['NK07', [t]]]
    },
  },
  { note: 'Trám các răng sâu', big: 0, items: () => [['NK02', pickTeeth(2)], ['NK02', pickTeeth(2)], ['NK01', null]] },
  { note: 'Nhổ răng khôn hai bên', big: 1, items: () => [['CLS02', null], ['NK08', [38]], ['NK08', [48]]] },
  { note: 'Làm sạch, tẩy trắng răng', big: 1, items: () => [['NK01', null], ['NK10', null]] },
  {
    note: 'Phục hình hai răng sứ',
    big: 1,
    items: () => {
      const t = pick([46, 36])
      return [['NK04', [t]], ['NK06', [t]], ['NK06', [t - 1]]]
    },
  },
]
const DX_OF = { NK04: 'K04.0', NK05: 'K04.1', NK06: 'S02.5', NK07: 'S02.5', NK02: 'K02.1', NK08: 'K01.1', NK10: 'K03.2', NK01: 'K03.6', CLS02: 'K01.1' }

function planTotals(items) {
  let sub = 0
  let disc = 0
  for (const it of items) {
    const gross = svc[it.code].price * it.qty
    let d = 0
    if (it.dt === 'PhanTram') d = Math.floor((gross * it.dv) / 100 / 1000) * 1000
    else if (it.dt === 'SoTien') d = it.dv
    sub += gross
    disc += d
  }
  return { sub, disc, rate: sub ? (disc * 100) / sub : 0 }
}

function maybePlan(doc, i, dayRecs) {
  const treat = i >= -84 && i <= -24
  const recent = i >= -13 && i <= -2
  if ((!treat && !recent) || !chance(recent ? 0.45 : 0.14)) return
  const order = treat ? ['DangDieuTri', 'HoanThanh', 'DungDieuTri'] : ['DaBaoGia', 'ChoDuyet', 'Nhap', 'TuChoi']
  const want = order.find((s) => (planCount[s] ?? 0) < PLAN_QUOTA[s])
  if (!want) return
  const src = dayRecs.find(
    (r) => r.o === 'done' && !r.x && !r.planVisit && !FIXTURE_CODES.has(r.p) && ageOf(patByCode[r.p]) >= 16 && !plans.some((pl) => pl.p === r.p)
  )
  if (!src) return
  const tplt = pick(want === 'ChoDuyet' ? PLAN_TEMPLATES.filter((t) => t.big) : PLAN_TEMPLATES)
  const items = tplt.items().map(([code, teeth]) => ({ code, teeth: teeth ? teeth.join(',') : null, qty: teeth ? teeth.length : 1 }))
  if (want === 'ChoDuyet') {
    const big = items.reduce((a, b) => (svc[b.code].price * b.qty > svc[a.code].price * a.qty ? b : a))
    big.dt = 'PhanTram'
    big.dv = pick([20, 25, 30])
    if (planTotals(items).rate <= 10) big.dv = 40
  } else if (chance(0.4)) {
    const it = pick(items)
    const gross = svc[it.code].price * it.qty
    if (chance(0.5)) {
      it.dt = 'PhanTram'
      it.dv = pick([5, 10])
    } else {
      const v = Math.floor((gross * 0.1) / 100000) * 100000
      if (v > 0) {
        it.dt = 'SoTien'
        it.dv = Math.min(500000, v)
      }
    }
  }
  planCount[want] = (planCount[want] ?? 0) + 1
  const plan = { k: key('p'), p: src.p, doc: doc.code, i, m: src.fm + 10, src: src.k, st: want, n: Math.max(items.length, int(2, 4)), note: tplt.note, items }
  if (want === 'Nhap' && planCount[want] === 1) plan.review = 'Giảm giá vượt mức, đề nghị lập lại'
  if (want === 'TuChoi') plan.cancel = ['Bệnh nhân chưa sắp xếp được chi phí', int(1, 3)]
  // Buổi thực hiện hạng mục: mỗi tuần một hạng mục
  const doneCount = want === 'HoanThanh' ? items.length : want === 'DangDieuTri' ? int(1, items.length - 1) : want === 'DungDieuTri' ? 1 : 0
  for (let n = 0; n < doneCount; n++) {
    const day = i + 7 * (n + 1)
    if (day > -1) break
    const it = items[n]
    reserve(day, { doc: doc.code, p: src.p, kind: 'plan', plan: plan.k, items: [{ ...it, plan: plan.k, idx: n }], dx: DX_OF[it.code], prefer: pick([480, 600, 840]), cd: 6 })
  }
  if (want === 'DungDieuTri') plan.cancel = ['Bệnh nhân chuyển nơi khác điều trị', 7 * doneCount + 5]
  plans.push(plan)
}

runSimulation()

// ───────────────────────────── Gắn lượt quay lại vào dòng nhắc
for (const list of reservations.values()) {
  for (const r of list) {
    if (r.kind !== 'ret') continue
    const fu = followUps.find((f) => f.k === r.fu)
    if (!fu) continue
    if (r.rec) fu.ret = r.rec.k
    else {
      delete fu.ret
      delete fu.appt
    }
  }
}

// ───────────────────────────── Dữ liệu của kịch bản kiểm thử (ngày lệch `d` so với hôm nay)
function fixtureVisit(docCode, pCode, d, m, content) {
  const doc = docByCode[docCode]
  const p = patByCode[pCode]
  const rec = { k: key('a'), d, m, doc: docCode, p: pCode, src: 'L', cd: 3, cm: 600, o: 'done', ci: -5 }
  rec.v = makeVisit(doc, p, 0, { content })
  rec.cim = m - 5
  rec.qm = m
  rec.sm = m
  rec.fm = m + 25
  rec.pd = 6
  rec.pm = 'TienMat'
  records.push(rec)
  return rec
}
const cnt = (reason, sym, ex, dxs, orders, rx) => {
  const tid = `F${customSeq++}`
  templates[tid] = { reason, sym, ex, dx: dxs }
  return { tid, dxs, orders, rx, vit: null }
}
fixtureVisit('BS01', 'BN000125', -75, 540, cnt('Khám răng định kỳ', 'Muốn kiểm tra, lấy cao răng.', 'Cao răng độ 2 hai hàm, lợi viền nề.', ['K03.6'], [['NK01', null, 1]], [['T003', 1]]))
fixtureVisit('BS01', 'BN000125', -40, 600, cnt('Ê buốt răng hàm trên', 'Ê buốt khi uống nước lạnh 2 tuần.', 'Răng 16 sâu mặt nhai, thử lạnh dương tính.', ['K02.1'], [['CLS01', null, 1], ['NK02', '16', 1]], [['T001', 10], ['T003', 1]]))
fixtureVisit('BS01', 'BN000125', -12, 840, cnt('Kiểm tra răng đã trám', 'Hết ê buốt, kiểm tra lại.', 'Miếng trám răng 16 kín, khớp cắn ổn định.', ['K02.0'], [], []))
fixtureVisit('BS01', 'BN000126', -20, 900, cnt('Lấy cao răng', 'Chảy máu chân răng khi chải.', 'Cao răng nhiều, lợi viêm đỏ.', ['K05.1'], [['NK01', null, 1]], [['T003', 1]]))
const hanh = fixtureVisit('BS01', 'BN000129', -12, 960, cnt('Ê buốt răng hàm dưới', 'Ê buốt răng 36 khi ăn ngọt.', 'Răng 36 sâu ngà mặt nhai.', ['K02.1'], [['NK02', '36', 1]], [['T001', 6]]))
hanh.v.fu = [7, 'Kiểm tra sau trám răng']
followUps.push({ k: key('f'), v: hanh.k, p: 'BN000129', doc: 'BS01', dd: -5, note: 'Kiểm tra sau trám răng', sendsD: [-6] })
const viet = fixtureVisit('BS01', 'BN000130', -15, 1020, cnt('Đau răng khôn', 'Đau góc hàm phải.', 'Răng 48 lợi trùm viêm nhẹ.', ['K05.0'], [], [['T006', 10], ['T001', 10]]))
viet.v.fu = [7, 'Kiểm tra lợi trùm răng 48']
followUps.push({ k: key('f'), v: viet.k, p: 'BN000130', doc: 'BS01', dd: -8, note: 'Kiểm tra lợi trùm răng 48', sendsD: [-9] })
const yen = fixtureVisit('BS02', 'BN000137', -13, 870, cnt('Cạo vôi răng', 'Muốn lấy cao răng.', 'Cao răng độ 1.', ['K03.6'], [['NK01', null, 1]], []))
yen.v.fu = [14, 'Kiểm tra lợi sau cạo vôi']
followUps.push({ k: key('f'), v: yen.k, p: 'BN000137', doc: 'BS02', dd: 1, note: 'Kiểm tra lợi sau cạo vôi' })
// Lúc nạp mới xếp khung (06 §5.6)
records.push({ k: key('a'), fx: 'an', doc: 'BS01', p: 'BN000125', src: 'L', cd: 3, cm: 615, rs: 'Ê buốt răng hàm dưới', svc: 'KB01' })
records.push({ k: key('w'), fx: 'bs01w', doc: 'BS01', p: 'BN000133', src: 'W', ago: 12 })
records.push({ k: key('w'), fx: 'bs01w', doc: 'BS01', p: 'BN000134', src: 'W', ago: 6 })
records.push({ k: key('a'), fx: 'bs03', doc: 'BS03', p: 'BN000135', src: 'L', cd: 2, cm: 700, rs: 'Trám răng' })
records.push({ k: key('a'), fx: 'tc12', doc: 'BS01', p: 'BN000136', src: 'L', cd: 4, cm: 640, rs: 'Khám răng định kỳ' })
records.push({ k: key('a'), fx: 'tc11', d: 4, m: 600, doc: 'BS02', guest: ['Lê Thị Thu', '0933000111', 1994, 'Nu'], src: 'O', cd: 1, cm: 1250 })
records.push({ k: key('a'), fx: 'tc11', d: 6, m: 900, doc: 'BS02', guest: ['Lê Thị Thu', '0933000111', 1994, 'Nu'], src: 'O', cd: 1, cm: 1255 })

// Khách đặt online lần đầu (chưa có hồ sơ): chỉ ở ngày tương lai hoặc phần thêm của tuần này
for (const r of records) {
  if (r.src !== 'O' || r.fx || r.i === undefined || r.i < 0) continue
  if ((r.i >= 7 || r.x) && chance(0.18)) {
    const male = chance(0.45)
    r.guest = [newName(male), newPhone(), int(1965, 2018), male ? 'Nam' : 'Nu']
    delete r.p
    delete r.v
    delete r.conf
    delete r.ci
    r.o = 'noshow'
  }
}

// ───────────────────────────── Ngày tạo hồ sơ bệnh nhân
const firstDay = new Map()
for (const r of records) {
  if (!r.p || r.i === undefined) continue
  const created = r.i - (r.cd ?? 0)
  if (!firstDay.has(r.p) || created < firstDay.get(r.p)) firstDay.set(r.p, created)
}
for (const p of patients) {
  if (FIXTURE_CODES.has(p.code)) p.cdd = -int(100, 140)
  else p.c = (firstDay.get(p.code) ?? int(-120, -1)) - int(0, 3)
}

// ───────────────────────────── Ghi file
for (const r of records) {
  delete r.ci
  delete r.qm
  delete r.pri
}
const data = {
  $comment: 'Sinh bằng scripts/generate-demo-data.mjs, không sửa tay. Định dạng: docs/06-THIET-KE-CSDL.md §5.',
  specialties,
  services,
  medicines,
  diagnoses,
  doctors,
  daysOff,
  patients,
  templates,
  advice: ADVICE,
  usages: USAGES,
  results: RESULT_LIST,
  phrases: [
    'Uống 1 viên sau ăn sáng, tối',
    'Uống 1 viên x 3 lần/ngày sau ăn',
    'Uống 1 viên khi đau, cách nhau ít nhất 6 giờ',
    'Súc miệng 15 ml x 2 lần/ngày sau chải răng',
    'Ngậm 1 viên khi đau',
    'Bôi lớp mỏng lên vùng lợi x 2 lần/ngày',
  ],
  records,
  followUps,
  plans,
}
const out = ['{']
const keys = Object.keys(data)
keys.forEach((k, n) => {
  const v = data[k]
  const tail = n < keys.length - 1 ? ',' : ''
  if (Array.isArray(v)) {
    out.push(`  ${JSON.stringify(k)}: [`)
    v.forEach((item, j) => out.push(`    ${JSON.stringify(item)}${j < v.length - 1 ? ',' : ''}`))
    out.push(`  ]${tail}`)
  } else out.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${tail}`)
})
out.push('}')
writeFileSync(OUT, out.join('\n') + '\n')

const visits = records.filter((r) => r.v)
const appts = records.filter((r) => r.src !== 'W')
const past = records.filter((r) => r.i !== undefined && r.i <= -1)
console.log(`Bác sĩ ${doctors.length}, dịch vụ ${services.length}, thuốc ${medicines.length}, chẩn đoán ${diagnoses.length}, bệnh nhân ${patients.length}`)
console.log(`Bản ghi ${records.length}: lịch hẹn ${appts.length}, đến trực tiếp ${records.length - appts.length}, có lượt khám ${visits.length}`)
console.log(
  `Tuần −13 tới −1: ${past.length} bản ghi, lượt khám ${past.filter((r) => r.v).length}, không đến ${past.filter((r) => r.o === 'noshow').length}, hủy ${past.filter((r) => r.o === 'cancel').length}`
)
console.log(`Dòng nhắc ${followUps.length} (quay lại ${followUps.filter((f) => f.ret).length}), kế hoạch ${plans.length} ${JSON.stringify(planCount)}`)
console.log(`Ghi ${OUT.pathname}`)

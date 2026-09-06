import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { LessonReportRow, WeeklyReportConfig, TimetableSlot, PPCTItem, Teacher } from '../types';
import { computeReportRowSpans } from './generator';

// Vietnamese common surname list for intelligent row detection
const COMMON_VIETNAMESE_SURNAMES = [
  'nguyễn', 'nguyen', 'trần', 'tran', 'lê', 'le', 'phạm', 'pham', 'hoàng', 'hoang',
  'huỳnh', 'huynh', 'phan', 'vũ', 'vu', 'võ', 'vo', 'đặng', 'dang', 'bùi', 'bui',
  'đỗ', 'do', 'hồ', 'ho', 'ngô', 'ngo', 'dương', 'duong', 'lý', 'ly', 'đinh', 'dinh',
  'đoàn', 'doan', 'lâm', 'lam', 'trịnh', 'trinh', 'mai', 'đào', 'dao', 'cao', 'hà', 'ha',
  'tạ', 'ta', 'lương', 'luong', 'vương', 'vuong', 'trương', 'truong', 'châu', 'chau',
];

const BLACKLIST_WORDS = [
  'tổng cộng', 'tổng số', 'trường thcs', 'trường thpt', 'phòng gd', 'sở gd', 'cộng hòa',
  'độc lập', 'danh sách', 'stt', 'họ và tên', 'họ tên', 'họ và đệm', 'bộ môn', 'chuyên môn',
  'thời khóa biểu', 'ghi chú', 'ban giám hiệu', 'hiệu trưởng', 'người lập', 'ngày tháng',
  'học kỳ', 'năm học', 'chức vụ', 'chức danh', 'ký tên', 'nhiệm vụ', 'ủy ban nhân dân',
  'bảng phân công', 'phân công giảng dạy', 'nam', 'nữ', 'giới tính', 'ngày sinh',
];

// Helper to check if a string is a valid person name
export function isValidPersonName(rawName: string): boolean {
  if (!rawName) return false;
  const name = rawName.trim();
  if (name.length < 2 || name.length > 50) return false;

  // Reject if purely numeric or special chars
  if (/^\d+$/.test(name) || /^[\d\.\-\/\s]+$/.test(name)) return false;

  const lower = name.toLowerCase();

  // Check blacklist words
  for (const b of BLACKLIST_WORDS) {
    if (lower === b || lower.startsWith(b + ' ') || lower.endsWith(' ' + b)) return false;
  }

  // Must contain letters
  if (!/[a-zA-Zà-ỹÀ-Ỹ]/.test(name)) return false;

  // Single word like "Toán", "Tin", "Lý", "Hóa", "Sử", "Địa", "Anh", "Văn", "GDCD", "HĐTN" are subjects, not person names
  const commonSubjects = ['toán', 'tin', 'lý', 'hóa', 'sinh', 'sử', 'địa', 'anh', 'văn', 'gdcd', 'gdtc', 'hđtn', 'khtn', 'âm nhạc', 'mĩ thuật', 'công nghệ'];
  if (commonSubjects.includes(lower)) return false;

  return true;
}

// Clean and format a person name
export function formatPersonName(raw: string): string {
  return raw
    .trim()
    .replace(/^[\d\.\-\/\)\(\s]+/, '') // remove leading numbering like "1. ", "02/ "
    .replace(/\s+/g, ' ');
}

// Extract shortName from fullName
export function extractShortName(fullName: string, explicitShortName?: string): string {
  if (explicitShortName && explicitShortName.trim().length > 0 && explicitShortName.trim() !== fullName.trim()) {
    const clean = explicitShortName.trim().replace(/^[\d\.\s]+/, '');
    if (clean.length > 0 && clean.length <= 15) return clean;
  }
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || 'GV';
}

export function exportLessonReportToExcel(rows: LessonReportRow[], config: WeeklyReportConfig) {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Header data
  const headerData = [
    ['UBND PHƯỜNG ĐỒNG HỚI', '', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
    ['TRƯỜNG THCS ĐỒNG PHÚ', '', '', '', '', 'Độc lập - Tự do - Hạnh phúc'],
    [''],
    [`LỊCH BÁO GIẢNG - TUẦN ${config.weekNumber}`],
    [`(Từ ngày: ${config.startDate} đến ngày: ${config.endDate})`],
    [`Giáo viên: ${config.teacherName} | Tổ bộ môn: ${config.department} | Năm học: ${config.schoolYear}`],
    [''],
    ['Thứ', 'Ngày', 'Buổi', 'Tiết TKB', 'Môn', 'Lớp', 'Tiết PPCT', 'Tên bài dạy', 'Thiết bị dạy học', 'Ghi chú'],
  ];

  const bodyData = rows.map((r) => [
    r.dayName,
    r.dateString,
    r.session === 'morning' ? 'Sáng' : 'Chiều',
    r.periodTKB,
    r.subject,
    r.className,
    r.ppctPeriodNumber,
    r.lessonName,
    r.equipment,
    r.notes,
  ]);

  const footerData = [
    [''],
    ['', '', '', '', '', '', '', `Đồng Hới, ngày ${config.startDate.split('/')[0] || '...'} tháng ... năm 202...`],
    ['DUYỆT CỦA BGH', '', '', 'TỔ TRƯỞNG CHUYÊN MÔN', '', '', '', 'GIÁO VIÊN GIẢNG DẠY'],
    ['', '', '', '', '', '', '', `(Ký và ghi rõ họ tên)`],
    [''],
    [''],
    ['', '', '', '', '', '', '', config.teacherName],
  ];

  const fullData = [...headerData, ...bodyData, ...footerData];

  const ws = XLSX.utils.aoa_to_sheet(fullData);

  // Calculate cell merges for Title and merged rows (Thứ, Ngày, Buổi)
  const rowSpans = computeReportRowSpans(rows);
  const bodyStartRow = headerData.length;
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // UBND
    { s: { r: 0, c: 5 }, e: { r: 0, c: 9 } }, // CỘNG HÒA...
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // TRƯỜNG THCS...
    { s: { r: 1, c: 5 }, e: { r: 1, c: 9 } }, // Độc lập...
    { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } }, // LỊCH BÁO GIẢNG - TUẦN
    { s: { r: 4, c: 0 }, e: { r: 4, c: 9 } }, // Từ ngày
    { s: { r: 5, c: 0 }, e: { r: 5, c: 9 } }, // Thông tin giáo viên
  ];

  rowSpans.forEach((span, idx) => {
    const currentRow = bodyStartRow + idx;
    if (span.dayRowSpan > 1) {
      // Merge 'Thứ' (column 0)
      merges.push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow + span.dayRowSpan - 1, c: 0 },
      });
      // Merge 'Ngày' (column 1)
      merges.push({
        s: { r: currentRow, c: 1 },
        e: { r: currentRow + span.dayRowSpan - 1, c: 1 },
      });
    }
    if (span.sessionRowSpan > 1) {
      // Merge 'Buổi' (column 2)
      merges.push({
        s: { r: currentRow, c: 2 },
        e: { r: currentRow + span.sessionRowSpan - 1, c: 2 },
      });
    }
  });

  ws['!merges'] = merges;

  // Set column widths
  ws['!cols'] = [
    { wch: 10 }, // Thứ
    { wch: 12 }, // Ngày
    { wch: 8 },  // Buổi
    { wch: 10 }, // Tiết TKB
    { wch: 12 }, // Môn
    { wch: 8 },  // Lớp
    { wch: 10 }, // Tiết PPCT
    { wch: 45 }, // Tên bài dạy
    { wch: 30 }, // Thiết bị
    { wch: 20 }, // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Tuan_${config.weekNumber}`);

  // Download
  const fileName = `Phieu_Bao_Giang_Tuan_${config.weekNumber}_${config.teacherShortName}_THCS_Dong_Phu.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export interface TimetableParseReport {
  success: boolean;
  slots: TimetableSlot[];
  classes: string[];
  teachers: string[];
  totalSlots: number;
  sheetName: string;
  layoutType: 'class_matrix' | 'flat_list' | 'teacher_matrix' | 'unknown';
  errorMessage?: string;
  warnings: string[];
}

export const KNOWN_SUBJECTS_LIST = [
  'Khoa học tự nhiên', 'Lịch sử và Địa lí', 'Lịch sử & Địa lí', 'Hoạt động trải nghiệm',
  'Sinh hoạt dưới cờ', 'Sinh hoạt lớp', 'HĐTN - HN', 'HĐTN-HN', 'HĐTN, HN', 'HĐTN,HN', 'HĐTN_HN',
  'Tiếng Anh (NN1)', 'Tiếng Anh', 'Ngoại ngữ', 'Kinh tế & Pháp luật', 'Giáo dục công dân',
  'Giáo dục thể chất', 'Giáo dục địa phương', 'Giáo dục QP-AN', 'KHTN (Sinh)', 'KHTN (Hóa)',
  'KHTN (Lý)', 'KHTN (L)', 'KHTN (H)', 'KHTN (S)', 'KHTN1', 'KHTN2', 'KHTN3', 'KHTN',
  'C.Nghệ', 'Công nghệ', 'CN', 'GDTC', 'Thể dục', 'TD', 'Nghệ thuật', 'Âm nhạc', 'Nhạc', 'AN',
  'Mĩ thuật', 'Mỹ thuật', 'MT', 'HĐTN', 'GDĐP', 'GDCD', 'KTPL', 'Chào cờ', 'SHDC', 'SHL', 'Sinh hoạt',
  'Tự chọn', 'TC', 'GDQP', 'Vật lí', 'Vật lý', 'Lý', 'Hóa học', 'Hóa', 'Sinh học', 'Sinh',
  'LS&ĐL', 'LS - ĐL', 'Sử - Địa', 'Đ.Lí', 'Địa lí', 'Địa lý', 'Địa', 'Lịch sử', 'Sử',
  'Toán', 'Ngữ văn', 'Văn', 'Anh', 'Tin học', 'Tin', 'BDHSG', 'Bồi dưỡng'
];

export function normalizeClassName(raw: any): string | null {
  if (raw === undefined || raw === null) return null;
  let clean = String(raw).trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > 35) return null;

  // 0. Remove common non-class noise prefixes/suffixes and brackets
  clean = clean.replace(/^(?:lớp|lop|l\.|khối|khoi|k\.|phòng|p\.|group)\s*[:.\-_]?\s*/i, '').trim();

  // If there are parentheses or brackets or newlines (e.g. "6A1 (Phòng 10)" or "6A1\nSĩ số 35")
  const primaryToken = clean.split(/[\(\[\{\r\n;]/)[0].trim();
  if (primaryToken && primaryToken !== clean) {
    const candidate = normalizeClassName(primaryToken);
    if (candidate) return candidate;
  }

  const lower = clean.toLowerCase();
  const blacklist = [
    'stt', 'thứ', 'tiết', 'buổi', 'môn', 'giáo viên', 'phòng', 'ghi chú',
    'ngày', 'tuần', 'họ tên', 'bộ môn', 'tên gv', 'kí hiệu', 'ký hiệu',
    'sáng', 'chiều', 'lớp học', 'tổng số', 'chức vụ', 'sĩ số', 'gvcn', 'chủ nhiệm',
    'chào cờ', 'sinh hoạt', 'tổng cộng', 'tổng', 'cả tuần', 'thời gian'
  ];
  if (blacklist.includes(lower)) return null;

  // 1. Direct match with standard school classes (e.g. THCS Đồng Phú)
  const KNOWN_CLASSES = ['6⁷-A3', '6⁸-A4', '7⁷-A6', '7⁸-A5', '8⁶-A8', '8⁷-A7', '9⁸-A1', '9⁹-A2'];
  for (const kc of KNOWN_CLASSES) {
    if (clean.toLowerCase() === kc.toLowerCase()) return kc;
  }

  // 2. Normalize superscript digits to normal digits for matching
  const superscriptMap: { [key: string]: string } = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
  };
  let deSuper = clean;
  for (const [sup, norm] of Object.entries(superscriptMap)) {
    deSuper = deSuper.split(sup).join(norm);
  }

  // Check matching deSuper with known classes
  const deSuperMap: { [key: string]: string } = {
    '67-a3': '6⁷-A3', '6-a3': '6⁷-A3', '6a3': '6⁷-A3', '67a3': '6⁷-A3',
    '68-a4': '6⁸-A4', '6-a4': '6⁸-A4', '6a4': '6⁸-A4', '68a4': '6⁸-A4',
    '77-a6': '7⁷-A6', '7-a6': '7⁷-A6', '7a6': '7⁷-A6', '77a6': '7⁷-A6',
    '78-a5': '7⁸-A5', '7-a5': '7⁸-A5', '7a5': '7⁸-A5', '78a5': '7⁸-A5',
    '86-a8': '8⁶-A8', '8-a8': '8⁶-A8', '8a8': '8⁶-A8', '86a8': '8⁶-A8',
    '87-a7': '8⁷-A7', '8-a7': '8⁷-A7', '8a7': '8⁷-A7', '87a7': '8⁷-A7',
    '98-a1': '9⁸-A1', '9-a1': '9⁸-A1', '9a1': '9⁸-A1', '98a1': '9⁸-A1',
    '99-a2': '9⁹-A2', '9-a2': '9⁹-A2', '9a2': '9⁹-A2', '99a2': '9⁹-A2',
  };
  const lowDe = deSuper.toLowerCase().replace(/\s+/g, '');
  if (deSuperMap[lowDe]) {
    return deSuperMap[lowDe];
  }

  // 3. Pattern: Grade (1-12) + optional superscript + separator + section (e.g. 6⁷-A3, 6-A3, 8-B1, 9-A2)
  const superMatch = clean.match(/^([1-9]|1[0-2])([⁰¹²³⁴⁵⁶⁷⁸⁹0-9]*)\s*[\.\/\-_]?\s*([a-zA-Z]+[0-9]*)$/i);
  if (superMatch) {
    const grade = superMatch[1];
    const sup = superMatch[2];
    const sec = superMatch[3].toUpperCase();
    if (sup) {
      return `${grade}${sup}-${sec}`;
    }
    return `${grade}-${sec}`;
  }

  // 4. Pattern: "6A1", "6A2", "6A", "7B", "8C1", "9A", "10A1", "11B2", "12A3", "1A", "2B"
  const letterMatch = clean.match(/^([1-9]|1[0-2])\s*([a-zA-Z]+[0-9]*)$/i);
  if (letterMatch) {
    return `${letterMatch[1]}${letterMatch[2].toUpperCase()}`;
  }

  // 5. Pattern: "6/1", "6/2", "6-1", "6_1", "6.1", "9.2"
  const slashMatch = clean.match(/^([1-9]|1[0-2])\s*[\.\/\-_]\s*([0-9]+)$/i);
  if (slashMatch) {
    return `${slashMatch[1]}/${slashMatch[2]}`;
  }

  // 6. Pattern: Special classes (HSG-A1, BD-9, etc.)
  const hsgMatch = clean.match(/^(?:HSG|BDHSG|BD)[\-_ ]?([a-zA-Z0-9]+)$/i);
  if (hsgMatch) {
    return `HSG-${hsgMatch[1].toUpperCase()}`;
  }

  return null;
}

export function parseDayOfWeek(raw: any, allowNumericOnly = false): number | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!str) return null;

  // Strict check for day prefixes
  if (str.includes('hai') || str === 't2' || str === 't.2' || str.startsWith('thứ 2') || str.startsWith('thứ hai') || str === 'thứ 2' || str === 'thứ hai' || str.startsWith('t2 ')) return 2;
  if (str.includes('ba') || str === 't3' || str === 't.3' || str.startsWith('thứ 3') || str.startsWith('thứ ba') || str === 'thứ ba' || str === 'thứ 3' || str.startsWith('t3 ')) return 3;
  if (str.includes('tư') || str.includes('tu') || str === 't4' || str === 't.4' || str.startsWith('thứ 4') || str.startsWith('thứ tư') || str === 'thứ tư' || str === 'thứ 4' || str.startsWith('t4 ')) return 4;
  if (str.includes('năm') || str.includes('nam') || str === 't5' || str === 't.5' || str.startsWith('thứ 5') || str.startsWith('thứ năm') || str === 'thứ năm' || str === 'thứ 5' || str.startsWith('t5 ')) return 5;
  if (str.includes('sáu') || str.includes('sau') || str === 't6' || str === 't.6' || str.startsWith('thứ 6') || str.startsWith('thứ sáu') || str === 'thứ sáu' || str === 'thứ 6' || str.startsWith('t6 ')) return 6;
  if (str.includes('bảy') || str.includes('bay') || str === 't7' || str === 't.7' || str.startsWith('thứ 7') || str.startsWith('thứ bảy') || str === 'thứ bảy' || str === 'thứ 7' || str.startsWith('t7 ')) return 7;
  if (str.includes('chủ nhật') || str === 'cn' || str.includes('cn')) return 8;

  // Only allow bare single digits if explicitly in a Day column
  if (allowNumericOnly) {
    if (str === '2') return 2;
    if (str === '3') return 3;
    if (str === '4') return 4;
    if (str === '5') return 5;
    if (str === '6') return 6;
    if (str === '7') return 7;
    if (str === '8') return 8;
  }

  return null;
}

export function parsePeriodNumber(raw: any): number | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  // Don't match if it's "Thứ 2" or "Thứ 3"
  if (str.toLowerCase().includes('thứ') || str.toLowerCase().includes('thu') || str.toLowerCase().startsWith('t2') || str.toLowerCase().startsWith('t3')) {
    return null;
  }

  // Check Roman Numerals: I, II, III, IV, V, VI, VII, VIII, IX, X
  const romanMap: { [key: string]: number } = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10
  };
  const romanMatch = str.match(/^(?:tiết|tiet|t\.?)?\s*([ivx]+)$/i);
  if (romanMatch && romanMap[romanMatch[1].toLowerCase()]) {
    return romanMap[romanMatch[1].toLowerCase()];
  }

  // Check Arabic Numerals: 1..10
  const match = str.match(/^(?:tiết|tiet|t\.?|tiết\s*tkb)?\s*[:.\-_]?\s*(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 10) return num;
  }
  return null;
}

function cleanTeacherName(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim().replace(/^[\d\.\-\/\(\)\s]+/, '').replace(/[\(\)]/g, '').trim();
  clean = clean.replace(/^(?:gv|thầy|cô)\s*[:.]?\s*/i, '');
  const lower = clean.toLowerCase();
  for (const s of KNOWN_SUBJECTS_LIST) {
    if (lower === s.toLowerCase()) return '';
  }
  return clean;
}

export function parseTimetableCell(rawVal: any): { subject: string; teacher: string } | null {
  if (rawVal === undefined || rawVal === null) return null;
  const str = String(rawVal).trim();
  if (!str || str === '-' || str === 'x' || str === 'X' || str === '/' || str === '.' || str === '---' || str === ' nghỉ') return null;

  // Check if multiline
  if (str.includes('\n')) {
    const lines = str.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length >= 2) {
      const line0 = lines[0];
      const line1 = lines[1];
      const isSub0 = KNOWN_SUBJECTS_LIST.some((s) => s.toLowerCase() === line0.toLowerCase());
      const isSub1 = KNOWN_SUBJECTS_LIST.some((s) => s.toLowerCase() === line1.toLowerCase());

      if (isSub0 && !isSub1) {
        return { subject: line0, teacher: cleanTeacherName(line1) };
      } else if (!isSub0 && isSub1) {
        return { subject: line1, teacher: cleanTeacherName(line0) };
      } else {
        return { subject: line0, teacher: cleanTeacherName(line1) };
      }
    } else if (lines.length === 1) {
      return parseSingleLineCell(lines[0]);
    }
  }

  return parseSingleLineCell(str);
}

function parseSingleLineCell(str: string): { subject: string; teacher: string } | null {
  // Check " - " or " – "
  if (str.includes(' - ') || str.includes(' – ')) {
    const parts = str.split(/\s*[-–]\s*/);
    if (parts.length >= 2) {
      return { subject: parts[0].trim(), teacher: cleanTeacherName(parts.slice(1).join(' ')) };
    }
  }

  // Check parens like "Toán (Thắng)"
  const parenMatch = str.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    return { subject: parenMatch[1].trim(), teacher: cleanTeacherName(parenMatch[2]) };
  }

  // Check slash "Toán/Thắng"
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 2 && !/^\d+$/.test(parts[0]) && !/^\d+$/.test(parts[1])) {
      return { subject: parts[0].trim(), teacher: cleanTeacherName(parts[1]) };
    }
  }

  // Check known subject prefixes
  for (const s of KNOWN_SUBJECTS_LIST) {
    if (str.toLowerCase().startsWith(s.toLowerCase())) {
      const remainder = str.slice(s.length).trim();
      const cleanSub = s;
      if (!remainder) {
        // Just the subject alone (e.g. "Chào cờ", "SHL", "Toán")
        return { subject: cleanSub, teacher: '' };
      }
      return { subject: cleanSub, teacher: cleanTeacherName(remainder) };
    }
  }

  // Fallback: split by space, last word could be teacher
  const parts = str.split(/\s+/);
  if (parts.length > 1) {
    const sub = parts.slice(0, -1).join(' ');
    const teacher = cleanTeacherName(parts[parts.length - 1]);
    return { subject: sub, teacher: teacher };
  }

  return { subject: str, teacher: '' };
}

// Extract timetable slots from any 2D grid
export function parseTimetableGrid(jsonData: any[][], sheetName = ''): TimetableParseReport {
  if (!jsonData || jsonData.length === 0) {
    return {
      success: false,
      slots: [],
      classes: [],
      teachers: [],
      totalSlots: 0,
      sheetName,
      layoutType: 'unknown',
      errorMessage: 'Tệp không có dữ liệu bảng.',
      warnings: [],
    };
  }

  // 1. CHECK IF FLAT LIST FORMAT (VnEdu / SMAS / CSDL Export)
  // Columns: Thứ, Tiết, Lớp, Môn, Giáo viên
  let flatHeaderIdx = -1;
  let flatColDay = -1;
  let flatColPeriod = -1;
  let flatColClass = -1;
  let flatColSub = -1;
  let flatColTeacher = -1;
  let flatColSession = -1;

  for (let r = 0; r < Math.min(jsonData.length, 25); r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;

    let cDay = -1;
    let cPeriod = -1;
    let cClass = -1;
    let cSub = -1;
    let cTeacher = -1;
    let cSession = -1;

    row.forEach((cell, idx) => {
      const val = String(cell || '').toLowerCase().trim().replace(/\s+/g, ' ');
      if (val === 'thứ' || val === 'ngày' || val === 'thu' || val.includes('thứ/ngày')) cDay = idx;
      else if (val === 'tiết' || val === 'tiet' || val === 'tiết tkb' || val === 'tiết dạy') cPeriod = idx;
      else if (val === 'lớp' || val === 'lop' || val === 'lớp học') cClass = idx;
      else if (val === 'môn' || val === 'môn học' || val === 'bộ môn' || val === 'phân môn') cSub = idx;
      else if (val.includes('giáo viên') || val === 'gv' || val.includes('tên gv') || val.includes('người dạy') || val === 'ký hiệu gv') cTeacher = idx;
      else if (val === 'buổi' || val === 'buoi' || val === 'ca') cSession = idx;
    });

    if (cDay !== -1 && cPeriod !== -1 && cClass !== -1 && cSub !== -1) {
      flatHeaderIdx = r;
      flatColDay = cDay;
      flatColPeriod = cPeriod;
      flatColClass = cClass;
      flatColSub = cSub;
      flatColTeacher = cTeacher;
      flatColSession = cSession;
      break;
    }
  }

  if (flatHeaderIdx !== -1) {
    const flatSlots: TimetableSlot[] = [];
    let currentDay = 2;

    for (let r = flatHeaderIdx + 1; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;

      const rawDay = row[flatColDay];
      const parsedDay = parseDayOfWeek(rawDay, true);
      if (parsedDay) currentDay = parsedDay;

      const rawPeriod = row[flatColPeriod];
      const parsedPeriod = parsePeriodNumber(rawPeriod);
      if (!parsedPeriod) continue;

      const rawClass = row[flatColClass];
      const normClass = normalizeClassName(rawClass);
      if (!normClass) continue;

      const rawSub = String(row[flatColSub] || '').trim();
      if (!rawSub) continue;

      let teacher = '';
      if (flatColTeacher !== -1 && row[flatColTeacher]) {
        teacher = cleanTeacherName(String(row[flatColTeacher]));
      }

      let session: 'morning' | 'afternoon' = parsedPeriod <= 5 ? 'morning' : 'afternoon';
      if (flatColSession !== -1 && row[flatColSession]) {
        const sStr = String(row[flatColSession]).toLowerCase();
        if (sStr.includes('chiều')) session = 'afternoon';
        else if (sStr.includes('sáng')) session = 'morning';
      }

      flatSlots.push({
        dayOfWeek: currentDay,
        session,
        period: parsedPeriod,
        className: normClass,
        subject: rawSub,
        teacherShortName: teacher,
      });
    }

    if (flatSlots.length >= 3) {
      const classes = Array.from(new Set(flatSlots.map((s) => s.className))).sort();
      const teachers = Array.from(new Set(flatSlots.map((s) => s.teacherShortName).filter((t) => Boolean(t))));
      return {
        success: true,
        slots: flatSlots,
        classes,
        teachers,
        totalSlots: flatSlots.length,
        sheetName,
        layoutType: 'flat_list',
        warnings: [],
      };
    }
  }

  // 2. CHECK CLASS MATRIX FORMAT (Cột là Lớp, Hàng là Thứ / Tiết)
  let classHeaderRowIndex = -1;
  let classColumns: { [colIndex: number]: string } = {};

  for (let r = 0; r < Math.min(jsonData.length, 30); r++) {
    const row = jsonData[r];
    if (!row || row.length < 2) continue;

    const detectedCols: { [colIndex: number]: string } = {};
    let classCount = 0;

    row.forEach((cell, idx) => {
      const norm = normalizeClassName(cell);
      if (norm) {
        detectedCols[idx] = norm;
        classCount++;
      }
    });

    // Found header if at least 2 class columns
    if (classCount >= 2) {
      classHeaderRowIndex = r;
      classColumns = detectedCols;
      break;
    }
  }

  if (classHeaderRowIndex !== -1 && Object.keys(classColumns).length >= 2) {
    const matrixSlots: TimetableSlot[] = [];
    const classColIndices = Object.keys(classColumns).map((c) => parseInt(c, 10));
    const minClassCol = Math.min(...classColIndices);

    // Identify which column holds Day, Period, and Session (columns before classes)
    let dayCol = -1;
    let periodCol = -1;
    let sessionCol = -1;

    // Scan header row and previous rows for column indicators
    for (let r = Math.max(0, classHeaderRowIndex - 2); r <= classHeaderRowIndex; r++) {
      const headerRow = jsonData[r];
      if (!headerRow) continue;
      for (let c = 0; c < minClassCol; c++) {
        const hVal = String(headerRow[c] || '').toLowerCase().trim();
        if (hVal === 'thứ' || hVal === 'ngày' || hVal.includes('thứ/ngày')) dayCol = c;
        else if (hVal === 'tiết' || hVal === 'tiet' || hVal === 't' || hVal === 'tiết dạy' || hVal === 'tiết tkb') periodCol = c;
        else if (hVal === 'buổi' || hVal === 'buoi' || hVal === 'ca') sessionCol = c;
      }
    }

    // If dayCol or periodCol not detected by label, guess by position or cell contents
    if (dayCol === -1 && minClassCol >= 2) dayCol = 0;
    if (periodCol === -1 && minClassCol >= 2) periodCol = dayCol === 0 ? 1 : 0;
    if (minClassCol === 1) {
      periodCol = 0; // Only 1 column on left: likely Period (or Day)
    }

    let currentDay = 2;
    let currentPeriod = 1;
    let currentSession: 'morning' | 'afternoon' = 'morning';
    let consecutiveDataRowsWithoutPeriod = 0;

    for (let r = classHeaderRowIndex + 1; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;

      // Check if row has any content in class columns
      const hasClassContent = classColIndices.some((colIdx) => {
        const v = row[colIdx];
        return v !== undefined && v !== null && String(v).trim().length > 0;
      });

      // 1. Detect Day of week
      let rowDay: number | null = null;
      if (dayCol !== -1 && row[dayCol] !== undefined) {
        rowDay = parseDayOfWeek(row[dayCol], true);
      }
      if (!rowDay) {
        // Fallback scan columns 0..3 for day name
        for (let c = 0; c < Math.min(row.length, Math.max(minClassCol, 3)); c++) {
          if (c === periodCol) continue;
          const d = parseDayOfWeek(row[c], false);
          if (d && d >= 2 && d <= 8) {
            rowDay = d;
            break;
          }
        }
      }

      if (rowDay && rowDay >= 2 && rowDay <= 8) {
        if (rowDay !== currentDay) {
          currentDay = rowDay;
          currentPeriod = 1;
          consecutiveDataRowsWithoutPeriod = 0;
        }
      }

      // 2. Detect Period
      let rowPeriod: number | null = null;
      if (periodCol !== -1 && row[periodCol] !== undefined) {
        rowPeriod = parsePeriodNumber(row[periodCol]);
      }
      if (!rowPeriod) {
        // Scan other left columns for period
        for (let c = 0; c < Math.min(row.length, Math.max(minClassCol, 3)); c++) {
          if (c === dayCol) continue;
          const p = parsePeriodNumber(row[c]);
          if (p && p >= 1 && p <= 10) {
            rowPeriod = p;
            break;
          }
        }
      }

      if (rowPeriod) {
        currentPeriod = rowPeriod;
        consecutiveDataRowsWithoutPeriod = 0;
      } else if (hasClassContent) {
        // If row has timetable cells but no period column specified, advance period
        consecutiveDataRowsWithoutPeriod++;
        if (consecutiveDataRowsWithoutPeriod > 1) {
          currentPeriod++;
        }
      }

      // 3. Detect Session
      if (sessionCol !== -1 && row[sessionCol]) {
        const sStr = String(row[sessionCol]).toLowerCase();
        if (sStr.includes('chiều')) currentSession = 'afternoon';
        else if (sStr.includes('sáng')) currentSession = 'morning';
      } else {
        const rowStartStr = row.slice(0, Math.max(minClassCol, 4)).map((c) => String(c || '').toLowerCase()).join(' ');
        if (rowStartStr.includes('chiều')) {
          currentSession = 'afternoon';
        } else if (rowStartStr.includes('sáng')) {
          currentSession = 'morning';
        } else {
          currentSession = currentPeriod <= 5 ? 'morning' : 'afternoon';
        }
      }

      // 4. Read slots for each class column
      classColIndices.forEach((colIdx) => {
        const cellVal = row[colIdx];
        const parsed = parseTimetableCell(cellVal);

        if (parsed && parsed.subject) {
          matrixSlots.push({
            dayOfWeek: currentDay,
            session: currentSession,
            period: currentPeriod,
            className: classColumns[colIdx],
            subject: parsed.subject,
            teacherShortName: parsed.teacher,
          });
        }
      });
    }

    const validSlots = matrixSlots.filter(
      (s) => s.dayOfWeek >= 2 && s.dayOfWeek <= 8 && s.period >= 1 && s.period <= 10 && Boolean(s.className) && Boolean(s.subject)
    );

    if (validSlots.length >= 3) {
      const classes = Array.from(new Set(validSlots.map((s) => s.className))).sort();
      const teachers = Array.from(new Set(validSlots.map((s) => s.teacherShortName).filter((t) => Boolean(t))));
      return {
        success: true,
        slots: validSlots,
        classes,
        teachers,
        totalSlots: validSlots.length,
        sheetName,
        layoutType: 'class_matrix',
        warnings: [],
      };
    }
  }

  // 3. CHECK TRANSPOSED MATRIX FORMAT (Hàng là Lớp, Cột là Thứ & Tiết)
  // Very common in Vietnamese master timetables
  let classColIndex = -1;
  const classRowIndices: { [rowIndex: number]: string } = {};

  for (let c = 0; c <= Math.min(3, (jsonData[0] || []).length - 1); c++) {
    let matches = 0;
    const detectedRows: { [r: number]: string } = {};

    for (let r = 1; r < jsonData.length; r++) {
      const cell = jsonData[r]?.[c];
      const norm = normalizeClassName(cell);
      if (norm) {
        detectedRows[r] = norm;
        matches++;
      }
    }

    if (matches >= 2) {
      classColIndex = c;
      Object.assign(classRowIndices, detectedRows);
      break;
    }
  }

  if (classColIndex !== -1 && Object.keys(classRowIndices).length >= 2) {
    // We found classes down column classColIndex!
    // Now determine Day and Period for each column (c > classColIndex)
    interface TransposedColDef {
      colIdx: number;
      dayOfWeek: number;
      period: number;
      session: 'morning' | 'afternoon';
    }
    const columnDefs: TransposedColDef[] = [];
    let currentDay = 2;
    let currentPeriod = 1;

    // Scan top 5 header rows for day & period indicators
    const maxCols = Math.max(...jsonData.map((r) => r.length));
    for (let c = classColIndex + 1; c < maxCols; c++) {
      let colDay: number | null = null;
      let colPeriod: number | null = null;

      for (let r = 0; r < Math.min(jsonData.length, 5); r++) {
        const val = jsonData[r]?.[c];
        if (!colDay) {
          const d = parseDayOfWeek(val, false);
          if (d) colDay = d;
        }
        if (!colPeriod) {
          const p = parsePeriodNumber(val);
          if (p) colPeriod = p;
        }
      }

      if (colDay) currentDay = colDay;
      if (colPeriod) {
        currentPeriod = colPeriod;
      } else {
        currentPeriod = (currentPeriod % 5) + 1;
      }

      columnDefs.push({
        colIdx: c,
        dayOfWeek: currentDay,
        period: currentPeriod,
        session: currentPeriod <= 5 ? 'morning' : 'afternoon',
      });
    }

    if (columnDefs.length >= 3) {
      const transposedSlots: TimetableSlot[] = [];

      Object.entries(classRowIndices).forEach(([rStr, className]) => {
        const r = parseInt(rStr, 10);
        const row = jsonData[r];
        if (!row) return;

        columnDefs.forEach((colDef) => {
          const cellVal = row[colDef.colIdx];
          const parsed = parseTimetableCell(cellVal);
          if (parsed && parsed.subject) {
            transposedSlots.push({
              dayOfWeek: colDef.dayOfWeek,
              session: colDef.session,
              period: colDef.period,
              className,
              subject: parsed.subject,
              teacherShortName: parsed.teacher,
            });
          }
        });
      });

      const validSlots = transposedSlots.filter(
        (s) => s.dayOfWeek >= 2 && s.dayOfWeek <= 8 && s.period >= 1 && s.period <= 10 && Boolean(s.className) && Boolean(s.subject)
      );

      if (validSlots.length >= 3) {
        const classes = Array.from(new Set(validSlots.map((s) => s.className))).sort();
        const teachers = Array.from(new Set(validSlots.map((s) => s.teacherShortName).filter((t) => Boolean(t))));
        return {
          success: true,
          slots: validSlots,
          classes,
          teachers,
          totalSlots: validSlots.length,
          sheetName,
          layoutType: 'class_matrix',
          warnings: [],
        };
      }
    }
  }

  // 4. CHECK TEACHER MATRIX FORMAT (Cột là Giáo viên, Hàng là Thứ / Tiết)
  let teacherHeaderRow = -1;
  const teacherCols: { [col: number]: string } = {};

  for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;

    const detected: { [col: number]: string } = {};
    let count = 0;

    row.forEach((cell, idx) => {
      const str = String(cell || '').trim();
      const clean = cleanTeacherName(str);
      if (clean && clean.length >= 2 && !normalizeClassName(str)) {
        detected[idx] = clean;
        count++;
      }
    });

    if (count >= 3) {
      teacherHeaderRow = r;
      Object.assign(teacherCols, detected);
      break;
    }
  }

  if (teacherHeaderRow !== -1 && Object.keys(teacherCols).length >= 3) {
    const teacherSlots: TimetableSlot[] = [];
    let currentDay = 2;
    let currentPeriod = 1;

    for (let r = teacherHeaderRow + 1; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;

      for (let c = 0; c <= 3; c++) {
        const d = parseDayOfWeek(row[c], true);
        if (d && d >= 2 && d <= 8) {
          currentDay = d;
          break;
        }
      }

      for (let c = 0; c <= 3; c++) {
        const p = parsePeriodNumber(row[c]);
        if (p && p >= 1 && p <= 10) {
          currentPeriod = p;
          break;
        }
      }

      Object.entries(teacherCols).forEach(([cStr, teacherName]) => {
        const c = parseInt(cStr, 10);
        const cell = row[c];
        if (!cell) return;
        const cellStr = String(cell).trim();
        // In teacher timetable, cell usually has Class and Subject (e.g. "6A1 - Toán" or "9A(Văn)")
        const normClass = normalizeClassName(cellStr);
        const parsed = parseTimetableCell(cellStr);

        let targetClass = normClass || '';
        let targetSubject = parsed?.subject || 'Toán';

        // Try extracting class name from cell
        const classMatch = cellStr.match(/([1-9]|1[0-2])[⁰¹²³⁴⁵⁶⁷⁸⁹]*[\-_./]?[a-zA-Z0-9]+/);
        if (classMatch) {
          const norm = normalizeClassName(classMatch[0]);
          if (norm) targetClass = norm;
        }

        if (targetClass && targetSubject) {
          teacherSlots.push({
            dayOfWeek: currentDay,
            session: currentPeriod <= 5 ? 'morning' : 'afternoon',
            period: currentPeriod,
            className: targetClass,
            subject: targetSubject,
            teacherShortName: teacherName,
          });
        }
      });
    }

    if (teacherSlots.length >= 3) {
      const classes = Array.from(new Set(teacherSlots.map((s) => s.className))).sort();
      const teachers = Array.from(new Set(teacherSlots.map((s) => s.teacherShortName).filter((t) => Boolean(t))));
      return {
        success: true,
        slots: teacherSlots,
        classes,
        teachers,
        totalSlots: teacherSlots.length,
        sheetName,
        layoutType: 'teacher_matrix',
        warnings: [],
      };
    }
  }

  return {
    success: false,
    slots: [],
    classes: [],
    teachers: [],
    totalSlots: 0,
    sheetName,
    layoutType: 'unknown',
    errorMessage:
      'Không nhận diện được bảng Thời khóa biểu từ tệp. Cần có hàng tiêu đề chứa tên lớp (VD: 6/1, 6/2, 7/1... hoặc 6A1, 7B) và các cột Thứ, Tiết.',
    warnings: [],
  };
}

// Function to read Excel file for Timetable with multi-sheet detection
export async function parseExcelTimetableFile(file: File): Promise<TimetableParseReport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let bestReport: TimetableParseReport = {
          success: false,
          slots: [],
          classes: [],
          teachers: [],
          totalSlots: 0,
          sheetName: '',
          layoutType: 'unknown',
          errorMessage: 'Không tìm thấy sheet nào chứa dữ liệu Thời khóa biểu.',
          warnings: [],
        };

        const sheetNames = workbook.SheetNames;
        // Check priority sheets first
        const sortedSheets = [...sheetNames].sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const aScore = aLower.includes('tkb') || aLower.includes('thời khóa biểu') || aLower.includes('lop') ? 10 : 0;
          const bScore = bLower.includes('tkb') || bLower.includes('thời khóa biểu') || bLower.includes('lop') ? 10 : 0;
          return bScore - aScore;
        });

        for (const sName of sortedSheets) {
          const worksheet = workbook.Sheets[sName];
          const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const report = parseTimetableGrid(jsonData, sName);

          if (report.success && report.slots.length > bestReport.slots.length) {
            bestReport = report;
          }
        }

        if (bestReport.success && bestReport.slots.length >= 5) {
          resolve(bestReport);
        } else {
          resolve({
            success: false,
            slots: [],
            classes: [],
            teachers: [],
            totalSlots: 0,
            sheetName: sortedSheets[0] || '',
            layoutType: 'unknown',
            errorMessage:
              '⚠️ CẢNH BÁO: Không nhận diện được thời khóa biểu hợp lệ từ tệp Excel này! Hệ thống TUYỆT ĐỐI KHÔNG tự ý áp dụng hay thay đổi Thời khóa biểu hiện tại. Vui lòng kiểm tra lại định dạng tệp (Cần có hàng chứa tên lớp: 6/1, 6/2... hoặc 6A1, 7A và cột Thứ, Tiết).',
            warnings: [],
          });
        }
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Function to read Word (.docx) file for Timetable
export async function parseDocxTimetableFile(file: File): Promise<TimetableParseReport> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');

  let bestReport: TimetableParseReport = {
    success: false,
    slots: [],
    classes: [],
    teachers: [],
    totalSlots: 0,
    sheetName: 'Word Document',
    layoutType: 'unknown',
    errorMessage: 'Không tìm thấy bảng thời khóa biểu hợp lệ trong tệp Word.',
    warnings: [],
  };

  if (tables.length > 0) {
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tr');
      const grid: any[][] = [];
      rows.forEach((tr) => {
        const cells = tr.querySelectorAll('td, th');
        const rowData: string[] = [];
        cells.forEach((td) => {
          rowData.push(td.textContent?.trim() || '');
        });
        if (rowData.length > 0) grid.push(rowData);
      });
      const rep = parseTimetableGrid(grid, 'Word Table');
      if (rep.success && rep.slots.length > bestReport.slots.length) {
        bestReport = rep;
      }
    });
  }

  if (bestReport.success && bestReport.slots.length >= 5) {
    return bestReport;
  }

  return {
    success: false,
    slots: [],
    classes: [],
    teachers: [],
    totalSlots: 0,
    sheetName: 'Word Document',
    layoutType: 'unknown',
    errorMessage:
      '⚠️ CẢNH BÁO: Không nhận diện được bảng Thời khóa biểu từ tệp Word (.docx). Vui lòng kiểm tra lại cấu trúc bảng hoặc sao chép bảng sang tab "Dán danh sách văn bản".',
    warnings: [],
  };
}

// Function to parse raw text / pasted content for Timetable
export function parseTextTimetable(rawText: string): TimetableParseReport {
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      slots: [],
      classes: [],
      teachers: [],
      totalSlots: 0,
      sheetName: 'Pasted Text',
      layoutType: 'unknown',
      errorMessage: 'Nội dung dán trống.',
      warnings: [],
    };
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const grid: string[][] = [];

  lines.forEach((line) => {
    if (line.includes('\t')) {
      grid.push(line.split('\t').map((c) => c.trim()));
    } else if (line.includes('|')) {
      grid.push(line.split('|').map((c) => c.trim()));
    } else if (line.includes(',')) {
      grid.push(line.split(',').map((c) => c.trim()));
    } else {
      grid.push([line]);
    }
  });

  return parseTimetableGrid(grid, 'Pasted Text');
}

// Parse PPCT items from any 2D table grid (Excel, Word tables, PDF tables)
export function parsePPCTGrid(jsonData: any[][]): PPCTItem[] {
  if (!jsonData || jsonData.length === 0) return [];

  const items: PPCTItem[] = [];
  let currentChapter = '';
  let orderCounter = 1;

  // Scan first few rows to locate column headers dynamically
  let colTT = 0;
  let colTitle = 1;
  let colPeriods = 2;
  let colWeek = 3;
  let colEquipment = 4;
  let colNotes = 5;
  let headerRowIndex = -1;

  for (let r = 0; r < Math.min(10, jsonData.length); r++) {
    const row = jsonData[r] || [];
    const rowStr = row.map((c) => String(c || '').toUpperCase().trim()).join(' | ');

    if (
      (rowStr.includes('TÊN BÀI') || rowStr.includes('BÀI DẠY') || rowStr.includes('BÀI HỌC') || rowStr.includes('NỘI DUNG')) &&
      (rowStr.includes('TIẾT') || rowStr.includes('TT') || rowStr.includes('STT'))
    ) {
      headerRowIndex = r;
      row.forEach((cell, idx) => {
        const str = String(cell || '').toUpperCase().trim();
        if (str === 'TT' || str === 'STT' || (str.includes('TIẾT') && !str.includes('SỐ TIẾT') && !str.includes('PPCT'))) {
          colTT = idx;
        } else if (str.includes('TÊN BÀI') || str.includes('BÀI DẠY') || str.includes('BÀI HỌC') || str.includes('NỘI DUNG')) {
          colTitle = idx;
        } else if (str.includes('SỐ TIẾT') || (str.includes('TIẾT') && idx !== colTT)) {
          colPeriods = idx;
        } else if (str.includes('TUẦN') || str.includes('THỜI ĐIỂM') || str.includes('THỜI GIAN')) {
          colWeek = idx;
        } else if (str.includes('THIẾT BỊ') || str.includes('ĐDDH') || str.includes('HỌC LIỆU') || str.includes('ĐỒ DÙNG')) {
          colEquipment = idx;
        } else if (str.includes('GHI CHÚ') || str.includes('ĐỊA ĐIỂM') || str.includes('PHÒNG')) {
          colNotes = idx;
        }
      });
      break;
    }
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  for (let r = startRow; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length === 0) continue;

    const rawColTT = String(row[colTT] ?? '').trim();
    const rawColTitle = String(row[colTitle] ?? '').trim();
    const rawColPeriods = row[colPeriods];
    const rawColWeek = String(row[colWeek] ?? '').trim();
    const rawColEquipment = String(row[colEquipment] ?? '').trim();
    const rawColNotes = String(row[colNotes] ?? '').trim();

    // Check if Chapter/Topic header
    const fullRowText = row.map((c) => String(c || '').trim()).join(' ');
    const upperFull = fullRowText.toUpperCase();
    if (
      upperFull.startsWith('CHƯƠNG') ||
      upperFull.startsWith('CHỦ ĐỀ') ||
      upperFull.startsWith('PHẦN') ||
      upperFull.startsWith('HỌC KÌ') ||
      upperFull.startsWith('HỌC KỲ') ||
      (!rawColTT && rawColTitle.toUpperCase().startsWith('CHƯƠNG')) ||
      (!rawColTT && rawColTitle.toUpperCase().startsWith('CHỦ ĐỀ'))
    ) {
      currentChapter = (rawColTitle || fullRowText).trim();
      continue;
    }

    // Check if numeric TT or valid lesson row
    const isNumericTT = /^\d+$/.test(rawColTT) || /^\d+\s*[-–]\s*\d+$/.test(rawColTT);
    const hasLessonTitle = rawColTitle.length > 2 && !rawColTitle.toUpperCase().includes('CỘNG') && !rawColTitle.toUpperCase().includes('TỔNG SỐ TIẾT');

    if ((isNumericTT && hasLessonTitle) || (hasLessonTitle && (rawColTitle.toUpperCase().startsWith('BÀI') || rawColTitle.toUpperCase().startsWith('TIẾT')))) {
      let parsedPeriods = 1;
      if (typeof rawColPeriods === 'number') {
        parsedPeriods = rawColPeriods;
      } else if (typeof rawColPeriods === 'string') {
        const match = rawColPeriods.match(/\d+/);
        if (match) parsedPeriods = parseInt(match[0], 10) || 1;
      }

      items.push({
        id: `ppct-item-${orderCounter}`,
        orderNumber: orderCounter++,
        chapter: currentChapter,
        lessonTitle: rawColTitle,
        periodCount: parsedPeriods,
        timeFrame: rawColWeek || `Tuần ${Math.ceil(orderCounter / 4) || 1}`,
        equipment: rawColEquipment || 'SGK, tranh ảnh, máy chiếu',
        notes: rawColNotes || 'Phòng học bộ môn',
      });
    }
  }

  return items;
}

// Function to read Excel file for PPCT
export async function parseExcelPPCTFile(file: File): Promise<PPCTItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const items = parsePPCTGrid(jsonData);
        resolve(items);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Function to read Word (.docx) file for PPCT using mammoth
export async function parseDocxPPCTFile(file: File): Promise<PPCTItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  // Extract HTML from docx to preserve tables
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');

  if (tables.length > 0) {
    let bestItems: PPCTItem[] = [];
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tr');
      const grid: any[][] = [];
      rows.forEach((tr) => {
        const cells = tr.querySelectorAll('td, th');
        const rowData: string[] = [];
        cells.forEach((td) => {
          rowData.push(td.textContent?.trim() || '');
        });
        if (rowData.length > 0) grid.push(rowData);
      });
      const parsed = parsePPCTGrid(grid);
      if (parsed.length > bestItems.length) {
        bestItems = parsed;
      }
    });

    if (bestItems.length > 0) return bestItems;
  }

  // Fallback: extract raw text and parse lines
  const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
  return parseTextPPCT(rawTextResult.value);
}

// Function to parse raw text / pasted content for PPCT
export function parseTextPPCT(rawText: string): PPCTItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const items: PPCTItem[] = [];
  let currentChapter = '';
  let orderCounter = 1;

  for (const line of lines) {
    const upper = line.toUpperCase();

    // Check if chapter line
    if (upper.startsWith('CHƯƠNG') || upper.startsWith('CHỦ ĐỀ') || upper.startsWith('PHẦN') || upper.startsWith('HỌC KÌ') || upper.startsWith('HỌC KỲ')) {
      currentChapter = line;
      continue;
    }

    // Check if tab-separated line (e.g. copied from Excel or Word table)
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim());
      if (parts.length >= 2) {
        const col0 = parts[0];
        const col1 = parts[1];
        const isNum = /^\d+$/.test(col0);
        const title = isNum ? col1 : (col0 || col1);
        const periodMatch = (parts[2] || '').match(/\d+/);
        const periods = periodMatch ? parseInt(periodMatch[0], 10) : 1;
        const timeFrame = parts[3] || 'Tuần ...';
        const equipment = parts[4] || 'SGK, tranh ảnh';
        const notes = parts[5] || 'Phòng học';

        if (title && !title.toUpperCase().includes('TÊN BÀI') && !title.toUpperCase().includes('TIẾT PPCT')) {
          items.push({
            id: `ppct-text-item-${orderCounter}`,
            orderNumber: orderCounter++,
            chapter: currentChapter,
            lessonTitle: title,
            periodCount: periods || 1,
            timeFrame,
            equipment,
            notes,
          });
          continue;
        }
      }
    }

    // Pattern matching: e.g. "Bài 1: Căn bậc hai (2 tiết) - Tuần 1" or "1. Bài 1: ..."
    const matchNumbered = line.match(/^(\d+)[\.\,\-\:]\s*(.+)/);
    if (matchNumbered) {
      const remainder = matchNumbered[2].trim();
      // Extract period count if mentioned e.g. "(2 tiết)"
      let periods = 1;
      const periodInParen = remainder.match(/\((\d+)\s*tiết\)/i) || remainder.match(/(\d+)\s*tiết/i);
      if (periodInParen) {
        periods = parseInt(periodInParen[1], 10) || 1;
      }

      // Extract week if mentioned e.g. "- Tuần 1"
      let timeFrame = 'Tuần ...';
      const weekMatch = remainder.match(/tuần\s*(\d+)/i);
      if (weekMatch) {
        timeFrame = `Tuần ${weekMatch[1]}`;
      }

      // Clean title
      const cleanTitle = remainder.replace(/\((\d+)\s*tiết\)/i, '').replace(/[-–]\s*tuần\s*\d+/i, '').trim();

      items.push({
        id: `ppct-text-item-${orderCounter}`,
        orderNumber: orderCounter++,
        chapter: currentChapter,
        lessonTitle: cleanTitle || remainder,
        periodCount: periods,
        timeFrame,
        equipment: 'SGK, tranh ảnh, máy chiếu',
        notes: 'Phòng học',
      });
    } else if (upper.startsWith('BÀI') || upper.startsWith('TIẾT')) {
      // e.g. "Bài 1. Giới thiệu..."
      let periods = 1;
      const periodMatch = line.match(/(\d+)\s*tiết/i);
      if (periodMatch) {
        periods = parseInt(periodMatch[1], 10) || 1;
      }

      items.push({
        id: `ppct-text-item-${orderCounter}`,
        orderNumber: orderCounter++,
        chapter: currentChapter,
        lessonTitle: line,
        periodCount: periods,
        timeFrame: `Tuần ${Math.ceil(orderCounter / 4) || 1}`,
        equipment: 'SGK, bảng phụ',
        notes: 'Phòng học',
      });
    }
  }

  return items;
}

// Extract teachers from any 2D grid of strings/data
export function extractTeachersFromGrid(jsonData: any[][]): Teacher[] {
  if (!jsonData || jsonData.length === 0) return [];

  let headerRowIndex = -1;
  let colHoTenIdx = -1;
  let colHoDemIdx = -1;
  let colTenIdx = -1;
  let colShortNameIdx = -1;
  let colSubjectIdx = -1;
  let colDeptIdx = -1;
  let colEmailIdx = -1;

  // Scan up to first 25 rows for table headers
  for (let r = 0; r < Math.min(jsonData.length, 25); r++) {
    const row = jsonData[r];
    if (!row || row.length === 0) continue;

    let tempHoTen = -1;
    let tempHoDem = -1;
    let tempTen = -1;
    let tempShortName = -1;
    let tempSubject = -1;
    let tempDept = -1;
    let tempEmail = -1;

    row.forEach((cell, idx) => {
      const val = String(cell || '').toLowerCase().trim().replace(/\s+/g, ' ');
      if (!val) return;

      if (
        val.includes('họ và tên') ||
        val.includes('họ tên') ||
        val === 'tên gv' ||
        val === 'tên giáo viên' ||
        val.includes('cán bộ giáo viên') ||
        val.includes('cbgv') ||
        val === 'giáo viên' ||
        val === 'người dạy'
      ) {
        tempHoTen = idx;
      } else if (val === 'họ' || val.includes('họ và đệm') || val.includes('họ đệm') || val.includes('họ lót')) {
        tempHoDem = idx;
      } else if (val === 'tên' || val === 'tên riêng') {
        tempTen = idx;
      } else if (
        val.includes('ký hiệu') ||
        val.includes('viết tắt') ||
        val.includes('tên gọi') ||
        val === 'tên tkb' ||
        val === 'ký hiệu tkb' ||
        val === 'mã gv' ||
        val === 'viết tắt tkb'
      ) {
        tempShortName = idx;
      } else if (
        val.includes('môn dạy') ||
        val.includes('bộ môn') ||
        val.includes('chuyên môn') ||
        val.includes('phân công') ||
        val === 'môn' ||
        val.includes('môn giảng dạy')
      ) {
        tempSubject = idx;
      } else if (
        val.includes('tổ chuyên môn') ||
        val.includes('tổ bộ môn') ||
        val.includes('tổ cm') ||
        val === 'tổ' ||
        val.includes('phòng') ||
        val.includes('đơn vị')
      ) {
        tempDept = idx;
      } else if (
        val.includes('email') ||
        val.includes('điện thoại') ||
        val.includes('sđt') ||
        val.includes('sdt') ||
        val.includes('ghi chú')
      ) {
        tempEmail = idx;
      }
    });

    // Valid header row if it found a name column OR both (họ đệm + tên)
    if (tempHoTen !== -1 || (tempHoDem !== -1 && tempTen !== -1)) {
      headerRowIndex = r;
      colHoTenIdx = tempHoTen;
      colHoDemIdx = tempHoDem;
      colTenIdx = tempTen;
      colShortNameIdx = tempShortName;
      colSubjectIdx = tempSubject;
      colDeptIdx = tempDept;
      colEmailIdx = tempEmail;
      break;
    }
  }

  // If no explicit header row, detect columns statistically by scanning rows for Vietnamese surnames
  let startRow = 0;
  if (headerRowIndex >= 0) {
    startRow = headerRowIndex + 1;
  } else {
    // Scan cells to find which column contains the most person names
    const colScores: { [col: number]: number } = {};
    for (let r = 0; r < Math.min(jsonData.length, 30); r++) {
      const row = jsonData[r];
      if (!row) continue;
      row.forEach((cell, idx) => {
        const str = String(cell || '').trim().toLowerCase();
        const firstWord = str.split(/\s+/)[0];
        if (COMMON_VIETNAMESE_SURNAMES.includes(firstWord)) {
          colScores[idx] = (colScores[idx] || 0) + 1;
        }
      });
    }

    let bestCol = -1;
    let maxScore = 0;
    Object.keys(colScores).forEach((colStr) => {
      const c = parseInt(colStr, 10);
      if (colScores[c] > maxScore) {
        maxScore = colScores[c];
        bestCol = c;
      }
    });

    if (bestCol !== -1 && maxScore >= 2) {
      colHoTenIdx = bestCol;
      colShortNameIdx = bestCol + 1 < 10 ? bestCol + 1 : -1;
    }
  }

  const teachers: Teacher[] = [];
  const seenNames = new Set<string>();
  let counter = 1;

  for (let r = startRow; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length === 0) continue;

    let fullName = '';
    let explicitShortName = '';

    if (colHoDemIdx !== -1 && colTenIdx !== -1 && row[colHoDemIdx] && row[colTenIdx]) {
      const hoDem = String(row[colHoDemIdx]).trim();
      const ten = String(row[colTenIdx]).trim();
      fullName = formatPersonName(`${hoDem} ${ten}`);
      explicitShortName = colShortNameIdx !== -1 && row[colShortNameIdx] ? String(row[colShortNameIdx]).trim() : ten;
    } else if (colHoTenIdx !== -1 && row[colHoTenIdx]) {
      fullName = formatPersonName(String(row[colHoTenIdx]));
      if (colShortNameIdx !== -1 && row[colShortNameIdx]) {
        explicitShortName = String(row[colShortNameIdx]).trim();
      }
    } else {
      // Check each cell in row for a valid person name
      for (let c = 0; c < Math.min(row.length, 6); c++) {
        const candidate = formatPersonName(String(row[c] || ''));
        const firstWord = candidate.toLowerCase().split(/\s+/)[0];
        if (COMMON_VIETNAMESE_SURNAMES.includes(firstWord) && isValidPersonName(candidate)) {
          fullName = candidate;
          if (row[c + 1]) explicitShortName = String(row[c + 1]).trim();
          break;
        }
      }
    }

    if (!isValidPersonName(fullName)) continue;

    const normalizedName = fullName.toLowerCase();
    if (seenNames.has(normalizedName)) continue;
    seenNames.add(normalizedName);

    const shortName = extractShortName(fullName, explicitShortName);

    let subject = '';
    if (colSubjectIdx !== -1 && row[colSubjectIdx]) {
      const s = String(row[colSubjectIdx]).trim();
      if (!BLACKLIST_WORDS.includes(s.toLowerCase())) subject = s;
    }

    let department = '';
    if (colDeptIdx !== -1 && row[colDeptIdx]) {
      const d = String(row[colDeptIdx]).trim();
      if (!BLACKLIST_WORDS.includes(d.toLowerCase())) department = d;
    }

    let email: string | undefined = undefined;
    if (colEmailIdx !== -1 && row[colEmailIdx]) {
      const e = String(row[colEmailIdx]).trim();
      if (e.includes('@') || /^\d{9,11}$/.test(e)) email = e;
    }

    teachers.push({
      id: `teacher-${Date.now()}-${counter++}`,
      name: fullName,
      shortName: shortName,
      subject: subject || 'Giáo viên bộ môn',
      department: department || 'Tổ Chuyên Môn',
      email: email,
    });
  }

  return teachers;
}

// Function to read Excel file for Teacher List
export async function parseExcelTeacherListFile(file: File): Promise<Teacher[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let allTeachers: Teacher[] = [];

        // Check each sheet, prioritize sheets with names indicating teachers
        const sheetNames = workbook.SheetNames;
        const prioritizedSheet =
          sheetNames.find((s) => {
            const lower = s.toLowerCase();
            return lower.includes('giáo viên') || lower.includes('gv') || lower.includes('cbgv') || lower.includes('danh sách');
          }) || sheetNames[0];

        const worksheet = workbook.Sheets[prioritizedSheet];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        allTeachers = extractTeachersFromGrid(jsonData);

        // If prioritized sheet had 0 teachers, try other sheets
        if (allTeachers.length === 0) {
          for (const sName of sheetNames) {
            if (sName === prioritizedSheet) continue;
            const ws = workbook.Sheets[sName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const found = extractTeachersFromGrid(sheetData);
            if (found.length > allTeachers.length) {
              allTeachers = found;
            }
          }
        }

        resolve(allTeachers);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Function to read Word (.docx) file for Teacher List using mammoth
export async function parseDocxTeacherListFile(file: File): Promise<Teacher[]> {
  const arrayBuffer = await file.arrayBuffer();
  // Extract HTML from docx to preserve tables
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');

  if (tables.length > 0) {
    let bestTeachers: Teacher[] = [];
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tr');
      const grid: any[][] = [];
      rows.forEach((tr) => {
        const cells = tr.querySelectorAll('td, th');
        const rowData: string[] = [];
        cells.forEach((td) => {
          rowData.push(td.textContent?.trim() || '');
        });
        if (rowData.length > 0) grid.push(rowData);
      });
      const parsed = extractTeachersFromGrid(grid);
      if (parsed.length > bestTeachers.length) {
        bestTeachers = parsed;
      }
    });

    if (bestTeachers.length > 0) return bestTeachers;
  }

  // Fallback: extract raw text and parse lines
  const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
  return parseTextTeacherList(rawTextResult.value);
}

// Function to parse raw text / pasted content for Teacher List
export function parseTextTeacherList(rawText: string): Teacher[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const grid: string[][] = [];

  lines.forEach((line) => {
    // If line has tabs, split by tab
    if (line.includes('\t')) {
      grid.push(line.split('\t').map((c) => c.trim()));
    } else if (line.includes('|')) {
      grid.push(line.split('|').map((c) => c.trim()));
    } else if (line.includes(' - ') || line.includes(';')) {
      const parts = line.includes(' - ') ? line.split(' - ') : line.split(';');
      grid.push(parts.map((p) => p.trim()));
    } else if (line.includes(',')) {
      grid.push(line.split(',').map((c) => c.trim()));
    } else {
      grid.push([line]);
    }
  });

  return extractTeachersFromGrid(grid);
}

// Function to export Teacher List to Excel
export function exportTeacherListToExcel(teachers: Teacher[], schoolName: string = 'TRƯỜNG THCS ĐỒNG PHÚ'): void {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    [schoolName.toUpperCase()],
    ['DANH SÁCH CÁN BỘ GIÁO VIÊN VÀ KÝ HIỆU THỜI KHÓA BIỂU'],
    [`Năm học: 2026 - 2027 • Tổng số: ${teachers.length} Giáo viên`],
    [''],
    ['STT', 'Họ và tên Giáo viên', 'Ký hiệu TKB (Tên gọi)', 'Môn dạy / Phân công', 'Tổ chuyên môn', 'Ghi chú / Email'],
  ];

  teachers.forEach((t, idx) => {
    data.push([
      idx + 1,
      t.name,
      t.shortName,
      t.subject,
      t.department,
      t.email || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 20 },
    { wch: 26 },
    { wch: 30 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Giao_Vien');
  XLSX.writeFile(wb, `Danh_Sach_Giao_Vien_${schoolName.replace(/\s+/g, '_')}.xlsx`);
}

// Generate & Download Standard Timetable Excel Template
export function downloadSampleTimetableExcel(): void {
  const wb = XLSX.utils.book_new();
  const classes = ['6⁷-A3', '6⁸-A4', '7⁷-A6', '7⁸-A5', '8⁶-A8', '8⁷-A7', '9⁸-A1', '9⁹-A2'];

  const data: any[][] = [
    ['TRƯỜNG THCS ĐỒNG PHÚ'],
    ['THỜI KHÓA BIỂU TOÀN TRƯỜNG (MẪU CHUẨN FILE EXCEL)'],
    ['Áp dụng từ Tuần 16 • Học kỳ I'],
    [''],
    ['Thứ', 'Buổi', 'Tiết', ...classes],
  ];

  const sampleLessons: { [key: string]: { [cls: string]: string } } = {
    '2-1': { '6⁷-A3': 'Chào cờ', '6⁸-A4': 'Chào cờ', '7⁷-A6': 'Chào cờ', '7⁸-A5': 'Chào cờ', '8⁶-A8': 'Chào cờ', '8⁷-A7': 'Chào cờ', '9⁸-A1': 'Chào cờ', '9⁹-A2': 'Chào cờ' },
    '2-2': { '6⁷-A3': 'Toán (Sơn)', '6⁸-A4': 'Ngữ văn (Lan)', '7⁷-A6': 'KHTN (Thắng)', '7⁸-A5': 'Tiếng Anh (Linh)', '8⁶-A8': 'Toán (Thắm)', '8⁷-A7': 'Lịch sử & ĐL (Hải)', '9⁸-A1': 'Toán (Sơn)', '9⁹-A2': 'Ngữ văn (Lan)' },
    '2-3': { '6⁷-A3': 'Toán (Sơn)', '6⁸-A4': 'Ngữ văn (Lan)', '7⁷-A6': 'KHTN (Thắng)', '7⁸-A5': 'GDCD (An)', '8⁶-A8': 'Tiếng Anh (Linh)', '8⁷-A7': 'Toán (Thắm)', '9⁸-A1': 'KHTN (Thắng)', '9⁹-A2': 'Toán (Sơn)' },
    '2-4': { '6⁷-A3': 'Tiếng Anh (Linh)', '6⁸-A4': 'KHTN (Thắng)', '7⁷-A6': 'Ngữ văn (Lan)', '7⁸-A5': 'Toán (Sơn)', '8⁶-A8': 'Tin học (Cường)', '8⁷-A7': 'Công nghệ (Dũng)', '9⁸-A1': 'Ngữ văn (Lan)', '9⁹-A2': 'Tiếng Anh (Linh)' },
    '2-5': { '6⁷-A3': 'GDTC (Bình)', '6⁸-A4': 'Tin học (Cường)', '7⁷-A6': 'GDTC (Bình)', '7⁸-A5': 'KHTN (Thắng)', '8⁶-A8': 'Lịch sử & ĐL (Hải)', '8⁷-A7': 'GDCD (An)', '9⁸-A1': 'Tiếng Anh (Linh)', '9⁹-A2': 'KHTN (Thắng)' },

    '3-1': { '6⁷-A3': 'Ngữ văn (Lan)', '6⁸-A4': 'Toán (Sơn)', '7⁷-A6': 'Toán (Thắm)', '7⁸-A5': 'Ngữ văn (Lan)', '8⁶-A8': 'KHTN (Thắng)', '8⁷-A7': 'Tiếng Anh (Linh)', '9⁸-A1': 'Toán (Sơn)', '9⁹-A2': 'Lịch sử & ĐL (Hải)' },
    '3-2': { '6⁷-A3': 'Ngữ văn (Lan)', '6⁸-A4': 'Toán (Sơn)', '7⁷-A6': 'Tiếng Anh (Linh)', '7⁸-A5': 'Toán (Thắm)', '8⁶-A8': 'KHTN (Thắng)', '8⁷-A7': 'Ngữ văn (Lan)', '9⁸-A1': 'Toán (Sơn)', '9⁹-A2': 'Tin học (Cường)' },
    '3-3': { '6⁷-A3': 'KHTN (Thắng)', '6⁸-A4': 'Tiếng Anh (Linh)', '7⁷-A6': 'Ngữ văn (Lan)', '7⁸-A5': 'KHTN (Thắng)', '8⁶-A8': 'Toán (Sơn)', '8⁷-A7': 'Nghệ thuật (Huyền)', '9⁸-A1': 'KHTN (Thắng)', '9⁹-A2': 'Ngữ văn (Lan)' },
    '3-4': { '6⁷-A3': 'Lịch sử & ĐL (Hải)', '6⁸-A4': 'KHTN (Thắng)', '7⁷-A6': 'GDCD (An)', '7⁸-A5': 'Nghệ thuật (Huyền)', '8⁶-A8': 'GDTC (Bình)', '8⁷-A7': 'Toán (Sơn)', '9⁸-A1': 'Ngữ văn (Lan)', '9⁹-A2': 'GDCD (An)' },
    '3-5': { '6⁷-A3': 'Tin học (Cường)', '6⁸-A4': 'Công nghệ (Dũng)', '7⁷-A6': 'Tin học (Cường)', '7⁸-A5': 'GDTC (Bình)', '8⁶-A8': 'Công nghệ (Dũng)', '8⁷-A7': 'KHTN (Thắng)', '9⁸-A1': 'GDTC (Bình)', '9⁹-A2': 'Công nghệ (Dũng)' },

    '4-1': { '6⁷-A3': 'Toán (Sơn)', '6⁸-A4': 'Ngữ văn (Lan)', '7⁷-A6': 'KHTN (Thắng)', '7⁸-A5': 'Lịch sử & ĐL (Hải)', '8⁶-A8': 'Toán (Thắm)', '8⁷-A7': 'Ngữ văn (Lan)', '9⁸-A1': 'Tiếng Anh (Linh)', '9⁹-A2': 'Toán (Sơn)' },
    '4-2': { '6⁷-A3': 'Toán (Sơn)', '6⁸-A4': 'Tiếng Anh (Linh)', '7⁷-A6': 'Toán (Thắm)', '7⁸-A5': 'Ngữ văn (Lan)', '8⁶-A8': 'Ngữ văn (Lan)', '8⁷-A7': 'Toán (Sơn)', '9⁸-A1': 'Toán (Sơn)', '9⁹-A2': 'KHTN (Thắng)' },
    '4-3': { '6⁷-A3': 'KHTN (Thắng)', '6⁸-A4': 'Lịch sử & ĐL (Hải)', '7⁷-A6': 'Tiếng Anh (Linh)', '7⁸-A5': 'Toán (Thắm)', '8⁶-A8': 'KHTN (Thắng)', '8⁷-A7': 'Tin học (Cường)', '9⁸-A1': 'Lịch sử & ĐL (Hải)', '9⁹-A2': 'Ngữ văn (Lan)' },
    '4-4': { '6⁷-A3': 'Nghệ thuật (Huyền)', '6⁸-A4': 'GDCD (An)', '7⁷-A6': 'Lịch sử & ĐL (Hải)', '7⁸-A5': 'Công nghệ (Dũng)', '8⁶-A8': 'Nghệ thuật (Huyền)', '8⁷-A7': 'KHTN (Thắng)', '9⁸-A1': 'Tin học (Cường)', '9⁹-A2': 'GDTC (Bình)' },
    '4-5': { '6⁷-A3': 'Công nghệ (Dũng)', '6⁸-A4': 'GDTC (Bình)', '7⁷-A6': 'Công nghệ (Dũng)', '7⁸-A5': 'Tin học (Cường)', '8⁶-A8': 'GDCD (An)', '8⁷-A7': 'GDTC (Bình)', '9⁸-A1': 'Công nghệ (Dũng)', '9⁹-A2': 'Nghệ thuật (Huyền)' },

    '5-1': { '6⁷-A3': 'Ngữ văn (Lan)', '6⁸-A4': 'Toán (Sơn)', '7⁷-A6': 'GDTC (Bình)', '7⁸-A5': 'Tiếng Anh (Linh)', '8⁶-A8': 'Lịch sử & ĐL (Hải)', '8⁷-A7': 'Toán (Thắm)', '9⁸-A1': 'Ngữ văn (Lan)', '9⁹-A2': 'Toán (Sơn)' },
    '5-2': { '6⁷-A3': 'Ngữ văn (Lan)', '6⁸-A4': 'KHTN (Thắng)', '7⁷-A6': 'Toán (Thắm)', '7⁸-A5': 'KHTN (Thắng)', '8⁶-A8': 'Toán (Sơn)', '8⁷-A7': 'Ngữ văn (Lan)', '9⁸-A1': 'KHTN (Thắng)', '9⁹-A2': 'Ngữ văn (Lan)' },
    '5-3': { '6⁷-A3': 'Tiếng Anh (Linh)', '6⁸-A4': 'Ngữ văn (Lan)', '7⁷-A6': 'Ngữ văn (Lan)', '7⁸-A5': 'Toán (Thắm)', '8⁶-A8': 'Tiếng Anh (Linh)', '8⁷-A7': 'KHTN (Thắng)', '9⁸-A1': 'Toán (Sơn)', '9⁹-A2': 'Tiếng Anh (Linh)' },
    '5-4': { '6⁷-A3': 'KHTN (Thắng)', '6⁸-A4': 'Nghệ thuật (Huyền)', '7⁷-A6': 'Tin học (Cường)', '7⁸-A5': 'Lịch sử & ĐL (Hải)', '8⁶-A8': 'Tin học (Cường)', '8⁷-A7': 'GDCD (An)', '9⁸-A1': 'GDCD (An)', '9⁹-A2': 'Toán (Sơn)' },
    '5-5': { '6⁷-A3': 'GDCD (An)', '6⁸-A4': 'GDTC (Bình)', '7⁷-A6': 'HĐTN (GVCN)', '7⁸-A5': 'HĐTN (GVCN)', '8⁶-A8': 'HĐTN (GVCN)', '8⁷-A7': 'HĐTN (GVCN)', '9⁸-A1': 'HĐTN (GVCN)', '9⁹-A2': 'HĐTN (GVCN)' },

    '6-1': { '6⁷-A3': 'Toán (Sơn)', '6⁸-A4': 'Tiếng Anh (Linh)', '7⁷-A6': 'Toán (Thắm)', '7⁸-A5': 'Ngữ văn (Lan)', '8⁶-A8': 'Ngữ văn (Lan)', '8⁷-A7': 'Toán (Sơn)', '9⁸-A1': 'Toán (Sơn)', '9⁹-A2': 'Tiếng Anh (Linh)' },
    '6-2': { '6⁷-A3': 'Toán (Sơn)', '6⁸-A4': 'Ngữ văn (Lan)', '7⁷-A6': 'KHTN (Thắng)', '7⁸-A5': 'Toán (Thắm)', '8⁶-A8': 'Toán (Sơn)', '8⁷-A7': 'Ngữ văn (Lan)', '9⁸-A1': 'Ngữ văn (Lan)', '9⁹-A2': 'Toán (Sơn)' },
    '6-3': { '6⁷-A3': 'Tiếng Anh (Linh)', '6⁸-A4': 'Toán (Sơn)', '7⁷-A6': 'Tiếng Anh (Linh)', '7⁸-A5': 'KHTN (Thắng)', '8⁶-A8': 'KHTN (Thắng)', '8⁷-A7': 'Tiếng Anh (Linh)', '9⁸-A1': 'Tiếng Anh (Linh)', '9⁹-A2': 'KHTN (Thắng)' },
    '6-4': { '6⁷-A3': 'HĐTN (GVCN)', '6⁸-A4': 'HĐTN (GVCN)', '7⁷-A6': 'Công nghệ (Dũng)', '7⁸-A5': 'GDCD (An)', '8⁶-A8': 'Lịch sử & ĐL (Hải)', '8⁷-A7': 'Công nghệ (Dũng)', '9⁸-A1': 'Lịch sử & ĐL (Hải)', '9⁹-A2': 'Tin học (Cường)' },
    '6-5': { '6⁷-A3': 'SHL (GVCN)', '6⁸-A4': 'SHL (GVCN)', '7⁷-A6': 'SHL (GVCN)', '7⁸-A5': 'SHL (GVCN)', '8⁶-A8': 'SHL (GVCN)', '8⁷-A7': 'SHL (GVCN)', '9⁸-A1': 'SHL (GVCN)', '9⁹-A2': 'SHL (GVCN)' },
  };

  const days = [
    { day: 2, name: 'Thứ Hai' },
    { day: 3, name: 'Thứ Ba' },
    { day: 4, name: 'Thứ Tư' },
    { day: 5, name: 'Thứ Năm' },
    { day: 6, name: 'Thứ Sáu' },
  ];

  days.forEach((d) => {
    for (let p = 1; p <= 5; p++) {
      const key = `${d.day}-${p}`;
      const rowSlots = sampleLessons[key] || {};
      const rowData = [
        p === 1 ? d.name : '',
        'Sáng',
        p,
        ...classes.map((cls) => rowSlots[cls] || ''),
      ];
      data.push(rowData);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    ...classes.map(() => ({ wch: 20 })),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Thoi_Khoa_Bieu');
  XLSX.writeFile(wb, 'Mau_Thoi_Khoa_Bieu_Chuan.xlsx');
}

// Generate & Download Standard Teacher List Excel Template
export function downloadSampleTeacherListExcel(): void {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    ['TRƯỜNG THCS ĐỒNG PHÚ'],
    ['DANH SÁCH CÁN BỘ GIÁO VIÊN VÀ KÝ HIỆU THỜI KHÓA BIỂU'],
    ['Năm học: 2026 - 2027 • Tổng số: 34 Giáo viên'],
    [''],
    ['STT', 'Họ và tên', 'Ký hiệu TKB', 'Môn giảng dạy', 'Tổ chuyên môn'],
    [1, 'Trần Văn Sơn', 'T.Sơn', 'Toán', 'Toán - KHTN'],
    [2, 'Nguyễn Thị Lan', 'C.Lan', 'Ngữ văn', 'Văn - Sử - GDCD'],
    [3, 'Lê Văn Thắng', 'T.Thắng', 'KHTN', 'Toán - KHTN'],
    [4, 'Hoàng Thị Thắm', 'C.Thắm', 'Toán', 'Toán - KHTN'],
    [5, 'Phạm Phương Linh', 'C.Linh', 'Tiếng Anh', 'Ngoại ngữ - Nghệ thuật'],
    [6, 'Vũ Hải', 'T.Hải', 'Lịch sử & Địa lí', 'Văn - Sử - GDCD'],
    [7, 'Đỗ Văn Cường', 'T.Cường', 'Tin học', 'Toán - KHTN'],
    [8, 'Bùi Văn Dũng', 'T.Dũng', 'Công nghệ', 'Toán - KHTN'],
    [9, 'Ngô Thanh Bình', 'T.Bình', 'GDTC', 'Ngoại ngữ - Nghệ thuật'],
    [10, 'Nguyễn Thu Huyền', 'C.Huyền', 'Nghệ thuật', 'Ngoại ngữ - Nghệ thuật'],
    [11, 'Lê Thị An', 'C.An', 'GDCD', 'Văn - Sử - GDCD'],
    [12, 'Đinh Tiến Đạt', 'T.Đạt', 'Toán', 'Toán - KHTN'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 18 },
    { wch: 22 },
    { wch: 26 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_GV');
  XLSX.writeFile(wb, 'Mau_Danh_Sach_Giao_Vien_Chuan.xlsx');
}


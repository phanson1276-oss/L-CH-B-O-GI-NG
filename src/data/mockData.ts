import { Teacher, TimetableData, PPCTPlan, TimetableSlot, TimetableVersion } from '../types';
import { FULL_STANDARD_PPCT_PLANS, STANDARD_SUBJECTS_LIST, GRADES_LIST } from './ppctCurriculumData';

export { STANDARD_SUBJECTS_LIST, GRADES_LIST };

export const SCHOOL_INFO = {
  name: 'TRƯỜNG THCS ĐỒNG PHÚ',
  campus: 'PHÂN HIỆU HẢI THÀNH',
  district: 'UBND PHƯỜNG ĐỒNG HỚI',
  province: 'TỈNH QUẢNG TRỊ',
  address: 'Phường Hải Thành, TP. Đồng Hới, Tỉnh Quảng Trị',
  phone: '0232.3822.456',
  schoolYear: '2026 - 2027',
};

// 17 giáo viên theo BẢNG PHÂN CÔNG PHẦN HÀNH – LẦN 1 - NĂM HỌC 2026 – 2027 (Phân hiệu Hải Thành)
export const TEACHERS_LIST: Teacher[] = [
  // Tổ Xã Hội
  {
    id: 't1',
    name: 'Nguyễn Thị Thu Thuỷ',
    shortName: 'C.Thủy',
    subject: 'HĐTN,HN (Khối 9, 6⁷)',
    department: 'Tổ Xã Hội',
    role: 'Phó Hiệu trưởng',
    totalPeriods: 4,
  },
  {
    id: 't2',
    name: 'Hà Thị Quý',
    shortName: 'C.Quý',
    subject: 'Ngữ văn (Khối 9, 6⁸), HĐTN (9⁸)',
    department: 'Tổ Xã Hội',
    role: 'TPCM',
    homeroom: '9⁸ (A1)',
    totalPeriods: 18,
  },
  {
    id: 't3',
    name: 'Phan Thị Trang',
    shortName: 'C.Trang',
    subject: 'Ngữ văn (8⁷), Âm nhạc (Khối 6,7,8,9), HĐTN (8⁷)',
    department: 'Tổ Xã Hội',
    homeroom: '8⁷ (A7)',
    totalPeriods: 22,
  },
  {
    id: 't4',
    name: 'Trần Thị Lợi',
    shortName: 'C.Lợi',
    subject: 'Ngữ văn (7⁷, 7⁸), Lịch sử (Khối 7,8,9), GDĐP (Khối 7)',
    department: 'Tổ Xã Hội',
    totalPeriods: 19,
  },
  {
    id: 't5',
    name: 'Trần Thị Hằng',
    shortName: 'C.Hằng',
    subject: 'Địa lí (Khối 6,7,8,9), HĐTN (9⁹), BDHSG Địa 9',
    department: 'Tổ Xã Hội',
    homeroom: '9⁹ (A2)',
    totalPeriods: 20,
  },
  {
    id: 't6',
    name: 'Nguyễn Thị Lương Phượng',
    shortName: 'C.Phượng',
    subject: 'Ngữ văn (8⁶, 6⁷), Lịch sử 6, HĐTN (6⁷), GDĐP 6',
    department: 'Tổ Xã Hội',
    homeroom: '6⁷ (A3)',
    totalPeriods: 18,
  },

  // Tổ Khoa Học Tự Nhiên Và Công Nghệ
  {
    id: 't7',
    name: 'Nguyễn Thị Công Hạnh',
    shortName: 'C.Hạnh',
    subject: 'KHTN (Hóa, sinh K7, K9), HĐTN (7⁷), BDHSG Sinh 8',
    department: 'Tổ KHTN và Công nghệ',
    role: 'TPCM',
    homeroom: '7⁷ (A6)',
    totalPeriods: 20,
  },
  {
    id: 't8',
    name: 'Phan Thị Khoa',
    shortName: 'C.Khoa',
    subject: 'KHTN (Hóa, sinh K6, K8), HĐTN (8⁶)',
    department: 'Tổ KHTN và Công nghệ',
    homeroom: '8⁶ (A8)',
    totalPeriods: 18,
  },
  {
    id: 't9',
    name: 'Võ Thị Ngọc Anh',
    shortName: 'C.Anh',
    subject: 'Công nghệ (Khối 6,7,8,9), HĐTN (6⁸, 8⁷, 7⁸)',
    department: 'Tổ KHTN và Công nghệ',
    homeroom: '6⁸ (A4)',
    totalPeriods: 18,
  },

  // Tổ Toán - Tin
  {
    id: 't10',
    name: 'Phan Hồng Sơn',
    shortName: 'T.Sơn',
    subject: 'Toán (Khối 8), KHTN (Lý K7, K9)',
    department: 'Tổ Toán - Tin',
    role: 'TTCM, Admin trường',
    totalPeriods: 19,
  },
  {
    id: 't11',
    name: 'Hoàng Thị Hoa Thắm',
    shortName: 'C.Thắm',
    subject: 'Toán (Khối 9, 7⁷), Tin học (Khối 7,8,9), BDHSG Toán 7',
    department: 'Tổ Toán - Tin',
    totalPeriods: 20,
  },
  {
    id: 't12',
    name: 'Trần Anh Tuấn',
    shortName: 'T.Tuấn',
    subject: 'Toán (Khối 6, 7⁸), KHTN (Lý K6, K8), Tin học 6',
    department: 'Tổ Toán - Tin',
    totalPeriods: 18,
  },

  // Tổ NN - GDTC - NT - GDCD
  {
    id: 't13',
    name: 'Đinh Thị Hường',
    shortName: 'C.Hường',
    subject: 'Tiếng Anh (Khối 6, 8), BDHSG Anh 6',
    department: 'Tổ NN - GDTC - NT - GDCD',
    role: 'TPCM',
    totalPeriods: 18,
  },
  {
    id: 't14',
    name: 'Phạm Thị Duyên',
    shortName: 'C.Duyên',
    subject: 'Tiếng Anh (Khối 7, 9), HĐTN (7⁸), BDHSG Anh 7',
    department: 'Tổ NN - GDTC - NT - GDCD',
    homeroom: '7⁸ (A5)',
    totalPeriods: 20,
  },
  {
    id: 't15',
    name: 'Nguyễn Trung Thành',
    shortName: 'T.Thành',
    subject: 'GDTC (Khối 7,8,9)',
    department: 'Tổ NN - GDTC - NT - GDCD',
    role: 'TPT Đội',
    totalPeriods: 19,
  },
  {
    id: 't16',
    name: 'Nguyễn Thị Hiền Hoà',
    shortName: 'C.Hoà',
    subject: 'GDCD (Khối 6,7,8,9), GDTC 6, GDĐP (Khối 8,9)',
    department: 'Tổ NN - GDTC - NT - GDCD',
    role: 'Phó TPT Đội',
    totalPeriods: 19,
  },
  {
    id: 't17',
    name: 'Trần Thị Ngọc Hiền',
    shortName: 'C.Hiền',
    subject: 'Mĩ thuật (Khối 6,7,8,9)',
    department: 'Tổ NN - GDTC - NT - GDCD',
    totalPeriods: 19,
  },
];

export const CLASSES_LIST = ['6⁷-A3', '6⁸-A4', '7⁷-A6', '7⁸-A5', '8⁶-A8', '8⁷-A7', '9⁸-A1', '9⁹-A2'];

const C1 = '6⁷-A3';
const C2 = '6⁸-A4';
const C3 = '7⁷-A6';
const C4 = '7⁸-A5';
const C5 = '8⁶-A8';
const C6 = '8⁷-A7';
const C7 = '9⁸-A1';
const C8 = '9⁹-A2';

// Dữ liệu chi tiết TKB Số 1: Áp dụng từ Tuần 01 (Bắt đầu từ 07/9/2026) - Khớp 100% bản gốc THCS Đồng Phú - Phân hiệu Hải Thành
const initialSlots: TimetableSlot[] = [
  // ==================== THỨ 2 (dayOfWeek: 2) ====================
  // Sáng - Tiết 1
  { dayOfWeek: 2, session: 'morning', period: 1, className: C1, subject: 'HĐTN', teacherShortName: 'C.Thủy' },
  { dayOfWeek: 2, session: 'morning', period: 1, className: C2, subject: 'HĐTN', teacherShortName: 'C.Anh' },
  { dayOfWeek: 2, session: 'morning', period: 1, className: C3, subject: 'HĐTN', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 2, session: 'morning', period: 1, className: C4, subject: 'HĐTN', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 2, session: 'morning', period: 1, className: C5, subject: 'HĐTN', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 2, session: 'morning', period: 1, className: C6, subject: 'HĐTN', teacherShortName: 'C.Trang' },
  { dayOfWeek: 2, session: 'morning', period: 1, className: C7, subject: 'HĐTN', teacherShortName: 'C.Quý' },
  { dayOfWeek: 2, session: 'morning', period: 1, className: C8, subject: 'HĐTN', teacherShortName: 'C.Hằng' },
  // Sáng - Tiết 2
  { dayOfWeek: 2, session: 'morning', period: 2, className: C1, subject: 'Văn', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 2, session: 'morning', period: 2, className: C2, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 2, session: 'morning', period: 2, className: C3, subject: 'KHTN (Sinh)', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 2, session: 'morning', period: 2, className: C4, subject: 'Anh', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 2, session: 'morning', period: 2, className: C5, subject: 'Sử', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 2, session: 'morning', period: 2, className: C6, subject: 'KHTN (Hóa)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 2, session: 'morning', period: 2, className: C7, subject: 'Văn', teacherShortName: 'C.Quý' },
  { dayOfWeek: 2, session: 'morning', period: 2, className: C8, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  // Sáng - Tiết 3
  { dayOfWeek: 2, session: 'morning', period: 3, className: C1, subject: 'Văn', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 2, session: 'morning', period: 3, className: C2, subject: 'GDTC', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 2, session: 'morning', period: 3, className: C3, subject: 'Văn', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 2, session: 'morning', period: 3, className: C4, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 2, session: 'morning', period: 3, className: C5, subject: 'KHTN (Hóa)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 2, session: 'morning', period: 3, className: C6, subject: 'KHTN (Lý)', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 2, session: 'morning', period: 3, className: C7, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 2, session: 'morning', period: 3, className: C8, subject: 'Toán', teacherShortName: 'C.Thắm' },
  // Sáng - Tiết 4
  { dayOfWeek: 2, session: 'morning', period: 4, className: C1, subject: 'GDTC', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 2, session: 'morning', period: 4, className: C2, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 2, session: 'morning', period: 4, className: C3, subject: 'Toán', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 2, session: 'morning', period: 4, className: C4, subject: 'Văn', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 2, session: 'morning', period: 4, className: C5, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 2, session: 'morning', period: 4, className: C6, subject: 'Toán', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 2, session: 'morning', period: 4, className: C7, subject: 'MT', teacherShortName: 'C.Hiền' },
  { dayOfWeek: 2, session: 'morning', period: 4, className: C8, subject: 'Văn', teacherShortName: 'C.Quý' },
  // Sáng - Tiết 5
  { dayOfWeek: 2, session: 'morning', period: 5, className: C1, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 2, session: 'morning', period: 5, className: C2, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 2, session: 'morning', period: 5, className: C3, subject: 'Toán', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 2, session: 'morning', period: 5, className: C4, subject: 'Văn', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 2, session: 'morning', period: 5, className: C5, subject: 'Toán', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 2, session: 'morning', period: 5, className: C6, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 2, session: 'morning', period: 5, className: C7, subject: 'GDCD', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 2, session: 'morning', period: 5, className: C8, subject: 'MT', teacherShortName: 'C.Hiền' },

  // Chiều Thứ 2: Bồi dưỡng HSG (Địa 9, Sinh 8, Anh 6, Anh 7, Toán 7)
  { dayOfWeek: 2, session: 'afternoon', period: 1, className: 'HSG-A1', subject: 'BDHSG Địa 9', teacherShortName: 'C.Hằng', room: 'A1' },
  { dayOfWeek: 2, session: 'afternoon', period: 1, className: 'HSG-A2', subject: 'BDHSG Sinh 8', teacherShortName: 'C.Hạnh', room: 'A2' },
  { dayOfWeek: 2, session: 'afternoon', period: 1, className: 'HSG-A3', subject: 'BDHSG Anh 6', teacherShortName: 'C.Hường', room: 'A3' },
  { dayOfWeek: 2, session: 'afternoon', period: 1, className: 'HSG-A4', subject: 'BDHSG Anh 7', teacherShortName: 'C.Duyên', room: 'A4' },
  { dayOfWeek: 2, session: 'afternoon', period: 1, className: 'HSG-A5', subject: 'BDHSG Toán 7', teacherShortName: 'C.Thắm', room: 'A5' },

  // ==================== THỨ 3 (dayOfWeek: 3) ====================
  // Sáng - Tiết 1
  { dayOfWeek: 3, session: 'morning', period: 1, className: C1, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 3, session: 'morning', period: 1, className: C2, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 3, session: 'morning', period: 1, className: C3, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 3, session: 'morning', period: 1, className: C4, subject: 'Anh', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 3, session: 'morning', period: 1, className: C5, subject: 'Văn', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 3, session: 'morning', period: 1, className: C6, subject: 'Sử', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 3, session: 'morning', period: 1, className: C7, subject: 'GDĐP', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 3, session: 'morning', period: 1, className: C8, subject: 'Văn', teacherShortName: 'C.Quý' },
  // Sáng - Tiết 2
  { dayOfWeek: 3, session: 'morning', period: 2, className: C1, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 3, session: 'morning', period: 2, className: C2, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 3, session: 'morning', period: 2, className: C3, subject: 'Anh', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 3, session: 'morning', period: 2, className: C4, subject: 'KHTN (Sinh)', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 3, session: 'morning', period: 2, className: C5, subject: 'Văn', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 3, session: 'morning', period: 2, className: C6, subject: 'Toán', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 3, session: 'morning', period: 2, className: C7, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 3, session: 'morning', period: 2, className: C8, subject: 'Văn', teacherShortName: 'C.Quý' },
  // Sáng - Tiết 3
  { dayOfWeek: 3, session: 'morning', period: 3, className: C1, subject: 'HĐTN', teacherShortName: 'C.Thủy' },
  { dayOfWeek: 3, session: 'morning', period: 3, className: C2, subject: 'GDTC', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 3, session: 'morning', period: 3, className: C3, subject: 'Văn', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 3, session: 'morning', period: 3, className: C4, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 3, session: 'morning', period: 3, className: C5, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 3, session: 'morning', period: 3, className: C6, subject: 'Toán', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 3, session: 'morning', period: 3, className: C7, subject: 'Anh', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 3, session: 'morning', period: 3, className: C8, subject: 'KHTN (Sinh)', teacherShortName: 'C.Hạnh' },
  // Sáng - Tiết 4
  { dayOfWeek: 3, session: 'morning', period: 4, className: C1, subject: 'Văn', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 3, session: 'morning', period: 4, className: C2, subject: 'Văn', teacherShortName: 'C.Quý' },
  { dayOfWeek: 3, session: 'morning', period: 4, className: C3, subject: 'Văn', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 3, session: 'morning', period: 4, className: C4, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 3, session: 'morning', period: 4, className: C5, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 3, session: 'morning', period: 4, className: C6, subject: 'GDCD', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 3, session: 'morning', period: 4, className: C7, subject: 'KHTN (Sinh)', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 3, session: 'morning', period: 4, className: C8, subject: 'KHTN (Lý)', teacherShortName: 'T.Sơn' },
  // Sáng - Tiết 5
  { dayOfWeek: 3, session: 'morning', period: 5, className: C1, subject: 'Tin', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 3, session: 'morning', period: 5, className: C2, subject: 'Văn', teacherShortName: 'C.Quý' },
  { dayOfWeek: 3, session: 'morning', period: 5, className: C3, subject: 'HĐTN', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 3, session: 'morning', period: 5, className: C4, subject: 'Văn', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 3, session: 'morning', period: 5, className: C5, subject: 'GDCD', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 3, session: 'morning', period: 5, className: C6, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 3, session: 'morning', period: 5, className: C7, subject: 'KHTN (Lý)', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 3, session: 'morning', period: 5, className: C8, subject: 'Anh', teacherShortName: 'C.Duyên' },

  // Chiều Thứ 3 - Tiết 1
  { dayOfWeek: 3, session: 'afternoon', period: 1, className: C1, subject: 'Sử', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 3, session: 'afternoon', period: 1, className: C2, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 3, session: 'afternoon', period: 1, className: C3, subject: 'Tin', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 3, session: 'afternoon', period: 1, className: C4, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 3, session: 'afternoon', period: 1, className: C5, subject: 'KHTN (Hóa)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 3, session: 'afternoon', period: 1, className: C6, subject: 'GDĐP', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 3, session: 'afternoon', period: 1, className: C7, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 3, session: 'afternoon', period: 1, className: C8, subject: 'GDTC', teacherShortName: 'T.Thành' },
  // Chiều Thứ 3 - Tiết 2
  { dayOfWeek: 3, session: 'afternoon', period: 2, className: C1, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 3, session: 'afternoon', period: 2, className: C2, subject: 'Sử', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 3, session: 'afternoon', period: 2, className: C3, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 3, session: 'afternoon', period: 2, className: C4, subject: 'Tin', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 3, session: 'afternoon', period: 2, className: C5, subject: 'GDĐP', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 3, session: 'afternoon', period: 2, className: C6, subject: 'KHTN (Hóa)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 3, session: 'afternoon', period: 2, className: C7, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 3, session: 'afternoon', period: 2, className: C8, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },

  // ==================== THỨ 4 (dayOfWeek: 4) ====================
  // Sáng - Tiết 1
  { dayOfWeek: 4, session: 'morning', period: 1, className: C1, subject: 'Văn', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 4, session: 'morning', period: 1, className: C2, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 4, session: 'morning', period: 1, className: C3, subject: 'Anh', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 4, session: 'morning', period: 1, className: C4, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 4, session: 'morning', period: 1, className: C5, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 4, session: 'morning', period: 1, className: C6, subject: 'Toán', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 4, session: 'morning', period: 1, className: C7, subject: 'Toán', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 4, session: 'morning', period: 1, className: C8, subject: 'Sử', teacherShortName: 'C.Lợi' },
  // Sáng - Tiết 2
  { dayOfWeek: 4, session: 'morning', period: 2, className: C1, subject: 'KHTN (Hóa)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 4, session: 'morning', period: 2, className: C2, subject: 'Tin', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 4, session: 'morning', period: 2, className: C3, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 4, session: 'morning', period: 2, className: C4, subject: 'GDCD', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 4, session: 'morning', period: 2, className: C5, subject: 'Văn', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 4, session: 'morning', period: 2, className: C6, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 4, session: 'morning', period: 2, className: C7, subject: 'Toán', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 4, session: 'morning', period: 2, className: C8, subject: 'Anh', teacherShortName: 'C.Duyên' },
  // Sáng - Tiết 3
  { dayOfWeek: 4, session: 'morning', period: 3, className: C1, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 4, session: 'morning', period: 3, className: C2, subject: 'GDCD', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 4, session: 'morning', period: 3, className: C3, subject: 'KHTN (Sinh)', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 4, session: 'morning', period: 3, className: C4, subject: 'KHTN (Lý)', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 4, session: 'morning', period: 3, className: C5, subject: 'Sử', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 4, session: 'morning', period: 3, className: C6, subject: 'Văn', teacherShortName: 'C.Trang' },
  { dayOfWeek: 4, session: 'morning', period: 3, className: C7, subject: 'Anh', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 4, session: 'morning', period: 3, className: C8, subject: 'Văn', teacherShortName: 'C.Quý' },
  // Sáng - Tiết 4
  { dayOfWeek: 4, session: 'morning', period: 4, className: C1, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 4, session: 'morning', period: 4, className: C2, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 4, session: 'morning', period: 4, className: C3, subject: 'KHTN (Lý)', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 4, session: 'morning', period: 4, className: C4, subject: 'KHTN (Sinh)', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 4, session: 'morning', period: 4, className: C5, subject: 'KHTN (Sinh)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 4, session: 'morning', period: 4, className: C6, subject: 'Văn', teacherShortName: 'C.Trang' },
  { dayOfWeek: 4, session: 'morning', period: 4, className: C7, subject: 'Sử', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 4, session: 'morning', period: 4, className: C8, subject: 'Toán', teacherShortName: 'C.Thắm' },
  // Sáng - Tiết 5
  { dayOfWeek: 4, session: 'morning', period: 5, className: C1, subject: 'GDCD', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 4, session: 'morning', period: 5, className: C2, subject: 'KHTN (Hóa)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 4, session: 'morning', period: 5, className: C3, subject: 'KHTN (Hóa)', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 4, session: 'morning', period: 5, className: C4, subject: 'Anh', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 4, session: 'morning', period: 5, className: C5, subject: 'KHTN (Lý)', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 4, session: 'morning', period: 5, className: C6, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 4, session: 'morning', period: 5, className: C7, subject: 'Văn', teacherShortName: 'C.Quý' },
  { dayOfWeek: 4, session: 'morning', period: 5, className: C8, subject: 'ÂN', teacherShortName: 'C.Trang' },

  // Chiều Thứ 4 - Tiết 1
  { dayOfWeek: 4, session: 'afternoon', period: 1, className: C1, subject: 'GDĐP', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 4, session: 'afternoon', period: 1, className: C2, subject: 'HĐTN', teacherShortName: 'C.Anh' },
  { dayOfWeek: 4, session: 'afternoon', period: 1, className: C3, subject: 'GDCD', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 4, session: 'afternoon', period: 1, className: C4, subject: 'Sử', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 4, session: 'afternoon', period: 1, className: C5, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 4, session: 'afternoon', period: 1, className: C6, subject: 'Tin', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 4, session: 'afternoon', period: 1, className: C7, subject: 'ÂN', teacherShortName: 'C.Trang' },
  { dayOfWeek: 4, session: 'afternoon', period: 1, className: C8, subject: 'KHTN (Hóa)', teacherShortName: 'C.Hạnh' },
  // Chiều Thứ 4 - Tiết 2
  { dayOfWeek: 4, session: 'afternoon', period: 2, className: C1, subject: 'ÂN', teacherShortName: 'C.Trang' },
  { dayOfWeek: 4, session: 'afternoon', period: 2, className: C2, subject: 'GDĐP', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 4, session: 'afternoon', period: 2, className: C3, subject: 'Sử', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 4, session: 'afternoon', period: 2, className: C4, subject: 'HĐTN', teacherShortName: 'C.Anh' },
  { dayOfWeek: 4, session: 'afternoon', period: 2, className: C5, subject: 'Tin', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 4, session: 'afternoon', period: 2, className: C6, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 4, session: 'afternoon', period: 2, className: C7, subject: 'KHTN (Hóa)', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 4, session: 'afternoon', period: 2, className: C8, subject: 'GDĐP', teacherShortName: 'C.Hoà' },

  // ==================== THỨ 5 (dayOfWeek: 5) ====================
  // Sáng - Tiết 1
  { dayOfWeek: 5, session: 'morning', period: 1, className: C1, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 5, session: 'morning', period: 1, className: C2, subject: 'Văn', teacherShortName: 'C.Quý' },
  { dayOfWeek: 5, session: 'morning', period: 1, className: C3, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 5, session: 'morning', period: 1, className: C4, subject: 'Văn', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 5, session: 'morning', period: 1, className: C5, subject: 'ÂN', teacherShortName: 'C.Trang' },
  { dayOfWeek: 5, session: 'morning', period: 1, className: C6, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 5, session: 'morning', period: 1, className: C7, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 5, session: 'morning', period: 1, className: C8, subject: 'Tin', teacherShortName: 'C.Thắm' },
  // Sáng - Tiết 2
  { dayOfWeek: 5, session: 'morning', period: 2, className: C1, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 5, session: 'morning', period: 2, className: C2, subject: 'Văn', teacherShortName: 'C.Quý' },
  { dayOfWeek: 5, session: 'morning', period: 2, className: C3, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 5, session: 'morning', period: 2, className: C4, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 5, session: 'morning', period: 2, className: C5, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 5, session: 'morning', period: 2, className: C6, subject: 'MT', teacherShortName: 'C.Hiền' },
  { dayOfWeek: 5, session: 'morning', period: 2, className: C7, subject: 'Toán', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 5, session: 'morning', period: 2, className: C8, subject: 'KHTN (Lý)', teacherShortName: 'T.Sơn' },
  // Sáng - Tiết 3
  { dayOfWeek: 5, session: 'morning', period: 3, className: C1, subject: 'KHTN (Sinh)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 5, session: 'morning', period: 3, className: C2, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 5, session: 'morning', period: 3, className: C3, subject: 'Toán', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 5, session: 'morning', period: 3, className: C4, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 5, session: 'morning', period: 3, className: C5, subject: 'MT', teacherShortName: 'C.Hiền' },
  { dayOfWeek: 5, session: 'morning', period: 3, className: C6, subject: 'Văn', teacherShortName: 'C.Trang' },
  { dayOfWeek: 5, session: 'morning', period: 3, className: C7, subject: 'KHTN (Lý)', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 5, session: 'morning', period: 3, className: C8, subject: 'Sử', teacherShortName: 'C.Lợi' },
  // Sáng - Tiết 4
  { dayOfWeek: 5, session: 'morning', period: 4, className: C1, subject: 'KHTN (Lý)', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 5, session: 'morning', period: 4, className: C2, subject: 'KHTN (Sinh)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 5, session: 'morning', period: 4, className: C3, subject: 'Văn', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 5, session: 'morning', period: 4, className: C4, subject: 'MT', teacherShortName: 'C.Hiền' },
  { dayOfWeek: 5, session: 'morning', period: 4, className: C5, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 5, session: 'morning', period: 4, className: C6, subject: 'Văn', teacherShortName: 'C.Trang' },
  { dayOfWeek: 5, session: 'morning', period: 4, className: C7, subject: 'Anh', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 5, session: 'morning', period: 4, className: C8, subject: 'Địa', teacherShortName: 'C.Hằng' },
  // Sáng - Tiết 5
  { dayOfWeek: 5, session: 'morning', period: 5, className: C1, subject: 'Anh', teacherShortName: 'C.Hường' },
  { dayOfWeek: 5, session: 'morning', period: 5, className: C2, subject: 'KHTN (Lý)', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 5, session: 'morning', period: 5, className: C3, subject: 'MT', teacherShortName: 'C.Hiền' },
  { dayOfWeek: 5, session: 'morning', period: 5, className: C4, subject: 'ÂN', teacherShortName: 'C.Trang' },
  { dayOfWeek: 5, session: 'morning', period: 5, className: C5, subject: 'Toán', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 5, session: 'morning', period: 5, className: C6, subject: 'KHTN (Sinh)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 5, session: 'morning', period: 5, className: C7, subject: 'Tin', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 5, session: 'morning', period: 5, className: C8, subject: 'Anh', teacherShortName: 'C.Duyên' },

  // Chiều Thứ 5 - Tiết 1 & 2 (HĐTN)
  { dayOfWeek: 5, session: 'afternoon', period: 1, className: C5, subject: 'HĐTN', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 5, session: 'afternoon', period: 1, className: C6, subject: 'HĐTN', teacherShortName: 'C.Anh' },
  { dayOfWeek: 5, session: 'afternoon', period: 1, className: C7, subject: 'HĐTN', teacherShortName: 'C.Thủy' },
  { dayOfWeek: 5, session: 'afternoon', period: 2, className: C8, subject: 'HĐTN', teacherShortName: 'C.Thủy' },

  // ==================== THỨ 6 (dayOfWeek: 6) ====================
  // Sáng - Tiết 1
  { dayOfWeek: 6, session: 'morning', period: 1, className: C1, subject: 'GDTC', teacherShortName: 'C.Hoà' },
  { dayOfWeek: 6, session: 'morning', period: 1, className: C2, subject: 'MT', teacherShortName: 'C.Hiền' },
  { dayOfWeek: 6, session: 'morning', period: 1, className: C3, subject: 'Toán', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 6, session: 'morning', period: 1, className: C4, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 6, session: 'morning', period: 1, className: C5, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 6, session: 'morning', period: 1, className: C6, subject: 'ÂN', teacherShortName: 'C.Trang' },
  { dayOfWeek: 6, session: 'morning', period: 1, className: C7, subject: 'Sử', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 6, session: 'morning', period: 1, className: C8, subject: 'GDTC', teacherShortName: 'T.Thành' },
  // Sáng - Tiết 2
  { dayOfWeek: 6, session: 'morning', period: 2, className: C1, subject: 'MT', teacherShortName: 'C.Hiền' },
  { dayOfWeek: 6, session: 'morning', period: 2, className: C2, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 6, session: 'morning', period: 2, className: C3, subject: 'GDĐP', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 6, session: 'morning', period: 2, className: C4, subject: 'Toán', teacherShortName: 'T.Tuấn' },
  { dayOfWeek: 6, session: 'morning', period: 2, className: C5, subject: 'Toán', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 6, session: 'morning', period: 2, className: C6, subject: 'GDTC', teacherShortName: 'T.Thành' },
  { dayOfWeek: 6, session: 'morning', period: 2, className: C7, subject: 'Toán', teacherShortName: 'C.Thắm' },
  { dayOfWeek: 6, session: 'morning', period: 2, className: C8, subject: 'GDCD', teacherShortName: 'C.Hoà' },
  // Sáng - Tiết 3
  { dayOfWeek: 6, session: 'morning', period: 3, className: C1, subject: 'KHTN (Sinh)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 6, session: 'morning', period: 3, className: C2, subject: 'ÂN', teacherShortName: 'C.Trang' },
  { dayOfWeek: 6, session: 'morning', period: 3, className: C3, subject: 'Anh', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 6, session: 'morning', period: 3, className: C4, subject: 'GDĐP', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 6, session: 'morning', period: 3, className: C5, subject: 'Toán', teacherShortName: 'T.Sơn' },
  { dayOfWeek: 6, session: 'morning', period: 3, className: C6, subject: 'C.Nghệ', teacherShortName: 'C.Anh' },
  { dayOfWeek: 6, session: 'morning', period: 3, className: C7, subject: 'Văn', teacherShortName: 'C.Quý' },
  { dayOfWeek: 6, session: 'morning', period: 3, className: C8, subject: 'Toán', teacherShortName: 'C.Thắm' },
  // Sáng - Tiết 4
  { dayOfWeek: 6, session: 'morning', period: 4, className: C1, subject: 'Địa', teacherShortName: 'C.Hằng' },
  { dayOfWeek: 6, session: 'morning', period: 4, className: C2, subject: 'KHTN (Sinh)', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 6, session: 'morning', period: 4, className: C3, subject: 'ÂN', teacherShortName: 'C.Trang' },
  { dayOfWeek: 6, session: 'morning', period: 4, className: C4, subject: 'KHTN (Hóa)', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 6, session: 'morning', period: 4, className: C5, subject: 'Văn', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 6, session: 'morning', period: 4, className: C6, subject: 'Sử', teacherShortName: 'C.Lợi' },
  { dayOfWeek: 6, session: 'morning', period: 4, className: C7, subject: 'Văn', teacherShortName: 'C.Quý' },
  { dayOfWeek: 6, session: 'morning', period: 4, className: C8, subject: 'Toán', teacherShortName: 'C.Thắm' },
  // Sáng - Tiết 5
  { dayOfWeek: 6, session: 'morning', period: 5, className: C1, subject: 'HĐTN', teacherShortName: 'C.Phượng' },
  { dayOfWeek: 6, session: 'morning', period: 5, className: C2, subject: 'HĐTN', teacherShortName: 'C.Anh' },
  { dayOfWeek: 6, session: 'morning', period: 5, className: C3, subject: 'HĐTN', teacherShortName: 'C.Hạnh' },
  { dayOfWeek: 6, session: 'morning', period: 5, className: C4, subject: 'HĐTN', teacherShortName: 'C.Duyên' },
  { dayOfWeek: 6, session: 'morning', period: 5, className: C5, subject: 'HĐTN', teacherShortName: 'C.Khoa' },
  { dayOfWeek: 6, session: 'morning', period: 5, className: C6, subject: 'HĐTN', teacherShortName: 'C.Trang' },
  { dayOfWeek: 6, session: 'morning', period: 5, className: C7, subject: 'HĐTN', teacherShortName: 'C.Quý' },
  { dayOfWeek: 6, session: 'morning', period: 5, className: C8, subject: 'HĐTN', teacherShortName: 'C.Hằng' },
];

export const INITIAL_TIMETABLE_VERSIONS: TimetableVersion[] = [
  {
    id: 'tkb-v1',
    title: 'TKB số 1: Áp dụng từ Tuần 01 (Bắt đầu từ 07/9/2026)',
    effectiveDate: '07/09/2026',
    effectiveFromWeek: 1,
    effectiveToWeek: undefined,
    schoolYear: '2026 - 2027',
    schoolName: 'Trường THCS Đồng Phú - Phân hiệu Hải Thành',
    slots: initialSlots,
    note: 'Thời khóa biểu chính thức HK I năm học 2026 - 2027 phân hiệu Hải Thành',
  },
];

export const INITIAL_TIMETABLE: TimetableData = {
  id: 'tkb-v1',
  title: 'TKB số 1: Áp dụng từ Tuần 01 (Bắt đầu từ 07/9/2026)',
  effectiveDate: '07/09/2026',
  effectiveFromWeek: 1,
  schoolYear: '2026 - 2027',
  schoolName: 'Trường THCS Đồng Phú - Phân hiệu Hải Thành',
  slots: initialSlots,
};

// PPCT Plans - full standard GDPT 2018 for THCS Đồng Phú (all subjects across grades 6, 7, 8, 9)
export const INITIAL_PPCT_PLANS: PPCTPlan[] = FULL_STANDARD_PPCT_PLANS;

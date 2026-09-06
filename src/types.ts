export interface Teacher {
  id: string;
  name: string;
  shortName: string;
  subject: string;
  department: string;
  email?: string;
  role?: string;
  homeroom?: string;
  totalPeriods?: number;
}

export interface TimetableSlot {
  dayOfWeek: number; // 2 (Thứ 2) to 7 (Thứ 7)
  session: 'morning' | 'afternoon'; // Sáng / Chiều
  period: number; // 1 to 5 (Sáng), 6 to 10 (Chiều)
  className: string; // 6/1, 6/2, 7/1, 7/2, 8/1, 8/2, 9/1, 9/2...
  subject: string; // Toán, KHTN, Ngữ Văn, Tiếng Anh...
  teacherShortName: string; // Thắm, Tuấn, Hạnh, Duyên...
  room?: string;
}

export interface TimetableData {
  id?: string;
  title: string; // Lần 8 - TUẦN 16
  effectiveDate: string; // 22/12/2025
  effectiveFromWeek?: number; // Áp dụng từ Tuần (VD: 16)
  effectiveToWeek?: number; // Áp dụng đến Tuần (VD: 35)
  schoolYear: string; // 2026-2027
  schoolName: string; // Trường THCS Đồng Phú
  slots: TimetableSlot[];
  createdAt?: string;
  note?: string;
}

export interface TimetableVersion {
  id: string;
  title: string; // Tên đợt TKB (VD: TKB Số 1 - Lần 7, TKB Số 2 - Lần 8)
  effectiveDate: string; // 22/12/2025
  effectiveFromWeek: number; // Áp dụng từ tuần (VD: 1, 16)
  effectiveToWeek?: number; // Áp dụng đến tuần (VD: 15, hoặc để trống)
  schoolYear?: string; // 2026-2027
  schoolName?: string; // Trường THCS Đồng Phú
  slots: TimetableSlot[];
  createdAt?: string;
  note?: string;
}

export interface PPCTItem {
  id: string;
  orderNumber: number; // TT (1, 2, 3...)
  chapter?: string; // Tên chương/Chủ đề (ví dụ: CHƯƠNG I. PHƯƠNG TRÌNH VÀ HỆ HAI PHƯƠNG TRÌNH...)
  lessonTitle: string; // Tên chủ đề/Bài học (1)
  periodCount: number; // Số tiết (2)
  timeFrame: string; // Thời điểm thực hiện: Tuần 1, Tuần 1,2... (3)
  equipment: string; // Thiết bị dạy học (4)
  notes: string; // YCCĐ năng lực số / Ghi chú / Phòng học (5)
}

export interface PPCTPlan {
  id: string;
  subject: string; // Toán
  grade: number; // 6, 7, 8, 9
  schoolYear: string; // 2026-2027
  totalPeriods: number; // 140
  term1Periods: number; // 72 (18 tuần x 4 tiết)
  term2Periods: number; // 68 (17 tuần x 4 tiết)
  items: PPCTItem[];
}

export interface LessonReportRow {
  id: string;
  dayOfWeek: number; // 2 (Hai), 3 (Ba), 4 (Tư), 5 (Năm), 6 (Sáu), 7 (Bảy)
  dayName: string; // Hai, Ba, Tư, Năm, Sáu, Bảy
  dateString: string; // 22/12/2025
  session: 'morning' | 'afternoon'; // Sáng / Chiều
  periodTKB: number; // Tiết theo TKB (1-10)
  subject: string; // Môn
  className: string; // Lớp (vd: 8/1)
  ppctPeriodNumber: number | string; // Tiết thứ theo PPCT (vd: 28)
  lessonName: string; // Tên bài dạy (vd: Bài 1: Đơn thức)
  equipment: string; // Thiết bị dạy học (vd: Thước thẳng, máy chiếu)
  notes: string; // Ghi chú (vd: Tiết bù, KT 15p, Phòng học...)
}

export interface WeeklyReportConfig {
  weekNumber: number; // Tuần 16
  startDate: string; // 2025-12-22
  endDate: string; // 2025-12-27
  teacherName: string; // Nguyễn Thị Thắm
  teacherShortName: string; // Thắm
  subject: string; // Toán 8, Toán 9
  department: string; // Toán - Tin
  schoolName: string; // TRƯỜNG THCS ĐỒNG PHÚ
  schoolYear: string; // 2026 - 2027
  notesHeader?: string;
}

export interface WeekTemplateCustomization {
  dayOfWeek: number; // 2..7
  session: 'morning' | 'afternoon';
  periodTKB: number; // 1..10
  className: string;
  subject: string;
  equipment?: string;
  notes?: string;
  customLessonName?: string;
}

export interface WeekTemplate {
  id: string;
  name: string;
  description?: string;
  teacherShortName?: string;
  createdAt: string;
  sourceWeek?: number;
  customizations: WeekTemplateCustomization[];
  isDefaultPreset?: boolean;
}

export type DeviceMode = 'desktop' | 'mobile';


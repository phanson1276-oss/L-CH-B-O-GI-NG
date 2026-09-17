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
  orderNumber: number; // Cột 1: STT / TT (1, 2, 3...)
  ppctPeriod?: string; // Cột 2: Tiết theo PPCT (ví dụ: "1, 2" hoặc "3, 4, 5")
  chapter?: string; // Tên chương/Chủ đề lớn
  semester?: 1 | 2; // Học kỳ I hoặc Học kỳ II
  lessonTitle: string; // Cột 3: Tên bài học / Chủ đề / Hoạt động
  periodCount: number; // Cột 4: Số tiết
  objectives?: string; // Cột 5: Yêu cầu cần đạt (YCCĐ)
  digitalAndAiCompetencies?: string; // Cột 6: Năng lực số và AI (NLS & AI)
  timeFrame?: string; // Thời điểm thực hiện: Tuần 1, Tuần 1,2...
  equipment?: string; // Thiết bị dạy học
  notes?: string; // Ghi chú bổ sung
  isAssessment?: boolean; // Đánh dấu Kiểm tra giữa kì / Cuối kì
}

export interface PPCTPlan {
  id: string;
  subject: string; // Toán, Khoa học tự nhiên (KHTN), Ngữ văn...
  grade: number; // 6, 7, 8, 9
  schoolYear: string; // 2026 - 2027
  legalBasis?: string; // Theo CV 5512/BGDĐT-GDTrH và CV 5636/BGDĐT-GDTrH
  governingBody?: string; // UBND Phường Đồng Hới – Trường THCS Đồng Phú
  totalWeeks?: number; // 35 tuần
  totalPeriods: number; // Tổng số tiết cả năm
  term1Weeks?: number; // 18 tuần
  term1PeriodsPerWeek?: number; // Số tiết/tuần HK1
  term1Periods: number; // Tổng tiết HK1
  term2Weeks?: number; // 17 tuần
  term2PeriodsPerWeek?: number; // Số tiết/tuần HK2
  term2Periods: number; // Tổng tiết HK2
  approvalLocationDate?: string; // Đồng Hới, ngày 04 tháng 9 năm 2026
  headmasterName?: string; // Ban Giám hiệu / Hiệu trưởng
  headOfDepartmentName?: string; // Tổ trưởng chuyên môn
  teacherName?: string; // Giáo viên thực hiện
  items: PPCTItem[];
}

export interface LessonReportRow {
  id: string;
  dayOfWeek: number; // 2 (Hai), 3 (Ba), 4 (Tư), 5 (Năm), 6 (Sáu), 7 (Bảy)
  dayName: string; // Hai, Ba, Tư, Năm, Sáu, Bảy
  dateString: string; // 14/09/2026 or 14/9
  dayDateDisplay?: string; // Thứ 2 – 14/9
  dayLabel?: string; // Thứ 2
  dateLabel?: string; // 14/9
  session: 'morning' | 'afternoon'; // Sáng / Chiều
  periodTKB: number; // Tiết theo TKB (1-10)
  subject: string; // Môn
  className: string; // Lớp (vd: 7.1)
  ppctPeriodNumber: number | string; // Tiết thứ theo phân phối chương trình (vd: 5)
  lessonName: string; // Tên bài dạy
  equipment?: string; // Thiết bị dạy học (tùy chọn)
  notes: string; // Ghi chú
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


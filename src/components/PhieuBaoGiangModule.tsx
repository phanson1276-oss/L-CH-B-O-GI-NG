import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Check,
  User,
  Calendar,
  Sparkles,
  Building,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Users,
  Tag,
  X,
  MessageSquarePlus,
  Bookmark,
  Copy,
  Layers,
  Clock,
  Smartphone,
  Monitor,
  Home,
  AlertTriangle,
  RotateCcw,
  Info,
  SlidersHorizontal,
  TableProperties,
  Activity,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  LessonReportRow,
  TimetableData,
  PPCTPlan,
  WeeklyReportConfig,
  Teacher,
  WeekTemplate,
  TimetableVersion,
  DeviceMode,
} from '../types';
import { TEACHERS_LIST, SCHOOL_INFO } from '../data/mockData';
import {
  generateWeeklyReport,
  getWeekDates,
  computeReportRowSpans,
  sortReportRows,
  getTimetableForWeek,
  formatDayDateDisplay,
  formatDayDateParts,
  normalizeSubjectName,
  getGradeFromClassName,
  isValidLessonTitle,
} from '../utils/generator';
import { getAcademicWeekDates, getTodaySystemInfo } from '../utils/academicCalendar';
import { exportLessonReportToExcel } from '../utils/excelExporter';
import { exportLessonReportToWord } from '../utils/wordExport';
import { exportLessonReportToDocx, exportAllTeachersReportsToDocx } from '../utils/docxExport';
import { exportLessonReportToPdf } from '../utils/pdfExport';
import { WeekTemplateModal } from './WeekTemplateModal';
import { PhieuBaoGiangMobileView } from './PhieuBaoGiangMobileView';

const QUICK_NOTE_OPTIONS = [
  { label: 'Dạy bù', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { label: 'KT 15 phút', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { label: 'KT giữa kì', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { label: 'KT cuối kì', color: 'bg-red-100 text-red-800 border-red-300' },
  { label: 'Tiết thực hành', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { label: 'Học phòng Tin học', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { label: 'Học phòng Ngoại ngữ', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { label: 'Dự giờ / Thao giảng', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { label: 'Dạy thay', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { label: 'Tiết ôn tập', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { label: 'Nghỉ lễ', color: 'bg-slate-200 text-slate-800 border-slate-400' },
];

interface PhieuBaoGiangModuleProps {
  timetable: TimetableData;
  ppctPlans: PPCTPlan[];
  selectedTeacherShortName: string;
  setSelectedTeacherShortName: (shortName: string) => void;
  selectedWeek: number;
  setSelectedWeek: (w: number) => void;
  teachers?: Teacher[];
  onOpenUploadTeacherModal?: () => void;
  onOpenTeacherManagerModal?: () => void;
  timetableVersions?: TimetableVersion[];
  deviceMode?: DeviceMode;
  setDeviceMode?: (mode: DeviceMode) => void;
  onGoHome?: () => void;
}

/**
 * Types for Diagnostic validation of the combined data source (PPCT + TKB)
 */
export interface DiagnosticIssue {
  type: 'EMPTY_MANDATORY_FIELD' | 'PPCT_COLLISION' | 'PLAN_NOT_FOUND' | 'GRADE_MISMATCH' | 'INVALID_LESSON_TITLE';
  severity: 'error' | 'warning';
  field?: 'Tiết PPCT' | 'Tiết theo TKB' | 'Môn' | 'Lớp' | 'Tên bài dạy';
  rowId?: string;
  dayOfWeek?: number;
  periodTKB?: number;
  className?: string;
  subject?: string;
  message: string;
  details?: Record<string, any>;
}

export interface DiagnosticReport {
  isValid: boolean;
  totalCheckedRows: number;
  emptyMandatoryCount: number;
  collisionCount: number;
  totalIssuesCount: number;
  issues: DiagnosticIssue[];
  warnings: string[];
}

/**
 * Diagnostic utility function in PhieuBaoGiangModule that checks if the combined
 * data source (PPCT + TKB) contains empty values for mandatory fields like
 * 'Tiết PPCT' or 'Tiết theo TKB', and logs a warning if a collision between subject
 * names and PPCT plans is detected.
 *
 * @param rows The combined report rows (LessonReportRow[]) generated from TKB + PPCT
 * @param timetable The active timetable data containing slots
 * @param ppctPlans The loaded PPCT plans library
 * @param options Optional context information (teacher, week, silent logging toggle)
 * @returns DiagnosticReport containing status, issue lists, and logged warnings
 */
export function diagnoseCombinedReportData(
  rows: LessonReportRow[],
  timetable?: TimetableData | null,
  ppctPlans?: PPCTPlan[] | null,
  options?: {
    teacherShortName?: string;
    weekNumber?: number;
    silentConsole?: boolean;
  }
): DiagnosticReport {
  const issues: DiagnosticIssue[] = [];
  const warnings: string[] = [];

  const logWarn = (msg: string, issue: DiagnosticIssue) => {
    if (!options?.silentConsole) {
      console.warn(msg);
    }
    warnings.push(msg);
    issues.push(issue);
  };

  // 1. Check for collisions inside the PPCT plans library (duplicate/ambiguous plans for the same grade & subject)
  if (ppctPlans && ppctPlans.length > 0) {
    const plansByGradeSubj = new Map<string, PPCTPlan[]>();
    for (const plan of ppctPlans) {
      const normSubj = normalizeSubjectName(plan.subject);
      const key = `${plan.grade}_${normSubj}`;
      if (!plansByGradeSubj.has(key)) {
        plansByGradeSubj.set(key, []);
      }
      plansByGradeSubj.get(key)!.push(plan);
    }

    plansByGradeSubj.forEach((plans, key) => {
      if (plans.length > 1) {
        const [gradeStr, ...subjParts] = key.split('_');
        const subj = subjParts.join('_');
        const planTitles = plans.map((p) => `"${p.subject}" (id: ${p.id})`).join(', ');
        logWarn(
          `[Cảnh báo Báo giảng] Xung đột danh mục PPCT (Collision): Phát hiện ${plans.length} kế hoạch PPCT cùng thuộc Khối ${gradeStr} cho môn "${subj}": [${planTitles}]. Hệ thống có thể chọn nhầm nội dung khi đối chiếu TKB.`,
          {
            type: 'PPCT_COLLISION',
            severity: 'warning',
            subject: subj,
            className: `Khối ${gradeStr}`,
            message: `Xung đột danh mục PPCT: ${plans.length} kế hoạch cùng thuộc Khối ${gradeStr} môn "${subj}" [${planTitles}].`,
            details: { grade: gradeStr, subject: subj, plans: plans.map((p) => ({ id: p.id, subject: p.subject })) },
          }
        );
      }
    });
  }

  // 2. Track distinct subject-grade combinations to verify collisions against PPCT plans
  const checkedSubjectCollisions = new Set<string>();

  // 3. Inspect every row in the combined data source (PPCT + TKB)
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowDesc = `Thứ ${row.dayOfWeek || '?'}, Tiết TKB: ${row.periodTKB ?? '?'}, Lớp: ${row.className || '?'}, Môn: "${row.subject || '?'}"`;

    // 3a. Mandatory field check: 'Tiết theo TKB'
    const isPeriodTkbEmpty =
      row.periodTKB === undefined ||
      row.periodTKB === null ||
      row.periodTKB === 0 ||
      isNaN(Number(row.periodTKB)) ||
      String(row.periodTKB).trim() === '';

    if (isPeriodTkbEmpty) {
      logWarn(
        `[Cảnh báo Báo giảng] Dữ liệu thiếu trường bắt buộc "Tiết theo TKB" tại dòng #${idx + 1} (${rowDesc}).`,
        {
          type: 'EMPTY_MANDATORY_FIELD',
          severity: 'error',
          field: 'Tiết theo TKB',
          rowId: row.id,
          dayOfWeek: row.dayOfWeek,
          periodTKB: row.periodTKB,
          className: row.className,
          subject: row.subject,
          message: `Trường bắt buộc "Tiết theo TKB" bị rỗng hoặc không hợp lệ tại dòng #${idx + 1} (${rowDesc}).`,
        }
      );
    }

    // 3b. Mandatory field check: 'Tiết PPCT'
    const isPpctEmpty =
      row.ppctPeriodNumber === undefined ||
      row.ppctPeriodNumber === null ||
      String(row.ppctPeriodNumber).trim() === '' ||
      row.ppctPeriodNumber === 0 ||
      (typeof row.ppctPeriodNumber === 'number' && isNaN(row.ppctPeriodNumber));

    if (isPpctEmpty) {
      logWarn(
        `[Cảnh báo Báo giảng] Dữ liệu thiếu trường bắt buộc "Tiết PPCT" tại dòng #${idx + 1} (${rowDesc}).`,
        {
          type: 'EMPTY_MANDATORY_FIELD',
          severity: 'error',
          field: 'Tiết PPCT',
          rowId: row.id,
          dayOfWeek: row.dayOfWeek,
          periodTKB: row.periodTKB,
          className: row.className,
          subject: row.subject,
          message: `Trường bắt buộc "Tiết PPCT" bị rỗng hoặc không hợp lệ tại dòng #${idx + 1} (${rowDesc}).`,
        }
      );
    }

    // 3c. Mandatory field check: 'Lớp'
    if (!row.className || !row.className.trim()) {
      logWarn(
        `[Cảnh báo Báo giảng] Dữ liệu thiếu trường bắt buộc "Lớp" tại dòng #${idx + 1} (Thứ ${row.dayOfWeek}, Tiết ${row.periodTKB}).`,
        {
          type: 'EMPTY_MANDATORY_FIELD',
          severity: 'error',
          field: 'Lớp',
          rowId: row.id,
          dayOfWeek: row.dayOfWeek,
          periodTKB: row.periodTKB,
          message: `Trường bắt buộc "Lớp" bị rỗng tại dòng #${idx + 1}.`,
        }
      );
    }

    // 3d. Mandatory field check: 'Môn'
    if (!row.subject || !row.subject.trim()) {
      logWarn(
        `[Cảnh báo Báo giảng] Dữ liệu thiếu trường bắt buộc "Môn" tại dòng #${idx + 1} (Lớp ${row.className}, Tiết ${row.periodTKB}).`,
        {
          type: 'EMPTY_MANDATORY_FIELD',
          severity: 'error',
          field: 'Môn',
          rowId: row.id,
          dayOfWeek: row.dayOfWeek,
          periodTKB: row.periodTKB,
          className: row.className,
          message: `Trường bắt buộc "Môn" bị rỗng tại dòng #${idx + 1}.`,
        }
      );
    }

    // 3e. Mandatory field check: 'Tên bài dạy'
    if (!row.lessonName || !row.lessonName.trim() || row.lessonName.includes('Chưa có tên bài')) {
      logWarn(
        `[Cảnh báo Báo giảng] "Tên bài dạy" bị rỗng hoặc chưa liên kết nội dung bài dạy tại dòng #${idx + 1} (${rowDesc}).`,
        {
          type: 'EMPTY_MANDATORY_FIELD',
          severity: 'warning',
          field: 'Tên bài dạy',
          rowId: row.id,
          dayOfWeek: row.dayOfWeek,
          periodTKB: row.periodTKB,
          className: row.className,
          subject: row.subject,
          message: `"Tên bài dạy" bị rỗng hoặc chưa liên kết nội dung bài học tại dòng #${idx + 1} (${rowDesc}).`,
        }
      );
    }

    // 3e-bis. Check for numeric or mangled lesson titles (e.g. "1, 2", "1-2", or fragment "của đơn thức Thu")
    const isMangledLessonTitle =
      !isValidLessonTitle(row.lessonName) ||
      row.lessonName === 'của đơn thức Thu' ||
      row.lessonName?.startsWith('của đơn thức');

    if (row.lessonName && isMangledLessonTitle) {
      logWarn(
        `[Cảnh báo Báo giảng] "Tên bài dạy" bị nhận dạng sai thành số tiết/tuần hoặc đoạn văn bản lỗi ("${row.lessonName}") tại dòng #${idx + 1} (${rowDesc}).`,
        {
          type: 'INVALID_LESSON_TITLE',
          severity: 'error',
          field: 'Tên bài dạy',
          rowId: row.id,
          dayOfWeek: row.dayOfWeek,
          periodTKB: row.periodTKB,
          className: row.className,
          subject: row.subject,
          message: `"Tên bài dạy" đang hiển thị cột số hoặc đoạn văn bản lỗi ("${row.lessonName}") tại dòng #${idx + 1} (${rowDesc}).`,
        }
      );
    }

    // 3f. Collision check between subject name in row and PPCT plans
    if (ppctPlans && ppctPlans.length > 0 && row.subject && row.className) {
      const grade = getGradeFromClassName(row.className);
      const normalizedSubj = normalizeSubjectName(row.subject);
      const collisionKey = `${grade}_${normalizedSubj}`;

      if (!checkedSubjectCollisions.has(collisionKey)) {
        checkedSubjectCollisions.add(collisionKey);

        // Find plans matching this grade and subject (prioritizing exact normalized matches)
        const exactGradePlans = ppctPlans.filter(
          (p) => p.grade === grade && normalizeSubjectName(p.subject) === normalizedSubj
        );
        const matchingPlansForGrade =
          exactGradePlans.length > 0
            ? exactGradePlans
            : ppctPlans.filter((p) => {
                if (p.grade !== grade) return false;
                const pNorm = normalizeSubjectName(p.subject);
                return (
                  pNorm === normalizedSubj ||
                  p.subject.toLowerCase().includes(normalizedSubj.toLowerCase()) ||
                  normalizedSubj.toLowerCase().includes(p.subject.toLowerCase())
                );
              });

        // Detect collision: multiple matching plans for the same grade & subject
        if (matchingPlansForGrade.length > 1) {
          const planListStr = matchingPlansForGrade
            .map((p) => `"${p.subject}" (ID: ${p.id}, ${p.totalPeriods} tiết)`)
            .join(' vs ');
          logWarn(
            `[Cảnh báo Báo giảng] Xung đột môn học & Kế hoạch PPCT (Collision Detected): Môn "${row.subject}" khối ${grade} (lớp ${row.className}) khớp đồng thời với ${matchingPlansForGrade.length} kế hoạch PPCT: [${planListStr}]. Cần chuẩn hóa tên môn để tránh gán sai bài dạy.`,
            {
              type: 'PPCT_COLLISION',
              severity: 'warning',
              className: row.className,
              subject: row.subject,
              message: `Xung đột PPCT: Môn "${row.subject}" khối ${grade} khớp đồng thời với ${matchingPlansForGrade.length} kế hoạch [${planListStr}].`,
              details: {
                grade,
                subject: row.subject,
                matchingPlans: matchingPlansForGrade.map((p) => ({ id: p.id, subject: p.subject })),
              },
            }
          );
        } else if (matchingPlansForGrade.length === 0) {
          // Check if subject exists in other grades (Grade mismatch collision)
          const otherGradeExact = ppctPlans.filter(
            (p) => normalizeSubjectName(p.subject) === normalizedSubj
          );
          const otherGradeMatches =
            otherGradeExact.length > 0
              ? otherGradeExact
              : ppctPlans.filter((p) => {
                  const pNorm = normalizeSubjectName(p.subject);
                  return (
                    pNorm === normalizedSubj ||
                    p.subject.toLowerCase().includes(normalizedSubj.toLowerCase()) ||
                    normalizedSubj.toLowerCase().includes(p.subject.toLowerCase())
                  );
                });

          if (otherGradeMatches.length > 0) {
            const gradesFound = Array.from(new Set(otherGradeMatches.map((p) => `Khối ${p.grade}`))).join(', ');
            logWarn(
              `[Cảnh báo Báo giảng] Xung đột khối lớp (Grade Mismatch Collision): Môn "${row.subject}" lớp ${row.className} (Khối ${grade}) không tìm thấy PPCT Khối ${grade}, nhưng hệ thống phát hiện có PPCT của ${gradesFound}. Đang phải dùng kế hoạch dự phòng!`,
              {
                type: 'GRADE_MISMATCH',
                severity: 'warning',
                className: row.className,
                subject: row.subject,
                message: `Lệch khối PPCT: Môn "${row.subject}" lớp ${row.className} (Khối ${grade}) thiếu PPCT chuẩn, chỉ có PPCT của ${gradesFound}.`,
                details: {
                  grade,
                  subject: row.subject,
                  availableGrades: gradesFound,
                },
              }
            );
          } else {
            logWarn(
              `[Cảnh báo Báo giảng] Thiếu PPCT: Không tìm thấy bất kỳ kế hoạch PPCT nào cho môn "${row.subject}" lớp ${row.className} (Khối ${grade}).`,
              {
                type: 'PLAN_NOT_FOUND',
                severity: 'warning',
                className: row.className,
                subject: row.subject,
                message: `Không tìm thấy PPCT phù hợp cho môn "${row.subject}" khối ${grade}.`,
              }
            );
          }
        }
      }
    }
  }

  const emptyMandatoryCount = issues.filter(
    (i) =>
      i.type === 'EMPTY_MANDATORY_FIELD' &&
      (i.field === 'Tiết PPCT' || i.field === 'Tiết theo TKB')
  ).length;

  const collisionCount = issues.filter(
    (i) => i.type === 'PPCT_COLLISION' || i.type === 'GRADE_MISMATCH'
  ).length;

  return {
    isValid: issues.length === 0,
    totalCheckedRows: rows.length,
    emptyMandatoryCount,
    collisionCount,
    totalIssuesCount: issues.length,
    issues,
    warnings,
  };
}

// Export aliases
export const checkCombinedDataSourceDiagnostics = diagnoseCombinedReportData;
export const diagnosePhieuBaoGiangData = diagnoseCombinedReportData;

export const PhieuBaoGiangModule: React.FC<PhieuBaoGiangModuleProps> = ({
  timetable,
  ppctPlans,
  selectedTeacherShortName,
  setSelectedTeacherShortName,
  selectedWeek,
  setSelectedWeek,
  teachers = TEACHERS_LIST,
  onOpenUploadTeacherModal,
  onOpenTeacherManagerModal,
  timetableVersions,
  deviceMode = 'desktop',
  setDeviceMode,
  onGoHome,
}) => {
  // Find current teacher object
  const currentTeacher: Teacher = useMemo(() => {
    const found = teachers?.find(
      (t) => t.shortName.toLowerCase() === selectedTeacherShortName.toLowerCase()
    );
    if (found) return found;
    if (teachers && teachers.length > 0) return teachers[0];
    if (TEACHERS_LIST && TEACHERS_LIST.length > 0) return TEACHERS_LIST[0];
    return {
      id: 'gv-default',
      name: selectedTeacherShortName || 'Giáo viên',
      shortName: selectedTeacherShortName || 'GV',
      subject: 'Toán',
      department: 'Tổ Toán - KHTN',
    };
  }, [teachers, selectedTeacherShortName]);

  // Current teacher index for prev/next cycling
  const currentTeacherIndex = useMemo(() => {
    return teachers.findIndex(
      (t) => t.shortName.toLowerCase() === currentTeacher.shortName.toLowerCase()
    );
  }, [teachers, currentTeacher]);

  const handlePrevTeacher = () => {
    if (teachers.length <= 1) return;
    const prevIdx = (currentTeacherIndex - 1 + teachers.length) % teachers.length;
    setSelectedTeacherShortName(teachers[prevIdx].shortName);
  };

  const handleNextTeacher = () => {
    if (teachers.length <= 1) return;
    const nextIdx = (currentTeacherIndex + 1) % teachers.length;
    setSelectedTeacherShortName(teachers[nextIdx].shortName);
  };

  // Resolve active timetable version for the selected week
  const activeTimetable = useMemo(() => {
    if (timetableVersions && timetableVersions.length > 0) {
      return getTimetableForWeek(timetableVersions, selectedWeek) || timetable;
    }
    return timetable;
  }, [timetableVersions, selectedWeek, timetable]);

  // Calculate dynamic week dates from system academic calendar
  const academicWeekInfo = useMemo(() => getAcademicWeekDates(selectedWeek), [selectedWeek]);
  const startDateStr = academicWeekInfo.startDateStr;
  const endDateStr = academicWeekInfo.endDateStr;
  const weekDates = academicWeekInfo.dates;
  const systemInfo = useMemo(() => getTodaySystemInfo(), []);

  // Main report state
  const [reportRows, setReportRows] = useState<LessonReportRow[]>([]);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Table display mode: 'merged' (default: merges day & session cells for identical day + session) vs 'row-by-row'
  const [tableDisplayMode, setTableDisplayMode] = useState<'merged' | 'row-by-row'>('merged');

  // Diagnostic modal state
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);

  // Sorted report rows: Thứ ngày (2..7) -> Buổi (Sáng -> Chiều) -> Tiết theo TKB
  const sortedReportRows = useMemo(() => sortReportRows(reportRows), [reportRows]);

  // Run diagnostics on the combined data source (PPCT + TKB) and log warnings
  const diagnosticReport = useMemo(() => {
    return diagnoseCombinedReportData(
      sortedReportRows,
      activeTimetable,
      ppctPlans,
      {
        teacherShortName: currentTeacher.shortName,
        weekNumber: selectedWeek,
        silentConsole: false,
      }
    );
  }, [sortedReportRows, activeTimetable, ppctPlans, currentTeacher.shortName, selectedWeek]);

  // Compute merged rowSpans for day and session based strictly on (Cùng Thứ ngày + Cùng Buổi)
  const rowSpans = useMemo(() => computeReportRowSpans(sortedReportRows), [sortedReportRows]);

  // Report config
  const reportConfig: WeeklyReportConfig = {
    weekNumber: selectedWeek,
    startDate: startDateStr,
    endDate: endDateStr,
    teacherName: currentTeacher.name,
    teacherShortName: currentTeacher.shortName,
    subject: currentTeacher.subject,
    department: currentTeacher.department,
    schoolName: SCHOOL_INFO.name,
    schoolYear: SCHOOL_INFO.schoolYear,
  };

  // Re-generate report when teacher, week, timetable, or ppct changes
  const handleAutoGenerate = () => {
    const generated = generateWeeklyReport(
      currentTeacher.shortName,
      reportConfig,
      activeTimetable,
      ppctPlans
    );
    setReportRows(generated);
    showToast('Đã đối chiếu tự động TKB + Danh sách giáo viên + PPCT!');
  };

  useEffect(() => {
    const generated = generateWeeklyReport(
      currentTeacher.shortName,
      reportConfig,
      activeTimetable,
      ppctPlans
    );
    setReportRows(generated);
  }, [selectedTeacherShortName, selectedWeek, activeTimetable, ppctPlans]);

  // Reset or clear module content
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const handleClearModuleContent = () => {
    setReportRows([]);
    setIsConfirmClearOpen(false);
    showToast('Đã xóa trắng nội dung Lịch báo giảng của tuần này!', 'info');
  };

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<LessonReportRow | null>(null);

  // Form states for adding/editing a row
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(2);
  const [formDateString, setFormDateString] = useState<string>('');
  const [formSession, setFormSession] = useState<'morning' | 'afternoon'>('morning');
  const [formPeriodTKB, setFormPeriodTKB] = useState<number>(1);
  const [formSubject, setFormSubject] = useState<string>('KHTN');
  const [formClassName, setFormClassName] = useState<string>('7.1');
  const [formPpctPeriod, setFormPpctPeriod] = useState<number | string>(1);
  const [formLessonName, setFormLessonName] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const openAddModal = () => {
    setEditingRow(null);
    setFormDayOfWeek(2);
    setFormDateString(startDateStr);
    setFormSession('morning');
    setFormPeriodTKB(1);
    setFormSubject(currentTeacher.subject.split(' ')[0] || 'KHTN');
    setFormClassName('7.1');
    setFormPpctPeriod(1);
    setFormLessonName('Bài học bổ sung / Thao giảng');
    setFormNotes('');
    setIsEditModalOpen(true);
  };

  const openEditModal = (row: LessonReportRow) => {
    setEditingRow(row);
    setFormDayOfWeek(row.dayOfWeek);
    setFormDateString(row.dateString);
    setFormSession(row.session);
    setFormPeriodTKB(row.periodTKB);
    setFormSubject(row.subject);
    setFormClassName(row.className);
    setFormPpctPeriod(row.ppctPeriodNumber);
    setFormLessonName(row.lessonName);
    setFormNotes(row.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveModalForm = () => {
    const dayNames = ['', '', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
    const activeDateStr = formDateString || startDateStr;
    const calculatedDayDateDisplay = formatDayDateDisplay(
      formDayOfWeek,
      activeDateStr
    );
    const { dayLabel, dateLabel } = formatDayDateParts(
      formDayOfWeek,
      activeDateStr
    );

    if (editingRow) {
      setReportRows((prev) =>
        prev.map((r) =>
          r.id === editingRow.id
            ? {
                ...r,
                dayOfWeek: formDayOfWeek,
                dayName: dayNames[formDayOfWeek] || 'Hai',
                dateString: formDateString || r.dateString,
                dayDateDisplay: calculatedDayDateDisplay,
                dayLabel: dayLabel,
                dateLabel: dateLabel,
                session: formSession,
                periodTKB: Number(formPeriodTKB),
                subject: formSubject,
                className: formClassName,
                ppctPeriodNumber: formPpctPeriod,
                lessonName: formLessonName,
                notes: formNotes,
              }
            : r
        )
      );
      showToast('Đã cập nhật thông tin tiết dạy!');
    } else {
      const newRow: LessonReportRow = {
        id: `manual-row-${Date.now()}`,
        dayOfWeek: formDayOfWeek,
        dayName: dayNames[formDayOfWeek] || 'Hai',
        dateString: activeDateStr,
        dayDateDisplay: calculatedDayDateDisplay,
        dayLabel: dayLabel,
        dateLabel: dateLabel,
        session: formSession,
        periodTKB: Number(formPeriodTKB),
        subject: formSubject,
        className: formClassName,
        ppctPeriodNumber: formPpctPeriod,
        lessonName: formLessonName,
        equipment: '',
        notes: formNotes,
      };
      setReportRows((prev) => [...prev, newRow]);
      showToast('Đã thêm tiết dạy mới vào Lịch báo giảng!');
    }

    setIsEditModalOpen(false);
  };

  const handleDeleteRow = (rowId: string) => {
    setReportRows((prev) => prev.filter((r) => r.id !== rowId));
    showToast('Đã xóa tiết dạy khỏi lịch!', 'info');
  };

  // Quick note popover state
  const [activeQuickNoteRowId, setActiveQuickNoteRowId] = useState<string | null>(null);

  const handleApplyQuickNote = (rowId: string, noteText: string) => {
    setReportRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, notes: noteText } : r))
    );
    setActiveQuickNoteRowId(null);
    showToast(`Đã gán ghi chú: "${noteText}"`);
  };

  // Week Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const handleApplyTemplate = (
    template: WeekTemplate,
    mode: 'notes_equipment_only' | 'full'
  ) => {
    setReportRows((prevRows) => {
      return prevRows.map((row) => {
        let match = template.customizations.find(
          (c) =>
            c.dayOfWeek === row.dayOfWeek &&
            c.periodTKB === row.periodTKB &&
            c.className === row.className
        );

        if (!match) {
          match = template.customizations.find(
            (c) => c.className === row.className && c.subject === row.subject
          );
        }

        if (match) {
          return {
            ...row,
            notes: match.notes !== undefined && match.notes !== '' ? match.notes : row.notes,
            ...(mode === 'full' && match.customLessonName
              ? { lessonName: match.customLessonName }
              : {}),
          };
        }
        return row;
      });
    });
    showToast(`Đã áp dụng mẫu tuần "${template.name}"!`);
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setExportSuccess(message);
    setTimeout(() => setExportSuccess(null), 4000);
  };

  // Export handlers
  const handleExportExcel = () => {
    exportLessonReportToExcel(sortedReportRows, reportConfig);
    showToast('Đã xuất thành công tệp Excel (.xlsx) 8 cột chuẩn gộp ô Thứ ngày & Buổi!');
  };

  const handleExportWordHtml = () => {
    exportLessonReportToWord(sortedReportRows, reportConfig);
    showToast('Đã tải xuống tệp Word (.doc) 8 cột chuẩn gộp ô Thứ ngày & Buổi!');
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportLessonReportToDocx(sortedReportRows, reportConfig);
      showToast('Đã xuất thành công tệp Word (.docx) khổ A4 dọc 8 cột gộp ô chuẩn!');
    } catch (error) {
      console.error('Export error:', error);
      exportLessonReportToWord(sortedReportRows, reportConfig);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportAllDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportAllTeachersReportsToDocx(
        activeTimetable,
        ppctPlans,
        teachers,
        selectedWeek,
        SCHOOL_INFO
      );
      showToast(`Đã xuất hồ sơ Lịch báo giảng toàn trường (${teachers.length} GV)!`);
    } catch (error) {
      console.error('Export all error:', error);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handlePrintOrPdf = () => {
    exportLessonReportToPdf(sortedReportRows, reportConfig);
  };

  // Distinct classes and subjects in this week
  const classList = useMemo(() => {
    const set = new Set<string>();
    sortedReportRows.forEach((r) => set.add(r.className));
    return Array.from(set).sort();
  }, [sortedReportRows]);

  const morningCount = sortedReportRows.filter((r) => r.session === 'morning').length;
  const afternoonCount = sortedReportRows.filter((r) => r.session === 'afternoon').length;

  // Render mobile view if in mobile mode
  if (deviceMode === 'mobile') {
    return (
      <PhieuBaoGiangMobileView
        currentTeacher={currentTeacher}
        teachers={teachers}
        selectedTeacherShortName={selectedTeacherShortName}
        setSelectedTeacherShortName={setSelectedTeacherShortName}
        selectedWeek={selectedWeek}
        setSelectedWeek={setSelectedWeek}
        academicWeekInfo={academicWeekInfo}
        systemInfo={systemInfo}
        reportRows={sortedReportRows}
        activeTimetable={activeTimetable}
        onAutoGenerate={handleAutoGenerate}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        onAddManualRow={openAddModal}
        onStartEdit={openEditModal}
        onDeleteRow={handleDeleteRow}
        onExportExcel={handleExportExcel}
        onExportWord={handleExportDocx}
        onExportAllWord={handleExportAllDocx}
        onExportPdf={handlePrintOrPdf}
        onSwitchToDesktopView={() => setDeviceMode && setDeviceMode('desktop')}
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20" id="phieu-bao-giang-module">
      {/* Toast notification */}
      {exportSuccess && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white text-sm font-semibold rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Module Title Header - Compact Workspace Layout */}
      <div className="bg-white rounded-xl border border-slate-200/90 py-2.5 px-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-blue-700 text-white text-[11px] font-black px-2 py-0.5 rounded tracking-wider">
            MODULE 4
          </span>
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>TẠO LỊCH BÁO GIẢNG</span>
          </h1>
          <span className="text-xs text-slate-500 hidden md:inline">
            • AI đối chiếu tự động: <strong className="text-blue-700 font-semibold">PPCT</strong> + <strong className="text-blue-700 font-semibold">GV</strong> + <strong className="text-blue-700 font-semibold">TKB</strong>
          </span>
        </div>

        {/* Quick Nav / View Mode */}
        <div className="flex items-center gap-2 shrink-0">
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Về Trang chủ"
            >
              <Home className="w-3.5 h-3.5 text-slate-600" />
              <span>Trang chủ</span>
            </button>
          )}

          {setDeviceMode && (
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
              title="Chuyển sang giao diện Smartphone di động"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bản Di động</span>
            </button>
          )}
        </div>
      </div>

      {/* ĐẦU VÀO: GIÁO VIÊN + TUẦN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              ĐẦU VÀO DỮ LIỆU: GIÁO VIÊN + TUẦN
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Bước 1: Chọn giáo viên và tuần học cần lập lịch
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Giáo viên selector */}
          <div className="lg:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                1. Chọn Giáo viên:
              </span>
              {onOpenTeacherManagerModal && (
                <button
                  type="button"
                  onClick={onOpenTeacherManagerModal}
                  className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold hover:underline"
                >
                  Quản lý DS Giáo viên →
                </button>
              )}
            </label>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevTeacher}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                title="Giáo viên trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex-1">
                <select
                  value={currentTeacher.shortName}
                  onChange={(e) => setSelectedTeacherShortName(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.shortName}>
                      {t.name} ({t.shortName}) — {t.subject} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextTeacher}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                title="Giáo viên tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md border border-blue-200">
                Tổ: {currentTeacher.department}
              </span>
              <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-200">
                Môn: {currentTeacher.subject}
              </span>
              <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                Ký hiệu TKB: {currentTeacher.shortName}
              </span>
            </div>
          </div>

          {/* Tuần học selector */}
          <div className="lg:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                2. Chọn Tuần học:
              </span>
              <span className="text-xs text-blue-700 font-bold">
                Năm học 2026 – 2027
              </span>
            </label>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
                disabled={selectedWeek <= 1}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors"
                title="Tuần trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex-1">
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                    const info = getAcademicWeekDates(w);
                    return (
                      <option key={w} value={w}>
                        Tuần {w}: {info.startDateStr} → {info.endDateStr} ({w <= 18 ? 'Học kì I' : 'Học kì II'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWeek(Math.min(35, selectedWeek + 1))}
                disabled={selectedWeek >= 35}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors"
                title="Tuần sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedWeek(systemInfo.currentAcademicWeek || 2)}
                className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 transition-colors shrink-0"
                title="Nhảy về tuần học hiện tại"
              >
                Tuần hiện tại ({systemInfo.currentAcademicWeek || 2})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Thời gian:</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-800">
                Thứ 2 ({startDateStr})
              </span>
              <span>đến</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-800">
                Thứ 7 ({endDateStr})
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-blue-700 font-semibold">
                {selectedWeek <= 18 ? 'Học kì I (18 tuần)' : 'Học kì II (17 tuần)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI ĐỐI CHIẾU DỮ LIỆU TỰ ĐỘNG (ENGINE STATUS & TOOLBAR) */}
      <div className="bg-linear-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/30">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                  AI ĐỐI CHIẾU: PPCT + DANH SÁCH GIÁO VIÊN + TKB
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.2 rounded-full">
                  Đã khớp chuẩn
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Tự động đối chiếu Thời khóa biểu tuần {selectedWeek} với Kế hoạch dạy học (PPCT) môn học
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15 text-xs">
            <div>
              <span className="text-blue-200 text-[11px] block">Tổng tiết dạy:</span>
              <span className="text-base font-black text-amber-300">{reportRows.length} tiết</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div>
              <span className="text-blue-200 text-[11px] block">Buổi sáng:</span>
              <span className="font-bold text-white">{morningCount} tiết</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div>
              <span className="text-blue-200 text-[11px] block">Buổi chiều:</span>
              <span className="font-bold text-white">{afternoonCount} tiết</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div>
              <span className="text-blue-200 text-[11px] block">Lớp phụ trách:</span>
              <span className="font-bold text-white">{classList.join(', ') || 'Chưa có'}</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Chạy lại AI đối chiếu */}
            <button
              type="button"
              onClick={handleAutoGenerate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Đồng bộ và tính toán lại lịch dạy từ TKB và PPCT"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Chạy lại AI đối chiếu</span>
            </button>

            {/* Xóa / Đặt lại lịch báo giảng */}
            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-xl text-xs font-bold border border-rose-500/30 transition-all cursor-pointer"
              title="Xóa nội dung lịch báo giảng tuần này để làm mới hoàn toàn"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Xóa / Đặt lại nội dung</span>
            </button>

            {/* Thêm tiết dạy mới */}
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Thêm một tiết dạy thủ công (thao giảng, dạy bù, bồi dưỡng...)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm tiết dạy</span>
            </button>

            {/* Mẫu tuần */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-xl text-xs font-bold border border-amber-400/30 transition-all cursor-pointer"
              title="Lưu hoặc áp dụng mẫu ghi chú tuần"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Mẫu tuần</span>
            </button>

            {/* Chẩn đoán & Kiểm tra dữ liệu đối chiếu */}
            <button
              type="button"
              onClick={() => setIsDiagnosticModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                diagnosticReport.emptyMandatoryCount > 0 || diagnosticReport.collisionCount > 0
                  ? 'bg-rose-500/30 hover:bg-rose-500/40 text-rose-100 border-rose-400/50 animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
              }`}
              title="Chẩn đoán kiểm tra tính toàn vẹn dữ liệu TKB + PPCT (Tiết PPCT, Tiết TKB, xung đột môn học)"
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Kiểm tra dữ liệu</span>
              {diagnosticReport.totalIssuesCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                  {diagnosticReport.totalIssuesCount}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500/40 text-emerald-200">
                  Chuẩn
                </span>
              )}
            </button>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Word .docx */}
            <button
              type="button"
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-900 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Xuất tệp Word (.docx) chuẩn khổ A4 dọc theo 8 cột"
            >
              <FileText className="w-4 h-4 text-blue-700" />
              <span>Word (.docx)</span>
            </button>

            {/* Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Xuất bảng tính Excel (.xlsx) 8 cột chuẩn"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Tải Excel</span>
            </button>

            {/* In / PDF */}
            <button
              type="button"
              onClick={handlePrintOrPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="In trực tiếp hoặc Lưu dưới dạng PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>In / PDF</span>
            </button>

            {/* Xuất Toàn Trường */}
            <button
              type="button"
              onClick={handleExportAllDocx}
              disabled={isExportingDocx}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Xuất hồ sơ Lịch báo giảng của tất cả giáo viên tuần này nộp BGH"
            >
              <Users className="w-3.5 h-3.5 text-indigo-200" />
              <span>Toàn trường (.docx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER LƯU Ý QUAN TRỌNG TỪ QUY CHẾ */}
      <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 shadow-xs flex items-start gap-3">
        <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
            LƯU Ý QUAN TRỌNG TỪ QUY ĐỊNH BÁO GIẢNG:
          </h4>
          <p className="text-amber-900 font-semibold leading-relaxed">
            <strong className="underline text-amber-950">“Tiết theo TKB”</strong> (Cột 3) và <strong className="underline text-amber-950">“Tiết thứ theo phân phối chương trình”</strong> (Cột 6) là <strong className="text-rose-700 uppercase">hai trường hoàn toàn khác nhau, tuyệt đối không được nhập chung</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-slate-700">
            <div className="bg-white/80 p-2 rounded-lg border border-amber-200">
              <span className="font-bold text-blue-900 block">✓ Cột 3: Tiết theo TKB</span>
              <span>Là số thứ tự tiết trong buổi dạy (Tiết 1, 2, 3, 4, 5) theo Thời khóa biểu của trường.</span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-amber-200">
              <span className="font-bold text-amber-900 block">✓ Cột 6: Tiết thứ theo PPCT</span>
              <span>Là số thứ tự tiết học lũy kế theo kế hoạch dạy học môn học của cả năm (ví dụ: tiết 5, 6, 7...).</span>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER CẢNH BÁO CHẨN ĐOÁN DỮ LIỆU TKB + PPCT NẾU CÓ LỖI */}
      {!diagnosticReport.isValid && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="text-sm font-black text-rose-950 uppercase tracking-wide flex items-center gap-2">
                CẢNH BÁO CHẨN ĐOÁN DỮ LIỆU ĐỐI CHIẾU (TKB + PPCT):
              </h4>
              <p className="text-rose-900 font-medium leading-relaxed">
                Hệ thống phát hiện{' '}
                {diagnosticReport.emptyMandatoryCount > 0 && (
                  <strong className="font-bold text-rose-700">
                    {diagnosticReport.emptyMandatoryCount} tiết bị thiếu trường bắt buộc (Tiết PPCT hoặc Tiết theo TKB)
                  </strong>
                )}
                {diagnosticReport.emptyMandatoryCount > 0 && diagnosticReport.collisionCount > 0 && ' và '}
                {diagnosticReport.collisionCount > 0 && (
                  <strong className="font-bold text-amber-800">
                    {diagnosticReport.collisionCount} xung đột giữa tên môn học và kế hoạch PPCT
                  </strong>
                )}
                .
              </p>
              <p className="text-slate-600">
                Các cảnh báo chi tiết đã được ghi vào bảng điều khiển (Console warnings). Thầy/Cô có thể xem vị trí từng dòng để chuẩn hóa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDiagnosticModalOpen(true)}
            className="self-start sm:self-center shrink-0 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Xem chi tiết ({diagnosticReport.totalIssuesCount})</span>
          </button>
        </div>
      )}

      {/* BẢNG LỊCH BÁO GIẢNG CHUẨN (THE OFFICIAL PAPER VIEW) */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden" id="official-lesson-report-card">
        {/* Table View Toggle Bar */}
        <div className="bg-slate-100/90 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
              <Layers className="w-4 h-4 text-blue-700" />
              BẢNG LỊCH BÁO GIẢNG (MẪU CHUẨN 8 CỘT)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Gộp ô: Cùng Thứ ngày + Cùng Buổi
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Chế độ hiển thị:</span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setTableDisplayMode('merged')}
                className={`px-3 py-1 rounded-md font-bold transition-all text-xs flex items-center gap-1.5 ${
                  tableDisplayMode === 'merged'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gộp ô Thứ ngày và Buổi khi cùng Thứ ngày + cùng Buổi (Quy định chuẩn)"
              >
                <TableProperties className="w-3.5 h-3.5" />
                Gộp ô Thứ & Buổi (Chuẩn yêu cầu)
              </button>
              <button
                type="button"
                onClick={() => setTableDisplayMode('row-by-row')}
                className={`px-3 py-1 rounded-md font-bold transition-all text-xs ${
                  tableDisplayMode === 'row-by-row'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Hiển thị từng dòng riêng lẻ không gộp"
              >
                Từng dòng riêng
              </button>
            </div>
          </div>
        </div>

        {/* Paper Container with Official Header */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Administrative Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center md:text-left border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                UBND PHƯỜNG ĐỒNG HỚI
              </p>
              <p className="text-sm font-black text-slate-900 uppercase">
                TRƯỜNG THCS ĐỒNG PHÚ
              </p>
              <div className="w-20 h-0.5 bg-slate-800 mx-auto md:mx-0 my-1.5" />
            </div>

            <div className="text-center md:text-right">
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </p>
              <p className="text-xs font-bold text-slate-800">
                Độc lập – Tự do – Hạnh phúc
              </p>
              <div className="w-28 h-0.5 bg-slate-800 mx-auto md:ml-auto md:mr-0 my-1.5" />
            </div>
          </div>

          {/* Title Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wide font-serif">
              LỊCH BÁO GIẢNG
            </h2>
            <p className="text-sm font-bold text-blue-900 font-serif">
              TUẦN {selectedWeek}
            </p>
            <p className="text-xs text-slate-600 italic font-serif">
              (Thực hiện từ ngày {startDateStr} đến ngày {endDateStr})
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-800 pt-2">
              <span>
                Họ và tên giáo viên: <strong className="text-slate-900 font-bold">{currentTeacher.name}</strong>
              </span>
              <span>•</span>
              <span>
                Tổ chuyên môn: <strong className="text-slate-900 font-bold">{currentTeacher.department}</strong>
              </span>
              <span>•</span>
              <span>
                Năm học: <strong className="text-slate-900 font-bold">2026 – 2027</strong>
              </span>
            </div>
          </div>

          {/* 8-COLUMN TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full text-xs text-left border-collapse font-serif">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b border-slate-300">
                  <th className="p-2.5 text-center font-bold border-r border-slate-300 w-[14%]">
                    Thứ ngày
                  </th>
                  <th className="p-2.5 text-center font-bold border-r border-slate-300 w-[8%]">
                    Buổi
                  </th>
                  <th className="p-2.5 text-center font-bold border-r border-slate-300 w-[10%] bg-blue-50/70 text-blue-950">
                    Tiết theo TKB
                  </th>
                  <th className="p-2.5 text-center font-bold border-r border-slate-300 w-[10%]">
                    Môn
                  </th>
                  <th className="p-2.5 text-center font-bold border-r border-slate-300 w-[8%]">
                    Lớp
                  </th>
                  <th className="p-2.5 text-center font-bold border-r border-slate-300 w-[12%] bg-amber-50/70 text-amber-950">
                    Tiết theo PPCT
                  </th>
                  <th className="p-2.5 text-center font-bold border-r border-slate-300 w-[26%]">
                    Tên bài dạy
                  </th>
                  <th className="p-2.5 text-center font-bold border-r border-slate-300 w-[12%]">
                    Ghi chú
                  </th>
                  <th className="p-2.5 text-center font-bold w-[50px] font-sans print:hidden">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-slate-500 italic bg-slate-50"
                    >
                      Không có tiết dạy nào được xếp lịch trong tuần {selectedWeek}.<br />
                      <button
                        type="button"
                        onClick={handleAutoGenerate}
                        className="mt-2 text-blue-700 font-bold hover:underline"
                      >
                        Nhấn vào đây để chạy AI đối chiếu tự động từ TKB & PPCT
                      </button>
                    </td>
                  </tr>
                ) : (
                  sortedReportRows.map((row, idx) => {
                    const span = rowSpans[idx] || { dayRowSpan: 1, sessionRowSpan: 1 };
                    const isMorning = row.session === 'morning';

                    // Tách riêng: Thứ ở hàng trên, ngày ở hàng dưới
                    const { dayLabel, dateLabel } = row.dayLabel && row.dateLabel
                      ? { dayLabel: row.dayLabel, dateLabel: row.dateLabel }
                      : formatDayDateParts(row.dayOfWeek, row.dateString, row.dayDateDisplay);

                    const isRowByRow = tableDisplayMode === 'row-by-row';

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        {/* 1. Thứ ngày (Bố trí: Thứ ở hàng trên, ngày nằm ở hàng dưới) */}
                        {isRowByRow ? (
                          <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap bg-slate-50/30">
                            <div className="flex flex-col items-center justify-center leading-tight">
                              <span className="font-bold text-slate-900 text-sm">{dayLabel}</span>
                              {dateLabel && (
                                <span className="text-xs font-semibold text-slate-600 mt-0.5">
                                  {dateLabel}
                                </span>
                              )}
                            </div>
                          </td>
                        ) : span.dayRowSpan > 0 ? (
                          <td
                            rowSpan={span.dayRowSpan}
                            className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-300 align-middle bg-slate-50/70 whitespace-nowrap"
                          >
                            <div className="flex flex-col items-center justify-center leading-tight py-1">
                              <span className="font-bold text-slate-900 text-sm">{dayLabel}</span>
                              {dateLabel && (
                                <span className="text-xs font-semibold text-slate-600 mt-0.5">
                                  {dateLabel}
                                </span>
                              )}
                            </div>
                          </td>
                        ) : null}

                        {/* 2. Buổi (Gộp ô khi cùng Thứ ngày + cùng Buổi) */}
                        {isRowByRow ? (
                          <td className="p-2.5 text-center border-r border-slate-300 text-slate-800">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                isMorning
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              }`}
                            >
                              {isMorning ? 'Sáng' : 'Chiều'}
                            </span>
                          </td>
                        ) : span.sessionRowSpan > 0 ? (
                          <td
                            rowSpan={span.sessionRowSpan}
                            className="p-2.5 text-center border-r border-slate-300 align-middle text-slate-800 bg-white"
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                isMorning
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              }`}
                            >
                              {isMorning ? 'Sáng' : 'Chiều'}
                            </span>
                          </td>
                        ) : null}

                        {/* 3. Tiết theo TKB (Hiển thị riêng từng tiết) */}
                        <td className="p-2.5 text-center font-bold text-blue-900 border-r border-slate-300 bg-blue-50/30">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-extrabold text-xs">
                            {row.periodTKB}
                          </span>
                        </td>

                        {/* 4. Môn (Hiển thị riêng từng tiết) */}
                        <td className="p-2.5 text-center font-semibold text-slate-900 border-r border-slate-300">
                          {row.subject}
                        </td>

                        {/* 5. Lớp (Hiển thị riêng từng tiết) */}
                        <td className="p-2.5 text-center font-black text-slate-900 border-r border-slate-300">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-900 font-bold border border-slate-200">
                            {row.className}
                          </span>
                        </td>

                        {/* 6. Tiết thứ theo phân phối chương trình (Hiển thị riêng từng tiết) */}
                        <td className="p-2.5 text-center font-bold text-amber-950 border-r border-slate-300 bg-amber-50/30">
                          <span className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-xs border border-amber-300">
                            {row.ppctPeriodNumber}
                          </span>
                        </td>

                        {/* 7. Tên bài dạy (Hiển thị riêng từng tiết) */}
                        <td className="p-2.5 text-left text-slate-900 border-r border-slate-300 font-medium leading-snug">
                          {row.lessonName}
                        </td>

                        {/* 8. Ghi chú */}
                        <td className="p-2 text-left border-r border-slate-300 relative text-xs">
                          {row.notes ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                              {row.notes}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}

                          {/* Quick note popover trigger */}
                          <div className="inline-block ml-1 print:hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveQuickNoteRowId(
                                  activeQuickNoteRowId === row.id ? null : row.id
                                )
                              }
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                              title="Gán nhanh nhãn ghi chú"
                            >
                              <Tag className="w-3 h-3" />
                            </button>

                            {/* Quick Note Dropdown */}
                            {activeQuickNoteRowId === row.id && (
                              <div className="absolute right-2 top-8 z-30 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 font-sans text-xs">
                                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 font-bold text-slate-700">
                                  <span>Chọn nhanh ghi chú:</span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveQuickNoteRowId(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto py-1">
                                  {QUICK_NOTE_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.label}
                                      type="button"
                                      onClick={() => handleApplyQuickNote(row.id, opt.label)}
                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${opt.color} hover:brightness-95`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => handleApplyQuickNote(row.id, '')}
                                    className="w-full text-center text-[10px] text-slate-500 hover:text-rose-600 py-1"
                                  >
                                    Xóa ghi chú
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Thao tác web (Ẩn khi in ấn) */}
                        <td className="p-2 text-center whitespace-nowrap print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa tiết học"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Xóa tiết học"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures Footer */}
          <div className="grid grid-cols-3 gap-4 text-center pt-8 border-t border-slate-200 font-serif">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900 uppercase">
                DUYỆT CỦA BGH
              </p>
              <p className="text-[11px] text-slate-500 italic">
                (Ký và đóng dấu)
              </p>
              <div className="h-16" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900 uppercase">
                TỔ TRƯỞNG CHUYÊN MÔN
              </p>
              <p className="text-[11px] text-slate-500 italic">
                (Ký và ghi rõ họ tên)
              </p>
              <div className="h-16" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900 uppercase">
                GIÁO VIÊN GIẢNG DẠY
              </p>
              <p className="text-[11px] text-slate-500 italic">
                (Ký và ghi rõ họ tên)
              </p>
              <div className="h-16" />
              <p className="text-xs font-bold text-slate-900">
                {currentTeacher.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL THÊM / SỬA TIẾT DẠY */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-sm uppercase">
                  {editingRow ? 'CHỈNH SỬA TIẾT DẠY' : 'THÊM TIẾT DẠY MỚI'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Thứ ngày & Buổi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    1. Thứ trong tuần:
                  </label>
                  <select
                    value={formDayOfWeek}
                    onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value={2}>Thứ Hai</option>
                    <option value={3}>Thứ Ba</option>
                    <option value={4}>Thứ Tư</option>
                    <option value={5}>Thứ Năm</option>
                    <option value={6}>Thứ Sáu</option>
                    <option value={7}>Thứ Bảy</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    2. Buổi:
                  </label>
                  <select
                    value={formSession}
                    onChange={(e) => setFormSession(e.target.value as 'morning' | 'afternoon')}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="morning">Sáng</option>
                    <option value="afternoon">Chiều</option>
                  </select>
                </div>
              </div>

              {/* Phân biệt Tiết theo TKB vs Tiết theo PPCT */}
              <div className="grid grid-cols-2 gap-3 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <div>
                  <label className="font-black text-blue-900 block mb-1">
                    3. Tiết theo TKB:
                  </label>
                  <select
                    value={formPeriodTKB}
                    onChange={(e) => setFormPeriodTKB(Number(e.target.value))}
                    className="w-full p-2 border border-blue-300 bg-white rounded-lg font-extrabold text-blue-900"
                  >
                    <option value={1}>Tiết 1 (TKB)</option>
                    <option value={2}>Tiết 2 (TKB)</option>
                    <option value={3}>Tiết 3 (TKB)</option>
                    <option value={4}>Tiết 4 (TKB)</option>
                    <option value={5}>Tiết 5 (TKB)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Vị trí tiết trong buổi dạy
                  </span>
                </div>

                <div>
                  <label className="font-black text-amber-900 block mb-1">
                    6. Tiết thứ theo PPCT:
                  </label>
                  <input
                    type="number"
                    value={formPpctPeriod}
                    onChange={(e) => setFormPpctPeriod(e.target.value)}
                    className="w-full p-2 border border-amber-300 bg-white rounded-lg font-extrabold text-amber-900"
                    placeholder="VD: 5, 6, 7..."
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Thứ tự tiết lũy kế cả năm
                  </span>
                </div>
              </div>

              {/* Môn & Lớp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    4. Môn học:
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    placeholder="VD: KHTN, Toán, Tin học..."
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    5. Lớp:
                  </label>
                  <input
                    type="text"
                    value={formClassName}
                    onChange={(e) => setFormClassName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-black"
                    placeholder="VD: 7.1, 7.2, 8.1..."
                  />
                </div>
              </div>

              {/* Tên bài dạy */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  7. Tên bài dạy (từ PPCT):
                </label>
                <textarea
                  value={formLessonName}
                  onChange={(e) => setFormLessonName(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  placeholder="Nhập tên bài học..."
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  8. Ghi chú:
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  placeholder="VD: Tiết thực hành, KT 15 phút, Dạy bù..."
                />

                {/* Quick note buttons */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {QUICK_NOTE_OPTIONS.slice(0, 6).map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setFormNotes(opt.label)}
                      className={`text-[10px] px-2 py-0.5 rounded border ${opt.color}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveModalForm}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs"
              >
                Lưu tiết dạy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA / ĐẶT LẠI NỘI DUNG */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  XÓA / ĐẶT LẠI LỊCH BÁO GIẢNG?
                </h3>
                <p className="text-xs text-slate-500">
                  Thao tác với nội dung tuần {selectedWeek} của {currentTeacher.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có thể <strong>xóa sạch nội dung hiện có</strong> để bắt đầu soạn mới thủ công, hoặc <strong>chạy lại AI đối chiếu</strong> từ Thời khóa biểu và Phân phối chương trình gốc.
            </p>

            <div className="space-y-2 pt-2 text-xs">
              <button
                type="button"
                onClick={handleClearModuleContent}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa trắng toàn bộ tiết trong tuần</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAutoGenerate();
                  setIsConfirmClearOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span>Khôi phục lại từ AI đối chiếu (TKB + PPCT)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 font-semibold"
              >
                Đóng / Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHẨN ĐOÁN DỮ LIỆU TKB + PPCT */}
      {isDiagnosticModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide">
                    CHẨN ĐOÁN TÍNH TOÀN VẸN DỮ LIỆU (TKB + PPCT)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tuần {selectedWeek} • {currentTeacher.name} ({currentTeacher.shortName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDiagnosticModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-xs text-slate-500 block font-semibold">Tổng số tiết</span>
                  <span className="text-xl font-black text-slate-800">{diagnosticReport.totalCheckedRows}</span>
                </div>
                <div
                  className={`border rounded-xl p-3 ${
                    diagnosticReport.emptyMandatoryCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <span className="text-xs block font-semibold text-slate-600">Thiếu Tiết PPCT / TKB</span>
                  <span
                    className={`text-xl font-black ${
                      diagnosticReport.emptyMandatoryCount > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {diagnosticReport.emptyMandatoryCount}
                  </span>
                </div>
                <div
                  className={`border rounded-xl p-3 ${
                    diagnosticReport.collisionCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <span className="text-xs block font-semibold text-slate-600">Xung đột Môn - PPCT</span>
                  <span
                    className={`text-xl font-black ${
                      diagnosticReport.collisionCount > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {diagnosticReport.collisionCount}
                  </span>
                </div>
              </div>

              {/* Status Message */}
              {diagnosticReport.isValid ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-sm">Dữ liệu nguồn đối chiếu hoàn toàn hợp lệ!</p>
                    <p className="text-emerald-700 mt-0.5">
                      Tất cả các tiết đều có đầy đủ Tiết theo TKB (Cột 3), Tiết theo PPCT (Cột 6) và không có bất kỳ xung đột nào giữa tên môn học với danh mục PPCT.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Danh sách chi tiết cảnh báo ({diagnosticReport.issues.length}):
                  </h4>
                  <div className="space-y-2">
                    {diagnosticReport.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          issue.severity === 'error'
                            ? 'bg-rose-50 border-rose-200 text-rose-950'
                            : 'bg-amber-50 border-amber-200 text-amber-950'
                        }`}
                      >
                        {issue.severity === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-0.5">
                          <div className="font-bold flex items-center gap-2">
                            <span>
                              {issue.type === 'EMPTY_MANDATORY_FIELD'
                                ? `Trường bắt buộc bị rỗng: ${issue.field}`
                                : issue.type === 'PPCT_COLLISION'
                                ? 'Xung đột kế hoạch PPCT'
                                : issue.type === 'GRADE_MISMATCH'
                                ? 'Lệch khối lớp PPCT'
                                : 'Chưa có PPCT phù hợp'}
                            </span>
                            {issue.className && (
                              <span className="px-1.5 py-0.5 bg-white/80 rounded text-[10px] border border-slate-200">
                                {issue.className}
                              </span>
                            )}
                            {issue.subject && (
                              <span className="px-1.5 py-0.5 bg-white/80 rounded text-[10px] border border-slate-200">
                                {issue.subject}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-700 leading-relaxed">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 italic">
                Các cảnh báo đã được ghi log qua console.warn() của trình duyệt.
              </span>
              <button
                type="button"
                onClick={() => setIsDiagnosticModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MẪU TUẦN */}
      {isTemplateModalOpen && (
        <WeekTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          currentTeacherShortName={currentTeacher.shortName}
          currentWeek={selectedWeek}
          reportRows={reportRows}
          onApplyTemplate={handleApplyTemplate}
        />
      )}
    </div>
  );
};

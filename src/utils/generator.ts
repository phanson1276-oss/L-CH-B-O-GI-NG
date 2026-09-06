import { LessonReportRow, PPCTPlan, TimetableData, TimetableSlot, WeeklyReportConfig, TimetableVersion } from '../types';
import { getAcademicWeekDates } from './academicCalendar';

export interface FlattenedLesson {
  periodNumber: number; // 1, 2, 3...
  lessonTitle: string;
  equipment: string;
  notes: string;
  chapter?: string;
}

// Convert a PPCT plan into an indexed array of individual periods (1 to N)
export function flattenPPCTPlan(plan: PPCTPlan): FlattenedLesson[] {
  const result: FlattenedLesson[] = [];
  let currentPeriod = 1;

  for (const item of plan.items) {
    for (let p = 1; p <= item.periodCount; p++) {
      const partSuffix = item.periodCount > 1 ? ` (Tiết ${p}/${item.periodCount})` : '';
      result.push({
        periodNumber: currentPeriod,
        lessonTitle: `${item.lessonTitle}${partSuffix}`,
        equipment: item.equipment,
        notes: item.notes,
        chapter: item.chapter,
      });
      currentPeriod++;
    }
  }

  return result;
}

// Map grade from class name like "8/1" -> 8, "9/2" -> 9
export function getGradeFromClassName(className: string): number {
  const match = className.match(/^([6-9])/);
  return match ? parseInt(match[1], 10) : 8;
}

// Normalize subject name for matching
export function normalizeSubjectName(subject: string): string {
  const s = subject.toLowerCase().trim();
  // Check KHTN sub-subjects first
  if (s.includes('khtn1') || s.includes('khtn 1') || s.includes('hóa') || s.includes('hoa hoc') || s.includes('hóa học')) return 'KHTN1 (Hóa học)';
  if (s.includes('khtn2') || s.includes('khtn 2') || s.includes('vật lí') || s.includes('vật lý') || s.includes('vat ly') || s.includes('vật ly') || s.includes('lý') || s.includes('lí')) return 'KHTN2 (Vật lý)';
  if (s.includes('khtn3') || s.includes('khtn 3') || s.includes('sinh') || s.includes('sinh học') || s.includes('sinh hoc')) return 'KHTN3 (Sinh học)';
  if (s.includes('khtn') || s.includes('khoa học tự nhiên') || s.includes('khoa hoc tu nhien')) return 'Khoa học tự nhiên (KHTN)';
  
  if (s.includes('toán') || s.includes('toan')) return 'Toán';
  if (s.includes('văn') || s.includes('van') || s.includes('ngữ văn') || s.includes('ngu van')) return 'Ngữ văn';
  if (s.includes('anh') || s.includes('tiếng anh') || s.includes('tieng anh')) return 'Tiếng Anh';
  if (s.includes('tin') || s.includes('tin học') || s.includes('tin hoc')) return 'Tin học';
  if (s.includes('lịch sử và địa lí') || s.includes('ls&đl') || s.includes('lsdl')) return 'Lịch sử và Địa lí';
  if (s.includes('sử') || s.includes('lịch sử') || s.includes('lich su')) return 'Lịch sử';
  if (s.includes('địa') || s.includes('địa lí') || s.includes('dia ly') || s.includes('dia li')) return 'Địa lí';
  if (s.includes('gdcd') || s.includes('công dân') || s.includes('cong dan')) return 'Giáo dục công dân (GDCD)';
  if (s.includes('gdtc') || s.includes('thể chất') || s.includes('the chat')) return 'Giáo dục thể chất (GDTC)';
  if (s.includes('hđtn') || s.includes('trải nghiệm') || s.includes('trai nghiem')) return 'Hoạt động trải nghiệm, hướng nghiệp (HĐTN)';
  if (s.includes('cn') || s.includes('công nghệ') || s.includes('cong nghe')) return 'Công nghệ (CN)';
  if (s.includes('âm nhạc') || s.includes('am nhac') || s.includes('ân')) return 'Âm nhạc';
  if (s.includes('mĩ thuật') || s.includes('mỹ thuật') || s.includes('mi thuat') || s.includes('mt')) return 'Mĩ thuật';
  if (s.includes('gd đp') || s.includes('gdđp') || s.includes('địa phương') || s.includes('dia phuong')) return 'Nội dung giáo dục địa phương (GD ĐP)';
  return subject;
}

// Calculate week dates based on week number (defaults to dynamic academic calendar)
export function getWeekDates(weekNumber: number, baseDateStr?: string, baseWeekNumber?: number): { [key: number]: string } {
  // If specific explicit base date is supplied
  if (baseDateStr && baseWeekNumber !== undefined) {
    const baseDate = new Date(baseDateStr);
    const diffWeeks = weekNumber - baseWeekNumber;
    const monday = new Date(baseDate);
    monday.setDate(monday.getDate() + diffWeeks * 7);

    const dates: { [key: number]: string } = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      dates[i + 2] = `${day}/${month}/${year}`;
    }
    return dates;
  }

  // Use dynamic system academic calendar calculation
  return getAcademicWeekDates(weekNumber).dates;
}

export const DAY_NAME_MAP: { [key: number]: string } = {
  2: 'Hai',
  3: 'Ba',
  4: 'Tư',
  5: 'Năm',
  6: 'Sáu',
  7: 'Bảy',
  8: 'Chủ nhật',
};

// Generate automated lesson notification report for a teacher in a given week
export function generateWeeklyReport(
  teacherShortName: string,
  config: WeeklyReportConfig,
  timetable: TimetableData,
  ppctPlans: PPCTPlan[]
): LessonReportRow[] {
  // 1. Filter slots taught by this teacher
  const safeTeacherShort = (teacherShortName || '').toLowerCase();
  const teacherSlots = (timetable?.slots || []).filter(
    (s) => s.teacherShortName && s.teacherShortName.toLowerCase() === safeTeacherShort
  );

  // Sort slots by dayOfWeek (2..7), session ('morning' first), period (1..10)
  teacherSlots.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    if (a.session !== b.session) return a.session === 'morning' ? -1 : 1;
    return a.period - b.period;
  });

  const weekDates = getWeekDates(config.weekNumber);

  // Keep track of period counts per (Class + Subject) to assign consecutive PPCT numbers
  const classSubjectSlotsCount: { [key: string]: number } = {};

  // For week N, estimate starting period index in PPCT
  // e.g. If a class has 4 periods per week, week 16 starts around period (16-1)*4 + 1 = 61
  const reportRows: LessonReportRow[] = [];

  for (const slot of teacherSlots) {
    const classKey = `${slot.className}_${slot.subject}`;
    if (!classSubjectSlotsCount[classKey]) {
      classSubjectSlotsCount[classKey] = 0;
    }
    const slotIndexInWeek = classSubjectSlotsCount[classKey]++;

    const grade = getGradeFromClassName(slot.className);
    const normalizedSubj = normalizeSubjectName(slot.subject);

    // Find best matching PPCT
    let matchedPlan = ppctPlans.find(
      (p) =>
        p.grade === grade &&
        (normalizeSubjectName(p.subject) === normalizedSubj ||
          p.subject.toLowerCase().includes(normalizedSubj.toLowerCase()))
    );

    // Fallback: search by grade or first plan
    if (!matchedPlan) {
      matchedPlan = ppctPlans.find((p) => normalizeSubjectName(p.subject) === normalizedSubj) || ppctPlans[0];
    }

    let lessonName = `${slot.subject} ${slot.className}`;
    let equipment = 'Thước thẳng, bảng phụ, SGK';
    let notes = 'Phòng học';
    let ppctPeriodNumber: number | string = 1;

    if (matchedPlan) {
      const flattened = flattenPPCTPlan(matchedPlan);
      // Estimate periods per week for this subject
      const totalWeeklyPeriods = matchedPlan.totalPeriods <= 35 ? 1 : matchedPlan.totalPeriods <= 70 ? 2 : 4;
      const basePeriodNum = (config.weekNumber - 1) * totalWeeklyPeriods + 1 + slotIndexInWeek;
      
      const targetIndex = Math.min(Math.max(basePeriodNum - 1, 0), flattened.length - 1);
      const matchedLesson = flattened[targetIndex];

      if (matchedLesson) {
        ppctPeriodNumber = basePeriodNum;
        lessonName = matchedLesson.lessonTitle;
        equipment = matchedLesson.equipment || 'Thước thẳng, máy chiếu';
        notes = matchedLesson.notes || 'Phòng học';
      } else {
        ppctPeriodNumber = basePeriodNum;
        lessonName = `Bài học tuần ${config.weekNumber} - ${slot.subject}`;
      }
    }

    reportRows.push({
      id: `row-${slot.dayOfWeek}-${slot.session}-${slot.period}-${slot.className}`,
      dayOfWeek: slot.dayOfWeek,
      dayName: DAY_NAME_MAP[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`,
      dateString: weekDates[slot.dayOfWeek] || '',
      session: slot.session,
      periodTKB: slot.period,
      subject: slot.subject,
      className: slot.className,
      ppctPeriodNumber: ppctPeriodNumber,
      lessonName: lessonName,
      equipment: equipment,
      notes: notes,
    });
  }

  return reportRows;
}

export interface RowSpanInfo {
  dayRowSpan: number; // > 0 if this row renders the Day cell, 0 if it should be skipped
  sessionRowSpan: number; // > 0 if this row renders the Session cell, 0 if it should be skipped
}

/**
 * Calculates row spans for merging identical Day (Ngày thứ) and Session (Buổi) in Timetable and Lesson Report tables.
 */
export function computeReportRowSpans(rows: LessonReportRow[]): RowSpanInfo[] {
  const spans: RowSpanInfo[] = [];
  const n = rows.length;

  for (let i = 0; i < n; i++) {
    // 1. Day span: group consecutive rows with the same dayOfWeek (or dayName) and dateString
    let dayRowSpan = 0;
    const isNewDay =
      i === 0 ||
      rows[i].dayOfWeek !== rows[i - 1].dayOfWeek ||
      rows[i].dayName !== rows[i - 1].dayName ||
      rows[i].dateString !== rows[i - 1].dateString;

    if (isNewDay) {
      let count = 1;
      while (
        i + count < n &&
        rows[i + count].dayOfWeek === rows[i].dayOfWeek &&
        rows[i + count].dayName === rows[i].dayName &&
        rows[i + count].dateString === rows[i].dateString
      ) {
        count++;
      }
      dayRowSpan = count;
    }

    // 2. Session span: within the same day, group consecutive rows with the same session ('morning' vs 'afternoon')
    let sessionRowSpan = 0;
    const isNewSession =
      isNewDay || rows[i].session !== rows[i - 1].session;

    if (isNewSession) {
      let count = 1;
      while (
        i + count < n &&
        rows[i + count].dayOfWeek === rows[i].dayOfWeek &&
        rows[i + count].dayName === rows[i].dayName &&
        rows[i + count].dateString === rows[i].dateString &&
        rows[i + count].session === rows[i].session
      ) {
        count++;
      }
      sessionRowSpan = count;
    }

    spans.push({ dayRowSpan, sessionRowSpan });
  }

  return spans;
}

/**
 * Resolves the active timetable for a given week from the list of timetable versions.
 * If a version specifies effectiveFromWeek and effectiveToWeek, it matches if weekNumber falls within that range.
 * If multiple match, the one with highest effectiveFromWeek takes precedence.
 * If none match, falls back to the closest version.
 */
export function getTimetableForWeek(
  versions: TimetableVersion[],
  weekNumber: number
): TimetableVersion | null {
  if (!versions || versions.length === 0) return null;

  const matches = versions.filter((v) => {
    const from = v.effectiveFromWeek ?? 1;
    const to = v.effectiveToWeek;
    if (to !== undefined && to !== null) {
      return weekNumber >= from && weekNumber <= to;
    }
    return weekNumber >= from;
  });

  if (matches.length > 0) {
    return matches.reduce((best, curr) =>
      curr.effectiveFromWeek > best.effectiveFromWeek ? curr : best
    );
  }

  const sorted = [...versions].sort((a, b) => (a.effectiveFromWeek ?? 1) - (b.effectiveFromWeek ?? 1));
  if (weekNumber < (sorted[0].effectiveFromWeek ?? 1)) {
    return sorted[0];
  }
  return sorted[sorted.length - 1];
}


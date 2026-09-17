import { LessonReportRow, PPCTPlan, TimetableData, TimetableSlot, WeeklyReportConfig, TimetableVersion } from '../types';
import { getAcademicWeekDates } from './academicCalendar';
import { FULL_STANDARD_PPCT_PLANS } from '../data/ppctCurriculumData';

export interface FlattenedLesson {
  periodNumber: number; // 1, 2, 3...
  lessonTitle: string;
  equipment: string;
  notes: string;
  chapter?: string;
}

/**
 * Validates whether a lesson title is genuine text rather than a numeric column (like "1, 2" or "1-2")
 */
export function isValidLessonTitle(title: string | undefined): boolean {
  if (!title) return false;
  const trimmed = title.trim();
  if (trimmed.length < 2) return false;
  // If it consists entirely of digits, commas, periods, hyphens, slashes (e.g. "1, 2" or "1-2" or "1")
  if (/^[\d\s,.\-–/]+$/.test(trimmed)) return false;
  if (trimmed.toLowerCase().includes('chưa có tên bài')) return false;
  // Must contain at least one Vietnamese or Latin letter
  if (!/[a-zA-Zà-ỹÀ-Ỹ]/.test(trimmed)) return false;
  return true;
}

// Convert a PPCT plan into an indexed array of individual periods (1 to N)
export function flattenPPCTPlan(plan: PPCTPlan): FlattenedLesson[] {
  const result: FlattenedLesson[] = [];
  let currentPeriod = 1;

  // Retrieve standard curriculum plan as fallback in case plan items contain malformed / numeric titles (e.g. "1, 2")
  const normalizedSubj = normalizeSubjectName(plan.subject || '');
  const standardPlan = FULL_STANDARD_PPCT_PLANS.find(
    (p) => p.grade === plan.grade && normalizeSubjectName(p.subject) === normalizedSubj
  );
  const standardItems = standardPlan ? standardPlan.items : [];

  for (let idx = 0; idx < plan.items.length; idx++) {
    const item = plan.items[idx];
    const periodCount = Number(item.periodCount) || 1;
    for (let p = 1; p <= periodCount; p++) {
      let cleanTitle = (item.lessonTitle || '').trim();

      // If title is invalid (e.g. "1, 2", "1-2", or only numbers), recover from standard curriculum
      if (!isValidLessonTitle(cleanTitle)) {
        const stdMatch = standardItems[idx] || standardItems.find((si) => si.orderNumber === item.orderNumber);
        if (stdMatch && stdMatch.lessonTitle) {
          cleanTitle = stdMatch.lessonTitle.trim();
        }
      }

      // Remove any previously formatted suffix like (Tiết 1/2), (tiết 1), (2 tiết) to avoid duplication
      cleanTitle = cleanTitle
        .replace(/\s*[\(\[]\s*tiết\s*\d+(\s*\/\s*\d+)?\s*[\)\]]\s*$/i, '')
        .replace(/\s*[\(\[]\s*tiết\s*\d+\s*[\)\]]\s*$/i, '')
        .replace(/\s*[\(\[]\s*\d+\s*tiết\s*[\)\]]\s*$/i, '')
        .trim();

      let formattedTitle = cleanTitle;
      // When lesson has multiple periods (periodCount > 1), append (tiết 1), (tiết 2)...
      if (periodCount > 1) {
        if (cleanTitle.endsWith('.')) {
          formattedTitle = `${cleanTitle} (tiết ${p})`;
        } else {
          formattedTitle = `${cleanTitle}. (tiết ${p})`;
        }
      }

      let itemEquipment = item.equipment;
      let itemNotes = item.notes;

      // Fix known mangled notes fragment "của đơn thức Thu"
      if (itemNotes === 'của đơn thức Thu' || (itemNotes && itemNotes.startsWith('của đơn thức'))) {
        const stdMatch = standardItems[idx] || standardItems[0];
        itemNotes = stdMatch?.notes || 'Nhận biết đơn thức, đơn thức thu gọn, hệ số, phần biến và bậc';
        if (stdMatch?.equipment) itemEquipment = stdMatch.equipment;
      }

      result.push({
        periodNumber: currentPeriod,
        lessonTitle: formattedTitle,
        equipment: itemEquipment,
        notes: itemNotes,
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
  if (!subject) return '';
  const raw = subject.trim();
  const s = raw.toLowerCase();

  // 1. Direct Canonical exact matches first (case-insensitive)
  if (s === 'khoa học tự nhiên (khtn)' || s === 'khoa học tự nhiên' || s === 'khtn') return 'Khoa học tự nhiên (KHTN)';
  if (s === 'khtn1 (hóa học)' || s === 'khtn1' || s === 'khtn 1') return 'KHTN1 (Hóa học)';
  if (s === 'khtn3 (sinh học)' || s === 'khtn3' || s === 'khtn 3') return 'KHTN3 (Sinh học)';
  if (
    s === 'lịch sử và địa lí' ||
    s === 'lịch sử & địa lí' ||
    s === 'ls&đl' ||
    s === 'lsdl' ||
    s === 'ls-đl' ||
    s === 'ls & đl'
  ) return 'Lịch sử và Địa lí';
  if (s === 'toán' || s === 'toan') return 'Toán';
  if (s === 'ngữ văn' || s === 'văn' || s === 'van' || s === 'ngu van') return 'Ngữ văn';
  if (s === 'tiếng anh' || s === 'anh' || s === 'tieng anh') return 'Tiếng Anh';
  if (s === 'tin học' || s === 'tin' || s === 'tin hoc') return 'Tin học';
  if (s === 'giáo dục công dân (gdcd)' || s === 'gdcd' || s === 'công dân') return 'Giáo dục công dân (GDCD)';
  if (s === 'giáo dục thể chất (gdtc)' || s === 'gdtc' || s === 'thể dục' || s === 'thể chất') return 'Giáo dục thể chất (GDTC)';
  if (
    s === 'hoạt động trải nghiệm, hướng nghiệp (hđtn)' ||
    s === 'hoạt động trải nghiệm' ||
    s === 'hđtn' ||
    s === 'hđtn,hn' ||
    s === 'hđtn-hn' ||
    s === 'hdtn'
  ) return 'Hoạt động trải nghiệm, hướng nghiệp (HĐTN)';
  if (s === 'công nghệ (cn)' || s === 'công nghệ' || s === 'c.nghệ' || s === 'cn') return 'Công nghệ (CN)';
  if (s === 'âm nhạc' || s === 'ân' || s === 'nhạc') return 'Âm nhạc';
  if (s === 'mĩ thuật' || s === 'mỹ thuật' || s === 'mt') return 'Mĩ thuật';
  if (
    s === 'nội dung giáo dục địa phương (gd đp)' ||
    s === 'giáo dục địa phương' ||
    s === 'gdđp' ||
    s === 'gd đp' ||
    s === 'gd-đp'
  ) return 'Nội dung giáo dục địa phương (GD ĐP)';
  if (s === 'lịch sử' || s === 'sử') return 'Lịch sử';
  if (s === 'địa lí' || s === 'địa lý' || s === 'địa') return 'Địa lí';

  // 2. High-priority composite subjects (MUST be evaluated before partial keywords like 'địa' or 'sử')
  if (
    s.includes('lịch sử và địa lí') ||
    s.includes('lịch sử & địa lí') ||
    s.includes('ls&đl') ||
    s.includes('lsdl') ||
    s.includes('ls-đl') ||
    s.includes('ls & đl')
  ) {
    return 'Lịch sử và Địa lí';
  }

  // 3. GD ĐP (check before 'địa' so GDĐP is not mistakenly treated as Địa lí)
  if (
    s.includes('gd đp') ||
    s.includes('gdđp') ||
    s.includes('địa phương') ||
    s.includes('dia phuong')
  ) {
    return 'Nội dung giáo dục địa phương (GD ĐP)';
  }

  // 4. HĐTN (check before general terms)
  if (
    s.includes('hđtn') ||
    s.includes('trải nghiệm') ||
    s.includes('hướng nghiệp') ||
    s.includes('trai nghiem')
  ) {
    return 'Hoạt động trải nghiệm, hướng nghiệp (HĐTN)';
  }

  // 5. KHTN specific sub-disciplines
  if (
    s.includes('khtn1') ||
    s.includes('khtn 1') ||
    s.includes('khtn (hóa') ||
    s.includes('khtn (hoa') ||
    s.includes('hóa học') ||
    /\b(hóa|hoa)\b/i.test(s)
  ) {
    return 'KHTN1 (Hóa học)';
  }

  if (
    s.includes('khtn3') ||
    s.includes('khtn 3') ||
    s.includes('khtn (sinh') ||
    s.includes('sinh học') ||
    s.includes('sinh hoc') ||
    /\b(sinh)\b/i.test(s)
  ) {
    return 'KHTN3 (Sinh học)';
  }

  // 6. KHTN general or Physics partition
  // IMPORTANT: Do NOT check standalone 'lí' or 'lý' with includes(), as that matches 'Địa lí' and 'Lịch sử và Địa lí'!
  if (
    s.includes('khtn') ||
    s.includes('khoa học tự nhiên') ||
    s.includes('khoa hoc tu nhien') ||
    s.includes('khtn2') ||
    s.includes('khtn (lý') ||
    s.includes('khtn (ly') ||
    s.includes('vật lý') ||
    s.includes('vật lí') ||
    /\bvật l[íy]\b/i.test(s) ||
    /^(lý|lí)$/i.test(s)
  ) {
    return 'Khoa học tự nhiên (KHTN)';
  }

  // 7. Individual subjects
  if (s.includes('toán') || s.includes('toan')) return 'Toán';
  if (s.includes('ngữ văn') || s.includes('ngu van') || /\bvăn\b/i.test(s)) return 'Ngữ văn';
  if (s.includes('tiếng anh') || s.includes('tieng anh') || /\banh\b/i.test(s)) return 'Tiếng Anh';
  if (s.includes('tin học') || s.includes('tin hoc') || /\btin\b/i.test(s)) return 'Tin học';
  if (s.includes('lịch sử') || s.includes('lich su') || /\bsử\b/i.test(s)) return 'Lịch sử';
  if (s.includes('địa lí') || s.includes('địa lý') || s.includes('dia ly') || s.includes('dia li') || /\bđịa\b/i.test(s)) return 'Địa lí';
  if (s.includes('gdcd') || s.includes('công dân') || s.includes('cong dan')) return 'Giáo dục công dân (GDCD)';
  if (s.includes('gdtc') || s.includes('thể chất') || s.includes('the chat') || s.includes('thể dục')) return 'Giáo dục thể chất (GDTC)';
  if (s.includes('công nghệ') || s.includes('c.nghệ') || s.includes('cong nghe') || /^cn$/i.test(s)) return 'Công nghệ (CN)';
  if (s.includes('âm nhạc') || s.includes('am nhac') || s.includes('hát nhạc') || /^ân$/i.test(s) || /\bnhạc\b/i.test(s)) return 'Âm nhạc';
  if (s.includes('mĩ thuật') || s.includes('mỹ thuật') || s.includes('mi thuat') || /^mt$/i.test(s)) return 'Mĩ thuật';

  return raw;
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

/**
 * Formats day of week and date as requested: "Thứ 2 – 14/9", "Thứ 3 – 15/9"
 */
export function formatDayDateDisplay(dayOfWeek: number, dateString: string): string {
  const { dayLabel, dateLabel } = formatDayDateParts(dayOfWeek, dateString);
  return dateLabel ? `${dayLabel} – ${dateLabel}` : dayLabel;
}

/**
 * Tách riêng Thứ (hàng trên) và Ngày (hàng dưới) cho cột "Thứ ngày"
 * Ví dụ:
 * dayLabel: "Thứ 2"
 * dateLabel: "14/9"
 */
export function formatDayDateParts(
  dayOfWeek: number,
  dateString?: string,
  dayDateDisplay?: string
): { dayLabel: string; dateLabel: string } {
  const dayLabel = dayOfWeek === 8 ? 'Chủ nhật' : `Thứ ${dayOfWeek}`;
  let dateLabel = '';

  if (dateString) {
    const parts = dateString.split('/');
    if (parts.length >= 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      dateLabel = `${d}/${m}`;
    } else {
      dateLabel = dateString;
    }
  } else if (dayDateDisplay && dayDateDisplay.includes('–')) {
    const parts = dayDateDisplay.split('–');
    if (parts[1]) {
      dateLabel = parts[1].trim();
    }
  }

  return { dayLabel, dateLabel };
}

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
    const grade = getGradeFromClassName(slot.className);
    const normalizedSubj = normalizeSubjectName(slot.subject);
    const classKey = `${slot.className}_${normalizedSubj}`;

    if (!classSubjectSlotsCount[classKey]) {
      classSubjectSlotsCount[classKey] = 0;
    }
    const slotIndexInWeek = classSubjectSlotsCount[classKey]++;

    // Find best matching PPCT (prioritizing exact normalized matches for this grade)
    let matchedPlan = ppctPlans.find(
      (p) => p.grade === grade && normalizeSubjectName(p.subject) === normalizedSubj
    );

    // Substring fallback within the same grade
    if (!matchedPlan) {
      matchedPlan = ppctPlans.find(
        (p) =>
          p.grade === grade &&
          (p.subject.toLowerCase().includes(normalizedSubj.toLowerCase()) ||
            normalizedSubj.toLowerCase().includes(p.subject.toLowerCase()))
      );
    }

    // Fallback: search by exact subject name regardless of grade
    if (!matchedPlan) {
      matchedPlan = ppctPlans.find(
        (p) => normalizeSubjectName(p.subject) === normalizedSubj
      );
    }

    // Fallback: search by fuzzy subject name regardless of grade
    if (!matchedPlan) {
      matchedPlan = ppctPlans.find(
        (p) =>
          p.subject.toLowerCase().includes(normalizedSubj.toLowerCase()) ||
          normalizedSubj.toLowerCase().includes(p.subject.toLowerCase())
      );
    }

    if (!matchedPlan) {
      matchedPlan = ppctPlans.find((p) => p.grade === grade) || ppctPlans[0];
    }

    let lessonName = `${slot.subject} ${slot.className}`;
    let equipment = 'Thước thẳng, bảng phụ, SGK';
    let notes = 'Phòng học';
    let ppctPeriodNumber: number | string = 1;

    if (matchedPlan) {
      const flattened = flattenPPCTPlan(matchedPlan);
      
      // Count actual periods for this class and subject in the timetable
      const actualWeeklySlots = (timetable?.slots || []).filter(
        (s) => s.className === slot.className && normalizeSubjectName(s.subject) === normalizedSubj
      ).length;

      // If timetable has this class & subject slots, use that. Otherwise use standard periods (total / 35 weeks)
      const totalWeeklyPeriods = actualWeeklySlots > 0
        ? actualWeeklySlots
        : Math.round(matchedPlan.totalPeriods / 35) || 1;

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

      // CRITICAL SAFEGUARD: If lessonName is invalid (e.g. "1, 2" or purely numeric or truncated "của đơn thức Thu")
      if (!isValidLessonTitle(lessonName) || lessonName === 'của đơn thức Thu') {
        const standardPlan = FULL_STANDARD_PPCT_PLANS.find(
          (sp) => sp.grade === grade && normalizeSubjectName(sp.subject) === normalizedSubj
        );
        if (standardPlan) {
          const stdFlattened = flattenPPCTPlan(standardPlan);
          const stdLesson = stdFlattened[targetIndex] || stdFlattened[0];
          if (stdLesson) {
            lessonName = stdLesson.lessonTitle;
            if (!equipment || equipment === 'Thước thẳng, máy chiếu' || equipment === 'Thước thẳng, bảng phụ, SGK') {
              equipment = stdLesson.equipment;
            }
            if (!notes || notes === 'Phòng học' || notes === 'của đơn thức Thu' || notes.startsWith('của đơn thức')) {
              notes = stdLesson.notes;
            }
          }
        }
      }

      if (notes === 'của đơn thức Thu' || notes.startsWith('của đơn thức')) {
        notes = 'Nhận biết đơn thức, đơn thức thu gọn, hệ số, phần biến và bậc';
      }
    }

    const dateStr = weekDates[slot.dayOfWeek] || '';
    const { dayLabel, dateLabel } = formatDayDateParts(slot.dayOfWeek, dateStr);
    const dayDateDisplay = formatDayDateDisplay(slot.dayOfWeek, dateStr);

    reportRows.push({
      id: `row-${slot.dayOfWeek}-${slot.session}-${slot.period}-${slot.className}`,
      dayOfWeek: slot.dayOfWeek,
      dayName: DAY_NAME_MAP[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`,
      dateString: dateStr,
      dayDateDisplay: dayDateDisplay,
      dayLabel: dayLabel,
      dateLabel: dateLabel,
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
  dayRowSpan: number; // > 0 if this row renders the "Thứ ngày" cell, 0 if it should be skipped
  sessionRowSpan: number; // > 0 if this row renders the "Buổi" cell, 0 if it should be skipped
}

/**
 * Sắp xếp các dòng báo giảng theo thứ tự chuẩn: Thứ ngày (2..7) -> Buổi (Sáng -> Chiều) -> Tiết theo TKB (1..10)
 */
export function sortReportRows(rows: LessonReportRow[]): LessonReportRow[] {
  return [...rows].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    if (a.session !== b.session) return a.session === 'morning' ? -1 : 1;
    return (Number(a.periodTKB) || 0) - (Number(b.periodTKB) || 0);
  });
}

/**
 * Tính toán số dòng cần gộp ô cho 2 cột "Thứ ngày" và "Buổi" theo quy định:
 * - Các dòng có cùng “Thứ ngày” và cùng “Buổi” được gộp ô ở 2 cột này.
 * - Không gộp theo “tiết liên tiếp”, mà gộp theo đúng điều kiện: Cùng Thứ ngày + Cùng Buổi → gộp.
 * - Các cột Tiết theo TKB, Môn, Lớp, Tiết PPCT, Tên bài dạy, Ghi chú vẫn hiển thị riêng từng tiết.
 */
export function computeReportRowSpans(rows: LessonReportRow[]): RowSpanInfo[] {
  const spans: RowSpanInfo[] = [];
  const n = rows.length;

  for (let i = 0; i < n; i++) {
    // Điều kiện gộp: Cùng Thứ ngày + Cùng Buổi
    const isNewGroup =
      i === 0 ||
      rows[i].dayOfWeek !== rows[i - 1].dayOfWeek ||
      rows[i].session !== rows[i - 1].session ||
      rows[i].dateString !== rows[i - 1].dateString;

    if (isNewGroup) {
      let count = 1;
      while (
        i + count < n &&
        rows[i + count].dayOfWeek === rows[i].dayOfWeek &&
        rows[i + count].session === rows[i].session &&
        rows[i + count].dateString === rows[i].dateString
      ) {
        count++;
      }
      // Gộp ô ở cả 2 cột: Cột 1 (Thứ ngày) và Cột 2 (Buổi)
      spans.push({ dayRowSpan: count, sessionRowSpan: count });
    } else {
      // Các dòng tiếp theo trong cùng nhóm sẽ ẩn ô ở 2 cột này để ô gộp ở dòng đầu tiên bao phủ
      spans.push({ dayRowSpan: 0, sessionRowSpan: 0 });
    }
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


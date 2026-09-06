/**
 * Academic Calendar & Dynamic Week Calculation for Vietnamese General Education
 * (Theo khung kế hoạch thời gian năm học của Bộ GD&ĐT: 35 tuần thực học)
 */

const STORAGE_KEY_WEEK1_DATE = 'baogiang_custom_week1_monday';

/**
 * Find the official Monday of Week 1 for a given school year start.
 * In Vietnam: School year starts in early September (Khai giảng 5/9).
 * Week 1 officially starts on the Monday closest to Sep 5 (between Sep 1 and Sep 8).
 */
export function getDefaultWeek1Monday(schoolYearStartYear: number): Date {
  // Check the Monday on or immediately following Sep 1 - Sep 7
  // Sep 5 is National Opening Day (Lễ Khai giảng)
  const sep5 = new Date(schoolYearStartYear, 8, 5); // Month 8 is September
  const dayOfWeek = sep5.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday

  // If Sep 5 is Monday -> Week 1 starts on Sep 5
  // If Sep 5 is Tue, Wed, Thu, Fri, Sat -> Week 1 starts on the following Monday (Sep 6 - Sep 8)
  // If Sep 5 is Sunday -> Week 1 starts on Monday Sep 6
  let mondayDate: Date;
  if (dayOfWeek === 1) {
    mondayDate = new Date(schoolYearStartYear, 8, 5);
  } else if (dayOfWeek === 0) {
    mondayDate = new Date(schoolYearStartYear, 8, 6);
  } else {
    // 2 (Tue) -> +6 = Sep 11? Usually schools in Vietnam start Week 1 on the Monday of the week of Sep 5 or following Monday
    // Example 2025: Sep 5 was Friday -> Monday Sep 8 is Week 1 (+3 days)
    // Example 2026: Sep 5 is Saturday -> Monday Sep 7 is Week 1 (+2 days)
    // Example 2024: Sep 5 was Thursday -> Monday Sep 9 was Week 1 (+4 days)
    const daysUntilNextMonday = (8 - dayOfWeek) % 7;
    mondayDate = new Date(schoolYearStartYear, 8, 5 + daysUntilNextMonday);
  }

  // Set time to 00:00:00 local time
  mondayDate.setHours(0, 0, 0, 0);
  return mondayDate;
}

/**
 * Determine school year from a given date.
 * If month >= August (month 7 in 0-indexed), school year is Y - (Y+1).
 * If month < August, school year is (Y-1) - Y.
 */
export function getSchoolYearForDate(date: Date = new Date()): {
  startYear: number;
  endYear: number;
  label: string;
} {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 7 = Aug, 8 = Sep

  if (month >= 7) {
    return {
      startYear: year,
      endYear: year + 1,
      label: `${year} - ${year + 1}`,
    };
  } else {
    return {
      startYear: year - 1,
      endYear: year,
      label: `${year - 1} - ${year}`,
    };
  }
}

/**
 * Get the Monday of Week 1, respecting any custom date saved by user in localStorage.
 */
export function getEffectiveWeek1Monday(currentDate: Date = new Date()): Date {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_WEEK1_DATE);
    if (saved) {
      const parsed = new Date(saved);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      }
    }
  } catch {}

  const { startYear } = getSchoolYearForDate(currentDate);
  return getDefaultWeek1Monday(startYear);
}

/**
 * Set a custom Week 1 start date.
 */
export function setCustomWeek1Monday(dateStr: string): void {
  try {
    if (!dateStr) {
      localStorage.removeItem(STORAGE_KEY_WEEK1_DATE);
    } else {
      localStorage.setItem(STORAGE_KEY_WEEK1_DATE, dateStr);
    }
  } catch {}
}

/**
 * Given any date, find the Monday of that date's week (local time).
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0: Sunday, 1: Monday, ...
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Calculate the current academic week (Tuần thực hiện) from the system date.
 * Output is an integer between 1 and 35.
 */
export function getSystemCurrentAcademicWeek(currentDate: Date = new Date()): number {
  const week1Monday = getEffectiveWeek1Monday(currentDate);
  const currentMonday = getMondayOfWeek(currentDate);

  const diffTime = currentMonday.getTime() - week1Monday.getTime();
  const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
  const calculatedWeek = diffWeeks + 1;

  // Clamp to valid range (1 to 35 weeks)
  if (calculatedWeek < 1) return 1;
  if (calculatedWeek > 35) return 35;
  return calculatedWeek;
}

/**
 * Get date mapping for a specific week number.
 * Returns: { 2: 'dd/MM/yyyy', 3: 'dd/MM/yyyy', ..., 7: 'dd/MM/yyyy' }
 * as well as startDate, endDate, and human readable labels.
 */
export function getAcademicWeekDates(
  weekNumber: number,
  baseCurrentDate: Date = new Date()
): {
  dates: { [key: number]: string };
  startDateStr: string;
  endDateStr: string;
  rangeStr: string;
  monday: Date;
  saturday: Date;
} {
  const week1Monday = getEffectiveWeek1Monday(baseCurrentDate);
  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (weekNumber - 1) * 7);

  const dates: { [key: number]: string } = {};

  for (let i = 0; i < 6; i++) {
    const d = new Date(targetMonday);
    d.setDate(targetMonday.getDate() + i);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yearStr = d.getFullYear();
    dates[i + 2] = `${dayStr}/${monthStr}/${yearStr}`;
  }

  const saturday = new Date(targetMonday);
  saturday.setDate(targetMonday.getDate() + 5);

  const startDateStr = dates[2];
  const endDateStr = dates[7];

  return {
    dates,
    startDateStr,
    endDateStr,
    rangeStr: `Từ ${startDateStr} đến ${endDateStr}`,
    monday: targetMonday,
    saturday,
  };
}

/**
 * Get detailed metadata about today's date for display in UI.
 */
export function getTodaySystemInfo(now: Date = new Date()) {
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[now.getDay()];
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const currentWeek = getSystemCurrentAcademicWeek(now);
  const schoolYear = getSchoolYearForDate(now);
  const weekDates = getAcademicWeekDates(currentWeek, now);

  return {
    today: now,
    dayName,
    dateStr,
    fullTodayLabel: `${dayName}, ngày ${dateStr}`,
    currentWeek,
    schoolYearLabel: schoolYear.label,
    currentWeekRange: weekDates.rangeStr,
    isFirstSemester: currentWeek <= 18,
    semesterLabel: currentWeek <= 18 ? 'Học kì I' : 'Học kì II',
  };
}

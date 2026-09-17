import { PPCTPlan, PPCTItem } from '../types';
import { SCHOOL_INFO } from '../data/mockData';

// Helper to compute sequential periods for PPCT (Cột 2: Tiết PPCT)
export function computePPCTPeriods(items: PPCTItem[]): (PPCTItem & { computedPpctPeriod: string; startPeriod: number; endPeriod: number })[] {
  let currentPeriod = 0;
  return items.map((item, idx) => {
    const periodCount = Number(item.periodCount) || 1;
    const startPeriod = currentPeriod + 1;
    const endPeriod = currentPeriod + periodCount;
    currentPeriod = endPeriod;

    let computedPeriodStr = '';
    if (item.ppctPeriod && item.ppctPeriod.trim()) {
      computedPeriodStr = item.ppctPeriod.trim();
    } else {
      if (periodCount === 1) {
        computedPeriodStr = `${startPeriod}`;
      } else {
        computedPeriodStr = `${startPeriod} - ${endPeriod}`;
      }
    }

    return {
      ...item,
      orderNumber: item.orderNumber || idx + 1,
      startPeriod,
      endPeriod,
      computedPpctPeriod: computedPeriodStr,
    };
  });
}

// Generate weekly plan matrix (Kế hoạch giáo dục cá nhân 35 tuần)
export interface WeeklyLessonPlan {
  week: number;
  semester: 1 | 2;
  periodRange: string;
  totalPeriodsInWeek: number;
  lessons: {
    orderNumber: number;
    title: string;
    chapter?: string;
    periods: string;
    periodCount: number;
    yccd?: string;
    digitalAi?: string;
    equipment?: string;
    isAssessment?: boolean;
  }[];
}

export function generateWeeklyPlanMatrix(plan: PPCTPlan): WeeklyLessonPlan[] {
  const computedItems = computePPCTPeriods(plan.items);
  const weeklyPlans: WeeklyLessonPlan[] = [];

  const term1Weeks = plan.term1Weeks || 18;
  const term2Weeks = plan.term2Weeks || 17;
  const totalWeeks = term1Weeks + term2Weeks;

  const periodsPerWeekTerm1 = plan.term1PeriodsPerWeek || Math.ceil(plan.term1Periods / term1Weeks) || 4;
  const periodsPerWeekTerm2 = plan.term2PeriodsPerWeek || Math.ceil(plan.term2Periods / term2Weeks) || 4;

  let currentItemIndex = 0;
  let remainingInCurrentItem = computedItems.length > 0 ? computedItems[0].periodCount : 0;
  let currentPeriodOverall = 1;

  for (let w = 1; w <= totalWeeks; w++) {
    const isTerm1 = w <= term1Weeks;
    const semester = isTerm1 ? 1 : 2;
    const weekCapacity = isTerm1 ? periodsPerWeekTerm1 : periodsPerWeekTerm2;

    let periodsAllocatedThisWeek = 0;
    const weekLessons: WeeklyLessonPlan['lessons'] = [];
    const startPeriodThisWeek = currentPeriodOverall;

    while (periodsAllocatedThisWeek < weekCapacity && currentItemIndex < computedItems.length) {
      const curItem = computedItems[currentItemIndex];
      const periodsCanTake = Math.min(weekCapacity - periodsAllocatedThisWeek, remainingInCurrentItem);

      const itemStart = currentPeriodOverall;
      const itemEnd = currentPeriodOverall + periodsCanTake - 1;
      const periodStr = periodsCanTake === 1 ? `Tiết ${itemStart}` : `Tiết ${itemStart} - ${itemEnd}`;

      weekLessons.push({
        orderNumber: curItem.orderNumber,
        title: curItem.lessonTitle,
        chapter: curItem.chapter,
        periods: periodStr,
        periodCount: periodsCanTake,
        yccd: curItem.objectives || curItem.notes,
        digitalAi: curItem.digitalAndAiCompetencies,
        equipment: curItem.equipment,
        isAssessment: curItem.isAssessment || /kiểm tra|đánh giá|giữa kì|cuối kì/i.test(curItem.lessonTitle),
      });

      periodsAllocatedThisWeek += periodsCanTake;
      currentPeriodOverall += periodsCanTake;
      remainingInCurrentItem -= periodsCanTake;

      if (remainingInCurrentItem <= 0) {
        currentItemIndex++;
        if (currentItemIndex < computedItems.length) {
          remainingInCurrentItem = computedItems[currentItemIndex].periodCount;
        }
      }
    }

    const endPeriodThisWeek = Math.max(startPeriodThisWeek, currentPeriodOverall - 1);
    const rangeStr = periodsAllocatedThisWeek > 0 ? `Tiết ${startPeriodThisWeek} - ${endPeriodThisWeek}` : 'Tuần dự phòng / Ôn tập';

    weeklyPlans.push({
      week: w,
      semester,
      periodRange: rangeStr,
      totalPeriodsInWeek: periodsAllocatedThisWeek,
      lessons: weekLessons,
    });
  }

  return weeklyPlans;
}

// Digital and AI Competency Statistics Report
export interface DigitalAiStat {
  totalLessons: number;
  totalPeriods: number;
  integratedLessonsCount: number;
  integratedPeriodsCount: number;
  percentage: number;
  competencyBreakdown: { code: string; label: string; count: number; lessons: string[] }[];
  detailedItems: (PPCTItem & { codeList: string[] })[];
}

export function analyzeDigitalAndAiCompetencies(plan: PPCTPlan): DigitalAiStat {
  const items = plan.items;
  const totalLessons = items.length;
  const totalPeriods = items.reduce((sum, it) => sum + (Number(it.periodCount) || 1), 0);

  const competencyMap: Record<string, { label: string; count: number; lessons: string[] }> = {
    '1.3.TC2.b': { label: 'Tìm kiếm, đánh giá và khai thác dữ liệu số', count: 0, lessons: [] },
    '3.2.TC2b': { label: 'Xử lý, biểu diễn dữ liệu bằng bảng tính, biểu đồ số', count: 0, lessons: [] },
    '5.3.TC2a': { label: 'Sử dụng công cụ số giải quyết vấn đề thực tế', count: 0, lessons: [] },
    '6.2.a TC1': { label: 'Mô phỏng thí nghiệm ảo / Phần mềm chuyên ngành', count: 0, lessons: [] },
    '7.C1.1.a': { label: 'Khai thác Trí tuệ nhân tạo (AI) hỗ trợ học tập', count: 0, lessons: [] },
    '8.D1.1': { label: 'Nhận biết vai trò và ứng dụng của AI trong đời sống', count: 0, lessons: [] },
    'Khác': { label: 'Năng lực công nghệ số và ứng dụng CNTT khác', count: 0, lessons: [] },
  };

  let integratedLessonsCount = 0;
  let integratedPeriodsCount = 0;
  const detailedItems: (PPCTItem & { codeList: string[] })[] = [];

  items.forEach((item) => {
    const rawAi = (item.digitalAndAiCompetencies || '').trim();
    const rawNotes = (item.notes || '').trim();
    const combined = `${rawAi} ${rawNotes}`;

    // Extract codes using regex
    const codesFound: string[] = [];
    if (/1\.3\.TC2\.?b/i.test(combined)) codesFound.push('1.3.TC2.b');
    if (/3\.2\.TC2b?/i.test(combined)) codesFound.push('3.2.TC2b');
    if (/5\.3\.TC2a?/i.test(combined)) codesFound.push('5.3.TC2a');
    if (/6\.2\.a/i.test(combined) || /MTCT/i.test(combined) || /mô phỏng|geogebra|thí nghiệm ảo/i.test(combined)) codesFound.push('6.2.a TC1');
    if (/7\.C1\.1\.?a/i.test(combined) || /AI\s*hỗ\s*trợ/i.test(combined)) codesFound.push('7.C1.1.a');
    if (/8\.D1\.1/i.test(combined) || /trí tuệ nhân tạo/i.test(combined)) codesFound.push('8.D1.1');

    if (codesFound.length > 0 || rawAi) {
      integratedLessonsCount++;
      integratedPeriodsCount += item.periodCount;

      const finalCodes = codesFound.length > 0 ? codesFound : ['Khác'];
      finalCodes.forEach((c) => {
        if (!competencyMap[c]) {
          competencyMap[c] = { label: 'Mã năng lực số mở rộng', count: 0, lessons: [] };
        }
        competencyMap[c].count++;
        competencyMap[c].lessons.push(`Bài ${item.orderNumber}: ${item.lessonTitle}`);
      });

      detailedItems.push({
        ...item,
        codeList: finalCodes,
      });
    }
  });

  const percentage = totalLessons > 0 ? Math.round((integratedLessonsCount / totalLessons) * 100) : 0;
  const competencyBreakdown = Object.entries(competencyMap)
    .filter(([_, data]) => data.count > 0)
    .map(([code, data]) => ({
      code,
      label: data.label,
      count: data.count,
      lessons: data.lessons,
    }));

  return {
    totalLessons,
    totalPeriods,
    integratedLessonsCount,
    integratedPeriodsCount,
    percentage,
    competencyBreakdown,
    detailedItems,
  };
}

// Assessment Extractor (Giữa kì & Cuối kì)
export interface AssessmentItem {
  type: 'Giữa kì I' | 'Cuối kì I' | 'Giữa kì II' | 'Cuối kì II' | 'Định kì';
  lessonTitle: string;
  period: string;
  timeFrame: string;
  durationMinutes: number;
  periodCount: number;
  objectives: string;
  format: string;
}

export function extractAssessmentSchedule(plan: PPCTPlan): AssessmentItem[] {
  const computed = computePPCTPeriods(plan.items);
  const assessments: AssessmentItem[] = [];

  computed.forEach((item) => {
    const titleLower = item.lessonTitle.toLowerCase();
    const isAssess =
      item.isAssessment ||
      titleLower.includes('kiểm tra') ||
      titleLower.includes('đánh giá') ||
      titleLower.includes('giữa kì') ||
      titleLower.includes('cuối kì') ||
      titleLower.includes('học kì');

    if (isAssess) {
      let type: AssessmentItem['type'] = 'Định kì';
      if (titleLower.includes('giữa') && (titleLower.includes('kì i') || titleLower.includes('kỳ i') || titleLower.includes('kì 1') || titleLower.includes('kỳ 1'))) {
        type = 'Giữa kì I';
      } else if ((titleLower.includes('cuối') || titleLower.includes('học kì')) && (titleLower.includes('kì i') || titleLower.includes('kỳ i') || titleLower.includes('kì 1') || titleLower.includes('kỳ 1'))) {
        type = 'Cuối kì I';
      } else if (titleLower.includes('giữa') && (titleLower.includes('kì ii') || titleLower.includes('kỳ ii') || titleLower.includes('kì 2') || titleLower.includes('kỳ 2'))) {
        type = 'Giữa kì II';
      } else if ((titleLower.includes('cuối') || titleLower.includes('học kì')) && (titleLower.includes('kì ii') || titleLower.includes('kỳ ii') || titleLower.includes('kì 2') || titleLower.includes('kỳ 2'))) {
        type = 'Cuối kì II';
      }

      assessments.push({
        type,
        lessonTitle: item.lessonTitle,
        period: `Tiết ${item.computedPpctPeriod}`,
        timeFrame: item.timeFrame || 'Theo kế hoạch nhà trường',
        durationMinutes: (item.periodCount || 1) * 45,
        periodCount: item.periodCount || 1,
        objectives: item.objectives || item.notes || 'Đánh giá mức độ nhận thức, kĩ năng của học sinh theo chuẩn chương trình GDPT 2018.',
        format: 'Trắc nghiệm khách quan (70%) kết hợp Tự luận (30%) hoặc thực hành',
      });
    }
  });

  return assessments;
}

// Lesson Plan Generator (Soạn KHBD chuẩn CV 5512)
export function generateCV5512LessonPlan(plan: PPCTPlan, item: PPCTItem): string {
  const schoolName = plan.governingBody || 'UBND Phường Đồng Hới – Trường THCS Đồng Phú';
  const subjectName = plan.subject;
  const grade = plan.grade;
  const yccd = item.objectives || item.notes || 'Học sinh nắm vững các kiến thức cốt lõi, phát triển năng lực đặc thù của môn học theo chuẩn GDPT 2018.';
  const digitalAi = item.digitalAndAiCompetencies || '1.3.TC2.b, 7.C1.1.a (Ứng dụng công nghệ số và công cụ AI hỗ trợ thu thập dữ liệu)';
  const equipment = item.equipment || 'Máy chiếu, phiếu học tập, sách giáo khoa, máy tính kết nối Internet';

  return `UBND PHƯỜNG ĐỒNG HỚI
TRƯỜNG THCS ĐỒNG PHÚ
TỔ CHUYÊN MÔN: KHOA HỌC TỰ NHIÊN / TOÁN - TIN

KẾ HOẠCH BÀI DẠY (THEO CÔNG VĂN 5512/BGDĐT-GDTrH)
Môn học: ${subjectName} - Lớp ${grade}
Tên bài dạy: ${item.lessonTitle.toUpperCase()}
Tiết theo PPCT: ${item.ppctPeriod || `Tiết ${item.orderNumber}`} (Thời lượng: ${item.periodCount} tiết)
Thời điểm thực hiện: ${item.timeFrame || 'Tuần ...'}

I. MỤC TIÊU
1. Về kiến thức:
- Căn cứ Yêu cầu cần đạt (YCCĐ):
  + ${yccd.replace(/;\s*/g, '\n  + ')}

2. Về năng lực:
a) Năng lực chung:
- Năng lực tự chủ và tự học: Chủ động nghiên cứu tài liệu, thực hiện các nhiệm vụ học tập cá nhân.
- Năng lực giao tiếp và hợp tác: Tương tác nhóm hiệu quả, thảo luận và phản biện tích cực.
- Năng lực giải quyết vấn đề và sáng tạo: Vận dụng kiến thức bài học giải quyết các tình huống thực tiễn.

b) Năng lực đặc thù & Năng lực số - AI:
- Năng lực đặc thù môn ${subjectName}: Khả năng tính toán, tư duy logic, mô hình hóa và thực nghiệm khoa học.
- Năng lực số (NLS) & Ứng dụng AI (${digitalAi}):
  + Tích hợp mã chuẩn: ${digitalAi}.
  + Học sinh sử dụng phần mềm mô phỏng, bảng tính số, hoặc trợ lý AI để trực quan hóa khái niệm, tra cứu dữ liệu khoa học có chọn lọc.

3. Về phẩm chất:
- Chăm chỉ: Tích cực hoàn thành các bài tập, nhiệm vụ được giao.
- Trách nhiệm: Nghiêm túc hợp tác nhóm và bảo quản thiết bị học tập, tài nguyên số.
- Trung thực: Khách quan trong việc báo cáo số liệu, kết quả thực hành và giải bài toán.

II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. Giáo viên:
- Kế hoạch bài dạy, bài giảng trình chiếu điện tử, máy tính kết nối máy chiếu / màn hình TV.
- Thiết bị chuyên dụng: ${equipment}.
- Học liệu số: Video minh họa, phần mềm mô phỏng (Geogebra / PhET), bộ câu hỏi số hóa.

2. Học sinh:
- Sách giáo khoa, vở ghi, đồ dùng học tập theo môn học.
- Máy tính cầm tay / Thiết bị số cá nhân (khi có yêu cầu thực hành).

III. TIẾN TRÌNH DẠY HỌC
1. Hoạt động 1: Mở đầu / Khởi động (5 - 7 phút)
a) Mục tiêu: Tạo tâm thế hứng thú, kết nối kiến thức cũ với tình huống có vấn đề của bài mới.
b) Nội dung: Giáo viên trình chiếu video/hình ảnh/câu hỏi thực tế liên quan đến "${item.lessonTitle}".
c) Sản phẩm: Câu trả lời, dự đoán hoặc kết quả trò chơi khởi động của học sinh.
d) Tổ chức thực hiện:
- Chuyển giao nhiệm vụ: GV nêu câu hỏi / nhiệm vụ ngắn trên màn hình.
- Thực hiện nhiệm vụ: HS suy nghĩ cá nhân, trao đổi nhanh theo cặp.
- Báo cáo, thảo luận: Đại diện 1-2 HS phát biểu, các HS khác bổ sung.
- Kết luận, nhận định: GV nhận xét, dẫn dắt vào bài học mới.

2. Hoạt động 2: Hình thành kiến thức mới (20 - 25 phút)
a) Mục tiêu: Học sinh lĩnh hội và giải quyết được các YCCĐ cốt lõi của bài học: ${yccd.slice(0, 120)}...
b) Nội dung: Đọc SGK, phân tích bảng biểu, thực hiện phiếu học tập số 1, thí nghiệm / mô phỏng số.
c) Sản phẩm: Phiếu học tập đã hoàn thành, các công thức / định lý / quy tắc được rút ra trong vở ghi.
d) Tổ chức thực hiện:
- Chuyển giao nhiệm vụ: GV chia nhóm 4-6 HS, phát phiếu học tập hoặc giao nhiệm vụ thao tác trên học liệu số.
- Thực hiện nhiệm vụ: HS làm việc nhóm, thảo luận, ghi chép kết quả. GV theo dõi hỗ trợ các nhóm gặp khó khăn.
- Báo cáo, thảo luận: Mời đại diện nhóm trình bày trên bảng / máy chiếu; các nhóm phản biện chéo.
- Kết luận, nhận định: GV chuẩn hóa kiến thức, chốt các nội dung trọng tâm và nhấn mạnh lưu ý quan trọng.

3. Hoạt động 3: Luyện tập (10 - 12 phút)
a) Mục tiêu: Củng cố, rèn luyện kĩ năng vận dụng kiến thức vừa học để giải bài tập, xử lý tình huống điển hình.
b) Nội dung: Hệ thống bài tập nhận biết - thông hiểu, trò chơi củng cố (Quizizz / Kahoot hoặc bảng phụ).
c) Sản phẩm: Lời giải bài tập của học sinh trong vở và trên bảng.
d) Tổ chức thực hiện:
- Chuyển giao nhiệm vụ: GV giao bài tập trong SGK / phiếu bài tập.
- Thực hiện nhiệm vụ: HS làm bài độc lập, sau đó đổi chéo vở kiểm tra.
- Báo cáo, thảo luận: Gọi 2 HS lên bảng chữa bài, lớp nhận xét.
- Kết luận: GV sửa lỗi sai phổ biến và cho điểm động viên.

4. Hoạt động 4: Vận dụng & Mở rộng (3 - 5 phút)
a) Mục tiêu: Phát triển năng lực sáng tạo, vận dụng kiến thức bài học vào thực tiễn đời sống gia đình và xã hội.
b) Nội dung: Nhiệm vụ dự án nhỏ hoặc tìm hiểu thêm ứng dụng thực tế ngoài cuộc sống.
c) Sản phẩm: Báo cáo ngắn, sản phẩm mô hình hoặc lời giải bài toán thực tế nộp vào tiết sau.
d) Hướng dẫn về nhà:
- Ôn tập kiến thức bài học theo sơ đồ tư duy.
- Chuẩn bị nội dung cho bài học tiếp theo.
`;
}

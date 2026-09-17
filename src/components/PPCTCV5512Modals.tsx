import React, { useState } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  Award,
  BookOpen,
  FileText,
  Copy,
  Check,
  Download,
  Clock,
  Printer,
  Edit,
  Save,
  CheckCircle2,
  Brain,
  Cpu,
  Table,
} from 'lucide-react';
import { PPCTPlan, PPCTItem } from '../types';
import {
  generateWeeklyPlanMatrix,
  analyzeDigitalAndAiCompetencies,
  extractAssessmentSchedule,
  generateCV5512LessonPlan,
  WeeklyLessonPlan,
  DigitalAiStat,
  AssessmentItem,
} from '../utils/ppctCV5512Helper';

// 1. MODAL: KẾ HOẠCH GIÁO DỤC CÁ NHÂN THEO TUẦN (35 TUẦN)
export const WeeklyPlanModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  plan: PPCTPlan;
}> = ({ isOpen, onClose, plan }) => {
  const [selectedSemester, setSelectedSemester] = useState<'ALL' | '1' | '2'>('ALL');
  if (!isOpen) return null;

  const weeklyPlans = generateWeeklyPlanMatrix(plan);
  const filteredWeeks = weeklyPlans.filter((w) => {
    if (selectedSemester === '1') return w.semester === 1;
    if (selectedSemester === '2') return w.semester === 2;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <Calendar className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Ma Trận Phân Bổ Kế Hoạch Dạy Học 35 Tuần (Khung CV 5512)
              </h3>
              <p className="text-xs text-emerald-200">
                Môn: <strong>{plan.subject}</strong> - Lớp: <strong>{plan.grade}</strong> ({plan.totalPeriods} tiết / 35 tuần)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In ma trận</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Xem theo học kì:</span>
            <div className="flex p-0.5 bg-white rounded-lg border border-slate-300">
              <button
                onClick={() => setSelectedSemester('ALL')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  selectedSemester === 'ALL' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cả năm (35 tuần)
              </button>
              <button
                onClick={() => setSelectedSemester('1')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  selectedSemester === '1' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Học kì I (Tuần 1 - 18)
              </button>
              <button
                onClick={() => setSelectedSemester('2')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  selectedSemester === '2' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Học kì II (Tuần 19 - 35)
              </button>
            </div>
          </div>
          <span className="text-slate-500 font-medium">
            Hiển thị: <strong>{filteredWeeks.length}</strong> tuần
          </span>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="p-3 w-16 text-center border-r border-slate-200">Tuần</th>
                  <th className="p-3 w-28 text-center border-r border-slate-200">Tiết PPCT</th>
                  <th className="p-3 border-r border-slate-200 min-w-[280px]">Nội dung bài học / Chủ đề giảng dạy</th>
                  <th className="p-3 w-20 text-center border-r border-slate-200">Số tiết</th>
                  <th className="p-3 min-w-[220px]">Năng lực số / AI tích hợp & Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredWeeks.map((week) => (
                  <tr key={week.week} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-center font-bold text-slate-700 border-r border-slate-200 bg-slate-50/40">
                      Tuần {week.week}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        (HK{week.semester})
                      </span>
                    </td>
                    <td className="p-3 text-center font-semibold text-emerald-800 border-r border-slate-200">
                      {week.periodRange}
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      {week.lessons.length === 0 ? (
                        <span className="text-slate-400 italic">Tuần dự phòng / Ôn tập củng cố</span>
                      ) : (
                        <div className="space-y-1.5">
                          {week.lessons.map((ls, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="font-bold text-slate-800">
                                {ls.isAssessment ? '🚩' : '•'} Bài {ls.orderNumber}: {ls.title}
                              </span>
                              <span className="text-[11px] text-emerald-700 font-semibold shrink-0">
                                ({ls.periods})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800 border-r border-slate-200">
                      {week.totalPeriodsInWeek} tiết
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {week.lessons.map((ls, idx) =>
                          ls.digitalAi ? (
                            <div key={idx} className="flex items-center gap-1 text-[11px] text-indigo-700 font-medium">
                              <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>{ls.digitalAi}</span>
                            </div>
                          ) : null
                        )}
                        {week.lessons.every((l) => !l.digitalAi) && (
                          <span className="text-slate-400 text-[11px] italic">Theo thiết bị chuẩn</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. MODAL: THỐNG KÊ NĂNG LỰC SỐ VÀ AI
export const DigitalAiStatsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  plan: PPCTPlan;
}> = ({ isOpen, onClose, plan }) => {
  if (!isOpen) return null;
  const stats = analyzeDigitalAndAiCompetencies(plan);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <Brain className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Thống Kê Tích Hợp Năng Lực Số & AI Trong PPCT
              </h3>
              <p className="text-xs text-indigo-200">
                Môn: <strong>{plan.subject}</strong> - Lớp: <strong>{plan.grade}</strong> (Theo quy chuẩn chuyển đổi số ngành Giáo dục)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Highlight KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Tổng số bài học</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalLessons}</p>
              <span className="text-[11px] text-slate-400">Toàn khóa cả năm</span>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="text-xs text-indigo-700 font-medium">Số bài tích hợp NLS & AI</span>
              <p className="text-2xl font-black text-indigo-900 mt-1">{stats.integratedLessonsCount}</p>
              <span className="text-[11px] text-indigo-600 font-semibold">Tương đương {stats.integratedPeriodsCount} tiết</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs text-emerald-700 font-medium">Tỷ lệ tích hợp</span>
              <p className="text-2xl font-black text-emerald-800 mt-1">{stats.percentage}%</p>
              <span className="text-[11px] text-emerald-600">Đạt chuẩn GDPT 2018</span>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-xs text-amber-700 font-medium">Số nhóm mã chuẩn</span>
              <p className="text-2xl font-black text-amber-800 mt-1">{stats.competencyBreakdown.length}</p>
              <span className="text-[11px] text-amber-600">Mã năng lực số/AI</span>
            </div>
          </div>

          {/* Breakdown by Competency Code */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              Phân loại theo từng mã Năng lực số & AI quy định:
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <th className="p-3 w-32 border-r border-slate-200">Mã định danh</th>
                    <th className="p-3 border-r border-slate-200">Tên năng lực quy chuẩn</th>
                    <th className="p-3 w-24 text-center border-r border-slate-200">Số bài</th>
                    <th className="p-3 min-w-[200px]">Các bài học áp dụng cụ thể</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.competencyBreakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-indigo-800 border-r border-slate-200">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200">
                          {item.code}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                        {item.label}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900 border-r border-slate-200">
                        {item.count}
                      </td>
                      <td className="p-3 text-slate-600">
                        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                          {item.lessons.slice(0, 4).map((ls, lIdx) => (
                            <li key={lIdx} className="truncate max-w-md">{ls}</li>
                          ))}
                          {item.lessons.length > 4 && (
                            <li className="text-indigo-600 font-semibold">
                              và {item.lessons.length - 4} bài học khác...
                            </li>
                          )}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. MODAL: TRÍCH XUẤT LỊCH VÀ MA TRẬN KIỂM TRA ĐỊNH KÌ (GIỮA KÌ & CUỐI KÌ)
export const AssessmentScheduleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  plan: PPCTPlan;
}> = ({ isOpen, onClose, plan }) => {
  if (!isOpen) return null;
  const assessments = extractAssessmentSchedule(plan);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <Award className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Kế Hoạch & Thời Điểm Kiểm Tra Định Kì (Giữa Kì, Cuối Kì)
              </h3>
              <p className="text-xs text-rose-200">
                Môn: <strong>{plan.subject}</strong> - Lớp: <strong>{plan.grade}</strong> (Năm học 2026 - 2027)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Quy định khảo thí: </strong>
              Thời điểm kiểm tra định kì phải được thực hiện đúng tuần và tiết quy định trong Kế hoạch dạy học của tổ chuyên môn đã được Hiệu trưởng phê duyệt.
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="p-3 w-32 border-r border-slate-200">Đợt đánh giá</th>
                  <th className="p-3 w-28 text-center border-r border-slate-200">Tiết PPCT</th>
                  <th className="p-3 w-28 text-center border-r border-slate-200">Thời điểm</th>
                  <th className="p-3 w-24 text-center border-r border-slate-200">Thời lượng</th>
                  <th className="p-3 border-r border-slate-200 min-w-[200px]">Yêu cầu cần đạt / Trọng tâm kiến thức</th>
                  <th className="p-3 w-40">Hình thức kiểm tra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assessments.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="p-3 font-bold text-rose-900 border-r border-slate-200">
                      <span className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 inline-block">
                        {item.type}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800 border-r border-slate-200">
                      {item.period}
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-700 border-r border-slate-200">
                      {item.timeFrame}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-800 border-r border-slate-200">
                      {item.durationMinutes} phút
                    </td>
                    <td className="p-3 text-slate-700 border-r border-slate-200 whitespace-pre-line">
                      {item.objectives}
                    </td>
                    <td className="p-3 text-slate-600 font-medium text-[11px]">
                      {item.format}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. MODAL: SOẠN KẾ HOẠCH BÀI DẠY (GIÁO ÁN CHUẨN CV 5512)
export const LessonPlan5512Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  plan: PPCTPlan;
  item: PPCTItem | null;
}> = ({ isOpen, onClose, plan, item }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen || !item) return null;

  const lessonPlanText = generateCV5512LessonPlan(plan, item);

  const handleCopy = () => {
    navigator.clipboard.writeText(lessonPlanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([lessonPlanText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KHBD_5512_${plan.subject}_Lop${plan.grade}_Bai${item.orderNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Kế Hoạch Bài Dạy Chuẩn Công Văn 5512/BGDĐT-GDTrH
              </h3>
              <p className="text-xs text-slate-300">
                {item.lessonTitle} (Thời lượng: {item.periodCount} tiết - {item.timeFrame})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                copied ? 'bg-emerald-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép giáo án'}</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải tệp văn bản</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Textarea */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
            {lessonPlanText}
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. MODAL: CHỈNH SỬA THÔNG TIN HÀNH CHÍNH (KHỐI 1 & KHỐI 3)
export const EditMetadataModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  plan: PPCTPlan;
  onSave: (updatedPlan: PPCTPlan) => void;
}> = ({ isOpen, onClose, plan, onSave }) => {
  const [governingBody, setGoverningBody] = useState(plan.governingBody || 'UBND Phường Đồng Hới – Trường THCS Đồng Phú');
  const [legalBasis, setLegalBasis] = useState(plan.legalBasis || 'Theo CV 5512/BGDĐT-GDTrH và CV 5636/BGDĐT-GDTrH');
  const [totalWeeks, setTotalWeeks] = useState(plan.totalWeeks || 35);
  const [term1Weeks, setTerm1Weeks] = useState(plan.term1Weeks || 18);
  const [term1PeriodsPerWeek, setTerm1PeriodsPerWeek] = useState(plan.term1PeriodsPerWeek || 4);
  const [term2Weeks, setTerm2Weeks] = useState(plan.term2Weeks || 17);
  const [term2PeriodsPerWeek, setTerm2PeriodsPerWeek] = useState(plan.term2PeriodsPerWeek || 4);
  const [approvalLocationDate, setApprovalLocationDate] = useState(plan.approvalLocationDate || 'Đồng Hới, ngày 04 tháng 9 năm 2026');
  const [headmasterName, setHeadmasterName] = useState(plan.headmasterName || 'Nguyễn Văn Thuận');
  const [headOfDepartmentName, setHeadOfDepartmentName] = useState(plan.headOfDepartmentName || 'Trần Thị Mai Lan');
  const [teacherName, setTeacherName] = useState(plan.teacherName || 'Phan Sơn');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...plan,
      governingBody,
      legalBasis,
      totalWeeks,
      term1Weeks,
      term1PeriodsPerWeek,
      term2Weeks,
      term2PeriodsPerWeek,
      approvalLocationDate,
      headmasterName,
      headOfDepartmentName,
      teacherName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-base">Chỉnh Sửa Thông Tin Hành Chính & Phê Duyệt (CV 5512)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Đơn vị chủ quản & Trường (Khối 1):</label>
            <input
              type="text"
              value={governingBody}
              onChange={(e) => setGoverningBody(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Căn cứ pháp lý:</label>
            <input
              type="text"
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Số tuần Học kì I:</label>
              <input
                type="number"
                value={term1Weeks}
                onChange={(e) => setTerm1Weeks(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Số tiết / tuần HK I:</label>
              <input
                type="number"
                value={term1PeriodsPerWeek}
                onChange={(e) => setTerm1PeriodsPerWeek(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Số tuần Học kì II:</label>
              <input
                type="number"
                value={term2Weeks}
                onChange={(e) => setTerm2Weeks(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Số tiết / tuần HK II:</label>
              <input
                type="number"
                value={term2PeriodsPerWeek}
                onChange={(e) => setTerm2PeriodsPerWeek(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <h4 className="font-bold text-slate-800 mb-2">Thông tin Khối 3: Phê duyệt & Ký tên</h4>
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Địa danh và ngày tháng:</label>
                <input
                  type="text"
                  value={approvalLocationDate}
                  onChange={(e) => setApprovalLocationDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ban Giám hiệu:</label>
                  <input
                    type="text"
                    value={headmasterName}
                    onChange={(e) => setHeadmasterName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tổ trưởng CM:</label>
                  <input
                    type="text"
                    value={headOfDepartmentName}
                    onChange={(e) => setHeadOfDepartmentName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giáo viên:</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
};

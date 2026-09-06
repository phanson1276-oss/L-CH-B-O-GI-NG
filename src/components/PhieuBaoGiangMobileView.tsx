import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  FileSpreadsheet,
  FileText,
  Printer,
  Copy,
  Check,
  Edit2,
  Trash2,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Bookmark,
  RefreshCw,
  RotateCcw,
  Share2,
  Home,
} from 'lucide-react';
import { LessonReportRow, Teacher, TimetableData, TimetableVersion } from '../types';
import { getTodaySystemInfo } from '../utils/academicCalendar';

interface PhieuBaoGiangMobileViewProps {
  reportRows: LessonReportRow[];
  selectedWeek: number;
  setSelectedWeek: (w: number) => void;
  currentTeacher: Teacher;
  teachers: Teacher[];
  selectedTeacherShortName: string;
  setSelectedTeacherShortName: (shortName: string) => void;
  startDateStr: string;
  endDateStr: string;
  activeTimetable: TimetableData;
  onStartEdit: (row: LessonReportRow) => void;
  onDeleteRow: (id: string) => void;
  onAddManualRow: () => void;
  onAutoGenerate: () => void;
  onExportExcel: () => void;
  onExportWord: () => void;
  onExportAllWord?: () => void;
  onExportPdf: () => void;
  onOpenTemplateModal: () => void;
  onSwitchToDesktopView: () => void;
  onGoHome?: () => void;
}

export const PhieuBaoGiangMobileView: React.FC<PhieuBaoGiangMobileViewProps> = ({
  reportRows = [],
  selectedWeek,
  setSelectedWeek,
  currentTeacher,
  teachers = [],
  selectedTeacherShortName,
  setSelectedTeacherShortName,
  startDateStr,
  endDateStr,
  activeTimetable,
  onStartEdit,
  onDeleteRow,
  onAddManualRow,
  onAutoGenerate,
  onExportExcel,
  onExportWord,
  onExportAllWord,
  onExportPdf,
  onOpenTemplateModal,
  onSwitchToDesktopView,
  onGoHome,
}) => {
  // Filter by day: 0 = All, 2 = Thứ 2, 3 = Thứ 3, ..., 7 = Thứ 7
  const [selectedDayFilter, setSelectedDayFilter] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const systemInfo = useMemo(() => getTodaySystemInfo(), []);
  const currentSystemWeek = systemInfo.currentWeek;

  const daysList = [
    { day: 2, label: 'Thứ 2', fullLabel: 'Thứ Hai' },
    { day: 3, label: 'Thứ 3', fullLabel: 'Thứ Ba' },
    { day: 4, label: 'Thứ 4', fullLabel: 'Thứ Tư' },
    { day: 5, label: 'Thứ 5', fullLabel: 'Thứ Năm' },
    { day: 6, label: 'Thứ 6', fullLabel: 'Thứ Sáu' },
    { day: 7, label: 'Thứ 7', fullLabel: 'Thứ Bảy' },
  ];

  // Count lessons per day
  const lessonsPerDay = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let d = 2; d <= 7; d++) counts[d] = 0;
    (reportRows || []).forEach((r) => {
      if (counts[r.dayOfWeek] !== undefined) counts[r.dayOfWeek]++;
    });
    return counts;
  }, [reportRows]);

  // Filtered rows
  const displayedRows = useMemo(() => {
    if (selectedDayFilter === 0) return reportRows || [];
    return (reportRows || []).filter((r) => r.dayOfWeek === selectedDayFilter);
  }, [reportRows, selectedDayFilter]);

  // Morning vs afternoon counts
  const morningCount = (reportRows || []).filter((r) => r.session === 'morning').length;
  const afternoonCount = (reportRows || []).filter((r) => r.session === 'afternoon').length;

  const handleCopyRow = (row: LessonReportRow) => {
    const text = `[Lịch Dạy ${row.dayName} - Tiết ${row.periodTKB} (${row.session === 'morning' ? 'Sáng' : 'Chiều'})]\nLớp: ${row.className} • Môn: ${row.subject}\nTiết PPCT: ${row.ppctPeriodNumber}\nBài dạy: ${row.lessonName}\nThiết bị: ${row.equipment || 'Không có'}\nGhi chú: ${row.notes || 'Không có'}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(row.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-3 pb-24 text-slate-900" id="phieu-bao-giang-mobile-view">
      {/* Mobile Top Header Banner */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 text-white rounded-2xl p-4 shadow-sm space-y-3">
        {/* Top small bar with Trang chủ */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs">
          <span className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
            Báo Giảng Di Động • {activeTimetable?.title || 'Thời khóa biểu'}
          </span>
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-1 text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Trở về Trang chủ"
            >
              <Home className="w-3.5 h-3.5 text-amber-300" />
              <span>Trang chủ</span>
            </button>
          )}
        </div>

        {/* Week navigation & Title */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={selectedWeek <= 1}
            onClick={() => setSelectedWeek(selectedWeek - 1)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
            title="Tuần trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-[11px] uppercase tracking-wider text-amber-300 font-bold block">
              Báo Giảng Di Động • {activeTimetable?.title || 'Thời khóa biểu'}
            </span>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>TUẦN {selectedWeek}</span>
              {selectedWeek === currentSystemWeek ? (
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full">
                  Hiện tại
                </span>
              ) : null}
            </h2>
            <span className="text-xs font-normal text-blue-200">
              ({startDateStr} - {endDateStr})
            </span>
          </div>

          <button
            type="button"
            disabled={selectedWeek >= 35}
            onClick={() => setSelectedWeek(selectedWeek + 1)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
            title="Tuần kế tiếp"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quick jump to current system week button if browsing other week */}
        {selectedWeek !== currentSystemWeek && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setSelectedWeek(currentSystemWeek)}
              className="text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
              <span>Về Tuần {currentSystemWeek} theo ngày hệ thống ({systemInfo.dateStr})</span>
            </button>
          </div>
        )}

        {/* Teacher selector & stats */}
        <div className="pt-2 border-t border-white/15 space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-300 shrink-0" />
            <select
              value={selectedTeacherShortName}
              onChange={(e) => setSelectedTeacherShortName(e.target.value)}
              className="w-full bg-white/15 text-white font-bold text-sm rounded-xl px-3 py-2 border border-white/20 focus:outline-hidden focus:bg-slate-900 focus:text-white"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.shortName} className="text-slate-900 bg-white">
                  {t.name} ({t.shortName}) - {t.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Stats Pill */}
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-white/10 rounded-xl p-2">
              <span className="block text-[10px] text-blue-200">Tổng số tiết</span>
              <span className="text-base font-black text-amber-300">{reportRows.length}</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <span className="block text-[10px] text-blue-200">Buổi sáng</span>
              <span className="text-base font-black text-white">{morningCount}</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <span className="block text-[10px] text-blue-200">Buổi chiều</span>
              <span className="text-base font-black text-white">{afternoonCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Export & Action Buttons */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
          <span>Xuất tệp & In ấn chuẩn A4:</span>
          <button
            type="button"
            onClick={onSwitchToDesktopView}
            className="text-blue-700 font-bold hover:underline"
          >
            Xem bảng A4 chuẩn →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Word .docx */}
          <button
            type="button"
            onClick={onExportWord}
            className="flex flex-col items-center justify-center p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl border border-blue-200 font-bold text-xs transition-all active:scale-95 min-h-[48px]"
            title="Xuất phiếu báo giảng khổ A4 dọc (.docx)"
          >
            <FileText className="w-4 h-4 text-blue-600 mb-1" />
            <span>Word (.docx)</span>
          </button>

          {/* Word All Teachers */}
          {onExportAllWord && (
            <button
              type="button"
              onClick={onExportAllWord}
              className="flex flex-col items-center justify-center p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl border border-indigo-200 font-bold text-xs transition-all active:scale-95 min-h-[48px]"
              title="Xuất toàn bộ giáo viên tuần này ra Word (.docx) nộp BGH"
            >
              <FileText className="w-4 h-4 text-indigo-600 mb-1" />
              <span>Toàn trường (.docx)</span>
            </button>
          )}

          {/* Excel */}
          <button
            type="button"
            onClick={onExportExcel}
            className="flex flex-col items-center justify-center p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 font-bold text-xs transition-all active:scale-95 min-h-[48px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-1" />
            <span>Tải Excel</span>
          </button>

          {/* PDF / In */}
          <button
            type="button"
            onClick={onExportPdf}
            className="flex flex-col items-center justify-center p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all active:scale-95 min-h-[48px]"
          >
            <Printer className="w-4 h-4 text-amber-300 mb-1" />
            <span>In / PDF</span>
          </button>
        </div>

        {/* Sync & Template actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onAutoGenerate}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors min-h-[40px]"
            title="Đồng bộ lại từ TKB & PPCT"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Đồng bộ TKB & PPCT</span>
          </button>

          <button
            type="button"
            onClick={onOpenTemplateModal}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl text-xs font-bold transition-colors min-h-[40px]"
            title="Lưu hoặc áp dụng mẫu tuần"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-700" />
            <span>Mẫu tuần</span>
          </button>

          <button
            type="button"
            onClick={onAddManualRow}
            className="flex items-center justify-center p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors min-h-[40px] min-w-[40px]"
            title="Thêm tiết dạy mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day Selector Horizontal Scroll / Pills */}
      <div className="sticky top-14 z-20 bg-slate-50/95 backdrop-blur-md py-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* Tất cả */}
          <button
            type="button"
            onClick={() => setSelectedDayFilter(0)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 min-h-[38px] ${
              selectedDayFilter === 0
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Tất cả</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedDayFilter === 0 ? 'bg-white/20' : 'bg-slate-100'}`}>
              {reportRows.length}
            </span>
          </button>

          {/* Thứ 2 to Thứ 7 */}
          {daysList.map((d) => {
            const count = lessonsPerDay[d.day] || 0;
            const isSelected = selectedDayFilter === d.day;
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelectedDayFilter(d.day)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 min-h-[38px] ${
                  isSelected
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{d.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/25 text-white' : count > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lessons Cards List */}
      <div className="space-y-2.5">
        {displayedRows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {selectedDayFilter === 0
                ? 'Chưa có tiết giảng dạy nào trong tuần này'
                : `Không có tiết dạy vào ${daysList.find((d) => d.day === selectedDayFilter)?.fullLabel}`}
            </p>
            <p className="text-xs text-slate-500">
              Nhấn nút &quot;Đồng bộ TKB & PPCT&quot; hoặc &quot;Thêm tiết dạy&quot; để bổ sung lịch giảng dạy.
            </p>
            <button
              type="button"
              onClick={onAutoGenerate}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đồng bộ từ TKB & PPCT</span>
            </button>
          </div>
        ) : (
          displayedRows.map((row) => {
            const isMorning = row.session === 'morning';
            const isCopied = copiedId === row.id;

            return (
              <div
                key={row.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-blue-300"
              >
                {/* Card Top: Day, Session, Period, Class */}
                <div className="p-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {row.dayName}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        isMorning
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                      }`}
                    >
                      {isMorning ? <Sun className="w-3 h-3 text-amber-600" /> : <Moon className="w-3 h-3 text-indigo-600" />}
                      <span>{isMorning ? 'Sáng' : 'Chiều'} • Tiết {row.period}</span>
                    </span>
                  </div>

                  <span className="font-black text-xs bg-blue-700 text-white px-2.5 py-1 rounded-lg shadow-2xs">
                    {row.className}
                  </span>
                </div>

                {/* Card Main Body */}
                <div className="p-3.5 space-y-2">
                  {/* Subject & PPCT Number */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-blue-900">
                      Môn: {row.subject}
                    </span>
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-200">
                      Tiết PPCT: <strong>{row.ppctIndex}</strong>
                    </span>
                  </div>

                  {/* Lesson Name */}
                  <div className="pt-0.5">
                    <span className="text-[11px] text-slate-500 font-medium block">Tên bài dạy:</span>
                    <p className="text-sm font-bold text-slate-900 leading-snug">
                      {row.lessonName}
                    </p>
                  </div>

                  {/* Equipment & Notes if present */}
                  {(row.equipment || row.notes) && (
                    <div className="pt-1.5 border-t border-slate-100 grid grid-cols-1 gap-1 text-xs">
                      {row.equipment && (
                        <div className="text-slate-600">
                          <span className="font-semibold text-slate-700">Thiết bị: </span>
                          <span>{row.equipment}</span>
                        </div>
                      )}
                      {row.notes && (
                        <div className="text-slate-600">
                          <span className="font-semibold text-slate-700">Ghi chú: </span>
                          <span className="text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded font-medium">{row.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons: Minimum 44px touch targets */}
                <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyRow(row)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
                        isCopied
                          ? 'bg-emerald-100 text-emerald-800 font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                      title="Sao chép thông tin tiết học"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onStartEdit(row)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 transition-colors min-h-[36px]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteRow(row.id)}
                      className="flex items-center justify-center p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors min-h-[36px] min-w-[36px]"
                      title="Xóa tiết dạy này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

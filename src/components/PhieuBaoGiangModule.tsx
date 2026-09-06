import React, { useState, useEffect, useMemo } from 'react';
import { Download, Printer, FileSpreadsheet, FileText, RefreshCw, Plus, Trash2, Edit2, Check, User, Calendar, Sparkles, Building, CheckCircle2, ChevronRight, Upload, Users, Tag, X, MessageSquarePlus, Bookmark, Copy, Layers, Clock, Smartphone, Monitor, Home } from 'lucide-react';
import { LessonReportRow, TimetableData, PPCTPlan, WeeklyReportConfig, Teacher, WeekTemplate, TimetableVersion, DeviceMode } from '../types';
import { TEACHERS_LIST, SCHOOL_INFO } from '../data/mockData';
import { generateWeeklyReport, getWeekDates, computeReportRowSpans, getTimetableForWeek } from '../utils/generator';
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
  const currentTeacher: Teacher = useMemo(() => {
    const found = teachers?.find((t) => t.shortName.toLowerCase() === selectedTeacherShortName.toLowerCase());
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

  // Mobile view format: 'cards' (card-based day by day) vs 'table' (A4 printable table)
  const [mobileViewFormat, setMobileViewFormat] = useState<'cards' | 'table'>('cards');

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

  const [reportRows, setReportRows] = useState<LessonReportRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Compute merged rowSpans for Ngày thứ and Buổi
  const rowSpans = useMemo(() => computeReportRowSpans(reportRows), [reportRows]);

  // Week Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Quick note modal/popover state
  const [activeQuickNoteRowId, setActiveQuickNoteRowId] = useState<string | null>(null);
  const [customNoteInput, setCustomNoteInput] = useState('');

  // Editing row state
  const [editSubject, setEditSubject] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editPPCT, setEditPPCT] = useState<string | number>('');
  const [editLessonName, setEditLessonName] = useState('');
  const [editEquipment, setEditEquipment] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
  };

  useEffect(() => {
    handleAutoGenerate();
  }, [selectedTeacherShortName, selectedWeek, activeTimetable, ppctPlans]);

  const handleStartEdit = (row: LessonReportRow) => {
    setEditingRowId(row.id);
    setEditSubject(row.subject);
    setEditClass(row.className);
    setEditPPCT(row.ppctPeriodNumber);
    setEditLessonName(row.lessonName);
    setEditEquipment(row.equipment);
    setEditNotes(row.notes);
  };

  const handleSaveEdit = (rowId: string) => {
    setReportRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              subject: editSubject,
              className: editClass,
              ppctPeriodNumber: editPPCT,
              lessonName: editLessonName,
              equipment: editEquipment,
              notes: editNotes,
            }
          : r
      )
    );
    setEditingRowId(null);
  };

  const handleDeleteRow = (rowId: string) => {
    setReportRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleAddManualRow = () => {
    const newRow: LessonReportRow = {
      id: `manual-row-${Date.now()}`,
      dayOfWeek: 2,
      dayName: 'Hai',
      dateString: startDateStr,
      session: 'morning',
      periodTKB: 1,
      subject: currentTeacher.subject.split(' ')[0] || 'Toán',
      className: '8.1',
      ppctPeriodNumber: 1,
      lessonName: 'Tiết dạy bổ sung / Ôn tập chuyên đề',
      equipment: 'Thước thẳng, máy chiếu',
      notes: 'Dạy bù',
    };
    setReportRows((prev) => [...prev, newRow]);
    handleStartEdit(newRow);
  };

  // Quick note update helper
  const handleApplyQuickNote = (rowId: string, noteText: string) => {
    setReportRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, notes: noteText } : r))
    );
    setActiveQuickNoteRowId(null);
  };

  // Apply template customizations into current report rows
  const handleApplyTemplate = (
    template: WeekTemplate,
    mode: 'notes_equipment_only' | 'full'
  ) => {
    setReportRows((prevRows) => {
      return prevRows.map((row) => {
        // Priority 1: Match by exact slot (dayOfWeek + periodTKB + className)
        let match = template.customizations.find(
          (c) =>
            c.dayOfWeek === row.dayOfWeek &&
            c.periodTKB === row.periodTKB &&
            c.className === row.className
        );

        // Priority 2: Fallback to match by className + subject
        if (!match) {
          match = template.customizations.find(
            (c) => c.className === row.className && c.subject === row.subject
          );
        }

        if (match) {
          return {
            ...row,
            notes: match.notes !== undefined && match.notes !== '' ? match.notes : row.notes,
            equipment:
              match.equipment !== undefined && match.equipment !== ''
                ? match.equipment
                : row.equipment,
            ...(mode === 'full' && match.customLessonName
              ? { lessonName: match.customLessonName }
              : {}),
          };
        }
        return row;
      });
    });
  };

  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setExportSuccess(message);
    setTimeout(() => setExportSuccess(null), 4000);
  };

  // Export handlers
  const handleExportExcel = () => {
    exportLessonReportToExcel(reportRows, reportConfig);
    setExportSuccess('Đã xuất thành công tệp Excel (.xlsx) chuẩn phiếu báo giảng!');
    setTimeout(() => setExportSuccess(null), 4000);
  };

  // Modern Word .docx export (A4 Portrait, 21cm x 29.7cm)
  const handleExportWordDocx = async (allTeachers: boolean = false) => {
    setIsExportingDocx(true);
    try {
      if (allTeachers) {
        const count = await exportAllTeachersReportsToDocx(
          activeTimetable,
          ppctPlans,
          teachers,
          selectedWeek,
          SCHOOL_INFO
        );
        showToast(`Đã xuất thành công tệp Word (.docx) toàn bộ ${count} giáo viên tuần ${selectedWeek} (khổ A4 dọc để nộp BGH)!`);
      } else {
        await exportLessonReportToDocx(reportRows, reportConfig, SCHOOL_INFO.campus);
        showToast(`Đã xuất thành công tệp Word (.docx) của GV ${currentTeacher.name} tuần ${selectedWeek} (khổ A4 dọc 21cm x 29.7cm)!`);
      }
    } catch (err) {
      console.error('Lỗi khi xuất Word .docx:', err);
      // Fallback to .doc if error
      exportLessonReportToWord(reportRows, reportConfig);
      showToast('Đã tải tệp Word dự phòng (.doc)!');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportWordLegacy = () => {
    exportLessonReportToWord(reportRows, reportConfig);
    setExportSuccess('Đã xuất thành công tệp Word (.doc) tương thích Microsoft Office!');
    setTimeout(() => setExportSuccess(null), 4000);
  };

  const handleExportPdf = () => {
    exportLessonReportToPdf(reportRows, reportConfig);
    setExportSuccess('Đã mở cửa sổ xuất PDF / In ấn chuẩn A4 phiếu báo giảng!');
    setTimeout(() => setExportSuccess(null), 4000);
  };

  // If mobile mode is active and user is in card view, render mobile card view
  if (deviceMode === 'mobile' && mobileViewFormat === 'cards') {
    return (
      <div className="space-y-4">
        {/* Mobile View Toggle Bar */}
        <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-blue-900">
            <Smartphone className="w-4 h-4 text-blue-700" />
            <span>Chế độ Điện thoại: Dạng thẻ bài học</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileViewFormat('table')}
            className="flex items-center gap-1 font-bold text-blue-700 hover:text-blue-950 bg-white px-2.5 py-1 rounded-lg border border-blue-300 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Xem bảng A4 chuẩn in</span>
          </button>
        </div>

        <PhieuBaoGiangMobileView
          reportRows={reportRows}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          currentTeacher={currentTeacher}
          teachers={teachers}
          selectedTeacherShortName={selectedTeacherShortName}
          setSelectedTeacherShortName={setSelectedTeacherShortName}
          startDateStr={startDateStr}
          endDateStr={endDateStr}
          activeTimetable={activeTimetable}
          onStartEdit={handleStartEdit}
          onDeleteRow={handleDeleteRow}
          onAddManualRow={handleAddManualRow}
          onAutoGenerate={handleAutoGenerate}
          onExportExcel={handleExportExcel}
          onExportWord={() => handleExportWordDocx(false)}
          onExportAllWord={() => handleExportWordDocx(true)}
          onExportPdf={handleExportPdf}
          onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
          onSwitchToDesktopView={() => setMobileViewFormat('table')}
          onGoHome={onGoHome}
        />

        {/* Edit Row Modal */}
        {editingRowId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-800 text-base">Chỉnh sửa thông tin tiết dạy</h3>
                <button onClick={() => setEditingRowId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Môn học</label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Lớp</label>
                    <input
                      type="text"
                      value={editClass}
                      onChange={(e) => setEditClass(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tiết PPCT</label>
                  <input
                    type="text"
                    value={editPPCT}
                    onChange={(e) => setEditPPCT(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tên bài dạy</label>
                  <textarea
                    rows={3}
                    value={editLessonName}
                    onChange={(e) => setEditLessonName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Thiết bị dạy học</label>
                  <input
                    type="text"
                    value={editEquipment}
                    onChange={(e) => setEditEquipment(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingRowId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => editingRowId && handleSaveEdit(editingRowId)}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Week Template Modal */}
        <WeekTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          currentWeek={selectedWeek}
          currentTeacher={currentTeacher}
          reportRows={reportRows}
          onApplyTemplate={handleApplyTemplate}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* If in mobile mode with table format, show button to switch back to cards */}
      {deviceMode === 'mobile' && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Smartphone className="w-4 h-4 text-amber-700" />
            <span>Đang xem dạng bảng A4 in ấn. Nhấn nút để trở về giao diện thẻ di động:</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileViewFormat('cards')}
            className="flex items-center gap-1 font-bold text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs hover:bg-amber-100"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Về thẻ di động</span>
          </button>
        </div>
      )}

      {/* Top Action & Summary Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Modul 4
              </span>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>PHIẾU BÁO GIẢNG TỰ ĐỘNG - TUẦN {selectedWeek}</span>
                {selectedWeek === systemInfo.currentWeek && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Tuần hiện tại (Hệ thống)</span>
                  </span>
                )}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs sm:text-sm text-slate-600">
                Thực hiện từ ngày <strong>{startDateStr}</strong> đến ngày <strong>{endDateStr}</strong> • {SCHOOL_INFO.name}
              </p>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                title={`Thời khóa biểu đang áp dụng cho Tuần ${selectedWeek}: ${activeTimetable.title}`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>TKB: <strong>{activeTimetable.title}</strong></span>
                <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded font-medium">
                  {activeTimetable.effectiveToWeek ? `Tuần ${activeTimetable.effectiveFromWeek} - ${activeTimetable.effectiveToWeek}` : `Từ Tuần ${activeTimetable.effectiveFromWeek}+`}
                </span>
              </span>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Word .docx Export for Current Teacher */}
            <button
              id="btn-export-word"
              onClick={() => handleExportWordDocx(false)}
              disabled={isExportingDocx}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white rounded-lg text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Xuất phiếu báo giảng của giáo viên này ra tệp Word (.docx) chuẩn khổ A4 dọc (21cm x 29.7cm)"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span>{isExportingDocx ? 'Đang xuất...' : 'Tải Word (.docx)'}</span>
            </button>

            {/* Word .docx Export for Entire School (All Teachers in Week) to submit to BGH */}
            <button
              id="btn-export-word-all"
              onClick={() => handleExportWordDocx(true)}
              disabled={isExportingDocx}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-400 text-white rounded-lg text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Xuất toàn bộ phiếu báo giảng của tất cả giáo viên trong tuần hiện tại ra 1 tệp Word (.docx) gọn gàng, mỗi GV 1 trang A4 dọc để in ấn hoặc nộp cho BGH"
            >
              <Building className="w-4 h-4 text-indigo-200" />
              <span>Xuất toàn trường (.docx) nộp BGH</span>
            </button>

            {/* Excel Download */}
            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Tải bảng tính Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Excel (.xlsx)</span>
            </button>

            {/* PDF / Print */}
            <button
              id="btn-export-pdf"
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Xuất phiếu báo giảng ra file PDF hoặc in ấn chuẩn trang A4"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Xuất PDF / In ấn</span>
            </button>
          </div>
        </div>

        {/* Controls: Teacher selector + Re-sync + Add Manual Row */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <User className="w-4 h-4 text-blue-600" />
              Giáo viên:
            </label>
            <select
              value={selectedTeacherShortName}
              onChange={(e) => setSelectedTeacherShortName(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.shortName}>
                  {t.name} ({t.shortName}) - {t.subject}
                </option>
              ))}
            </select>

            <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 font-semibold">
              Tổng số tiết tuần {selectedWeek}: <strong className="text-blue-900">{reportRows.length} tiết</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Save Week Template Button */}
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-300 hover:bg-amber-400 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Lưu hoặc áp dụng mẫu tuần với các ghi chú và tùy chỉnh"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-900" />
              <span>Lưu / Áp dụng mẫu tuần</span>
            </button>

            <button
              onClick={handleAutoGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              title="Đồng bộ lại tự động từ Thời khóa biểu và PPCT"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đồng bộ lại từ TKB</span>
            </button>

            <button
              onClick={handleAddManualRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm tiết dạy</span>
            </button>
          </div>
        </div>

        {/* Quick helper tip & Quick template action */}
        <div className="mt-3 py-2.5 px-3.5 bg-linear-to-r from-amber-50 to-blue-50 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-800">
          <div className="flex items-center gap-2 text-amber-950">
            <Bookmark className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Tính năng Mẫu tuần:</strong> Lưu lại các ghi chú (KT 15p, thực hành, phòng máy, tiết bù...) của tuần này và áp dụng 1-click cho các tuần tiếp theo.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold text-xs shadow-2xs transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Mở quản lý mẫu tuần</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {exportSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}
      </div>

      {/* Official Printed / Visual Document Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-10 font-sans print:shadow-none print:border-none print:p-0">
        {/* Official Header */}
        <div className="grid grid-cols-2 gap-4 pb-4 text-center text-xs sm:text-sm">
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-700">{SCHOOL_INFO.district}</p>
            <p className="font-bold uppercase tracking-wide text-slate-900 underline decoration-slate-400 underline-offset-4">
              {SCHOOL_INFO.name}
            </p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wide text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="font-bold text-slate-900 underline decoration-slate-400 underline-offset-4">
              Độc lập - Tự do - Hạnh phúc
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-4 space-y-1">
          <h2 className="text-lg sm:text-2xl font-bold uppercase tracking-tight text-slate-900">
            LỊCH BÁO GIẢNG - TUẦN {selectedWeek}
          </h2>
          <p className="text-xs sm:text-sm italic text-slate-600">
            (Thực hiện từ ngày {startDateStr} đến ngày {endDateStr})
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-800">
            <span>
              Họ và tên giáo viên: <strong>{currentTeacher.name}</strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Tổ chuyên môn: <strong>{currentTeacher.department}</strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Năm học: <strong>{SCHOOL_INFO.schoolYear}</strong>
            </span>
          </div>
        </div>

        {/* The Exact Table from Prompt Image Page 2 */}
        <div className="overflow-x-auto mt-6">
          <table className="w-full text-xs text-left border-collapse border border-slate-900">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                <th className="p-2 border border-slate-900 w-16">Ngày thứ</th>
                <th className="p-2 border border-slate-900 w-14">Buổi</th>
                <th className="p-2 border border-slate-900 w-14">
                  Tiết theo TKB
                </th>
                <th className="p-2 border border-slate-900 w-20">Môn</th>
                <th className="p-2 border border-slate-900 w-14">Lớp</th>
                <th className="p-2 border border-slate-900 w-16">
                  Tiết thứ theo PPCT
                </th>
                <th className="p-2 border border-slate-900 min-w-[220px]">
                  Tên bài dạy
                </th>
                <th className="p-2 border border-slate-900 min-w-[160px]">
                  Thiết bị
                </th>
                <th className="p-2 border border-slate-900 min-w-[140px] print:w-28">Ghi chú (Lưu ý)</th>
                <th className="p-2 border border-slate-900 w-14 print:hidden">Sửa</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 border border-slate-900">
                    Chưa có tiết dạy nào được phân công cho giáo viên trong tuần này. Nhấn nút "Thêm tiết dạy" hoặc "Tự động đồng bộ".
                  </td>
                </tr>
              ) : (
                reportRows.map((row, idx) => {
                  const isEditing = editingRowId === row.id;
                  const isQuickNoteActive = activeQuickNoteRowId === row.id;
                  const span = rowSpans[idx] || { dayRowSpan: 1, sessionRowSpan: 1 };

                  return (
                    <tr
                      key={row.id}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-amber-50/40 transition-colors`}
                    >
                      {/* Cột 1: Ngày thứ (Gộp chung nếu cùng thứ) */}
                      {span.dayRowSpan > 0 && (
                        <td
                          rowSpan={span.dayRowSpan}
                          className="p-2 text-center font-bold text-slate-900 border border-slate-900 align-middle bg-slate-50/70"
                        >
                          <div className="text-xs font-bold leading-tight">{row.dayName}</div>
                          <div className="text-[10px] font-medium text-slate-600 print:text-black mt-0.5">
                            {row.dateString.slice(0, 5)}
                          </div>
                        </td>
                      )}

                      {/* Cột 2: Buổi (Gộp chung nếu cùng buổi trong cùng thứ) */}
                      {span.sessionRowSpan > 0 && (
                        <td
                          rowSpan={span.sessionRowSpan}
                          className="p-2 text-center font-semibold text-slate-800 border border-slate-900 align-middle bg-slate-50/40 text-xs"
                        >
                          {row.session === 'morning' ? 'Sáng' : 'Chiều'}
                        </td>
                      )}

                      {/* Tiết theo TKB */}
                      <td className="p-2 text-center font-bold text-slate-900 border border-slate-900">
                        {row.periodTKB}
                      </td>

                      {/* Môn */}
                      <td className="p-2 text-center font-medium border border-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="w-full p-1 border border-slate-300 rounded text-xs text-center"
                          />
                        ) : (
                          row.subject
                        )}
                      </td>

                      {/* Lớp */}
                      <td className="p-2 text-center font-bold text-blue-900 print:text-black border border-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editClass}
                            onChange={(e) => setEditClass(e.target.value)}
                            className="w-full p-1 border border-slate-300 rounded text-xs text-center font-bold"
                          />
                        ) : (
                          row.className
                        )}
                      </td>

                      {/* Tiết thứ theo PPCT */}
                      <td className="p-2 text-center font-bold text-emerald-800 print:text-black border border-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPPCT}
                            onChange={(e) => setEditPPCT(e.target.value)}
                            className="w-full p-1 border border-slate-300 rounded text-xs text-center font-bold"
                          />
                        ) : (
                          row.ppctPeriodNumber
                        )}
                      </td>

                      {/* Tên bài dạy */}
                      <td className="p-2 border border-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editLessonName}
                            onChange={(e) => setEditLessonName(e.target.value)}
                            className="w-full p-1 border border-slate-300 rounded text-xs font-semibold"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">{row.lessonName}</span>
                        )}
                      </td>

                      {/* Thiết bị */}
                      <td className="p-2 border border-slate-900 text-slate-700 print:text-black">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editEquipment}
                            onChange={(e) => setEditEquipment(e.target.value)}
                            className="w-full p-1 border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          row.equipment || '—'
                        )}
                      </td>

                      {/* Ghi chú */}
                      <td className="p-1.5 border border-slate-900 text-slate-700 print:text-black relative">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Nhập ghi chú..."
                              className="w-full p-1 border border-slate-300 rounded text-xs"
                            />
                            <div className="flex flex-wrap gap-1">
                              {QUICK_NOTE_OPTIONS.slice(0, 4).map((opt) => (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => setEditNotes(opt.label)}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300"
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* Interactive Note Display */}
                            <div
                              onClick={() => {
                                setActiveQuickNoteRowId(isQuickNoteActive ? null : row.id);
                                setCustomNoteInput(row.notes || '');
                              }}
                              className="cursor-pointer group flex items-center justify-between p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Bấm để chỉnh sửa hoặc chọn nhanh ghi chú"
                            >
                              {row.notes ? (
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                  row.notes.includes('KT') || row.notes.includes('Kiểm tra')
                                    ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                                    : row.notes.includes('bù')
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : row.notes.includes('thực hành')
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-800 border-slate-200'
                                }`}>
                                  {row.notes}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic group-hover:text-blue-600 print:hidden">
                                  + Thêm ghi chú
                                </span>
                              )}
                              <Tag className="w-3 h-3 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 shrink-0 ml-1 print:hidden" />
                            </div>

                            {/* Quick Note Dropdown Popover */}
                            {isQuickNoteActive && (
                              <div className="absolute left-0 top-full mt-1 z-30 w-72 bg-white rounded-xl shadow-xl border border-slate-300 p-3 print:hidden animate-in fade-in zoom-in-95">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                                  <span className="flex items-center gap-1">
                                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                                    Ghi chú cho tiết {row.periodTKB} - {row.className}
                                  </span>
                                  <button
                                    onClick={() => setActiveQuickNoteRowId(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Custom Text Input */}
                                <div className="flex items-center gap-1 mb-2">
                                  <input
                                    type="text"
                                    value={customNoteInput}
                                    onChange={(e) => setCustomNoteInput(e.target.value)}
                                    placeholder="Tự nhập ghi chú/lưu ý..."
                                    className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleApplyQuickNote(row.id, customNoteInput);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => handleApplyQuickNote(row.id, customNoteInput)}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold"
                                  >
                                    Lưu
                                  </button>
                                </div>

                                {/* Quick Presets */}
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Mẫu ghi chú nhanh:</p>
                                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-1">
                                  {QUICK_NOTE_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.label}
                                      onClick={() => handleApplyQuickNote(row.id, opt.label)}
                                      className={`text-left px-2 py-1 text-[11px] rounded border transition-colors ${opt.color} hover:brightness-95`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>

                                {row.notes && (
                                  <button
                                    onClick={() => handleApplyQuickNote(row.id, '')}
                                    className="w-full mt-2 pt-1 border-t border-slate-100 text-center text-xs text-rose-600 hover:underline"
                                  >
                                    Xóa ghi chú này
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-1 text-center border border-slate-900 print:hidden">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(row.id)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              title="Lưu"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRowId(null)}
                              className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                              title="Hủy"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleStartEdit(row)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Sửa dòng này"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1 text-rose-600 hover:bg-rose-100 rounded"
                              title="Xóa"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Official Signatures Block */}
        <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs sm:text-sm">
          <div>
            <p className="font-bold uppercase text-slate-900">DUYỆT CỦA BGH</p>
            <p className="italic text-slate-500 print:text-slate-700 text-xs mt-0.5">(Ký và đóng dấu)</p>
            <div className="h-20"></div>
          </div>

          <div>
            <p className="font-bold uppercase text-slate-900">TỔ TRƯỞNG CHUYÊN MÔN</p>
            <p className="italic text-slate-500 print:text-slate-700 text-xs mt-0.5">(Ký và ghi rõ họ tên)</p>
            <div className="h-20"></div>
          </div>

          <div>
            <p className="italic text-slate-600 print:text-black">
              Đồng Hới, ngày {startDateStr.split('/')[0]} tháng {startDateStr.split('/')[1]} năm {new Date().getFullYear()}
            </p>
            <p className="font-bold uppercase text-slate-900 mt-1">GIÁO VIÊN GIẢNG DẠY</p>
            <p className="italic text-slate-500 print:text-slate-700 text-xs mt-0.5">(Ký và ghi rõ họ tên)</p>
            <div className="h-16 flex items-end justify-center">
              <span className="font-bold text-slate-900 text-sm">{currentTeacher.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week Template Modal */}
      <WeekTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentWeek={selectedWeek}
        currentTeacher={currentTeacher}
        reportRows={reportRows}
        onApplyTemplate={handleApplyTemplate}
        showToast={showToast}
        onGoHome={onGoHome}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  User,
  Calendar,
  Clock,
  Copy,
  Download,
  Printer,
  Check,
  Filter,
  FileSpreadsheet,
  Layers,
  Sparkles,
  MessageSquareQuote,
  School,
} from 'lucide-react';
import { Teacher, TimetableData, TimetableSlot } from '../types';
import { SCHOOL_INFO } from '../data/mockData';
import * as XLSX from 'xlsx';

interface TeacherWeeklyScheduleTableProps {
  teachers: Teacher[];
  timetable: TimetableData;
  selectedTeacherShortName: string;
  onSelectTeacher?: (shortName: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const DAY_LABELS: { [key: number]: string } = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
};

export const TeacherWeeklyScheduleTable: React.FC<TeacherWeeklyScheduleTableProps> = ({
  teachers,
  timetable,
  selectedTeacherShortName,
  onSelectTeacher,
  onClose,
  isModal = false,
}) => {
  const [currentShortName, setCurrentShortName] = useState<string>(
    selectedTeacherShortName || teachers[0]?.shortName || 'T.Sơn'
  );
  const [copiedType, setCopiedType] = useState<'table' | 'prompt' | null>(null);
  const [groupRows, setGroupRows] = useState<boolean>(true);

  // Sync if prop changes
  React.useEffect(() => {
    if (selectedTeacherShortName) {
      setCurrentShortName(selectedTeacherShortName);
    }
  }, [selectedTeacherShortName]);

  const handleTeacherChange = (shortName: string) => {
    setCurrentShortName(shortName);
    if (onSelectTeacher) {
      onSelectTeacher(shortName);
    }
  };

  const currentTeacher = useMemo(() => {
    return (
      teachers.find(
        (t) => t.shortName.toLowerCase() === currentShortName.toLowerCase()
      ) ||
      teachers.find((t) => t.name.toLowerCase().includes(currentShortName.toLowerCase())) ||
      teachers[0]
    );
  }, [teachers, currentShortName]);

  // Filter slots for this teacher and sort chronologically from Thứ 2 to Thứ 6
  // (Monday to Friday, Morning then Afternoon, Period 1 to 5)
  const sortedTeacherSlots = useMemo(() => {
    const safeShort = (currentTeacher?.shortName || currentShortName || '').toLowerCase();
    const rawSlots = (timetable?.slots || []).filter(
      (s) => s.teacherShortName && s.teacherShortName.toLowerCase() === safeShort
    );

    return [...rawSlots].sort((a, b) => {
      // 1. Sort by dayOfWeek (2..7: Thứ 2 đến Thứ 6/7)
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }

      // 2. Sort by session: Sáng ('morning') first, Chiều ('afternoon') second
      const sessionA = a.session || (a.period > 5 ? 'afternoon' : 'morning');
      const sessionB = b.session || (b.period > 5 ? 'afternoon' : 'morning');
      if (sessionA !== sessionB) {
        return sessionA === 'morning' ? -1 : 1;
      }

      // 3. Sort by period (1..5)
      const periodA = a.period > 5 ? a.period - 5 : a.period;
      const periodB = b.period > 5 ? b.period - 5 : b.period;
      return periodA - periodB;
    });
  }, [timetable, currentTeacher, currentShortName]);

  // Statistics
  const stats = useMemo(() => {
    let morning = 0;
    let afternoon = 0;
    sortedTeacherSlots.forEach((s) => {
      const sess = s.session || (s.period > 5 ? 'afternoon' : 'morning');
      if (sess === 'morning') morning++;
      else afternoon++;
    });
    return { total: sortedTeacherSlots.length, morning, afternoon };
  }, [sortedTeacherSlots]);

  // Compute rowSpan if grouped
  const rowSpans = useMemo(() => {
    if (!groupRows) return [];
    const spans: { dayRowSpan: number; sessionRowSpan: number }[] = [];
    let i = 0;
    while (i < sortedTeacherSlots.length) {
      const curSlot = sortedTeacherSlots[i];
      const curDay = curSlot.dayOfWeek;
      const curSess = curSlot.session || (curSlot.period > 5 ? 'afternoon' : 'morning');

      // Count day span
      let dayCount = 0;
      while (
        i + dayCount < sortedTeacherSlots.length &&
        sortedTeacherSlots[i + dayCount].dayOfWeek === curDay
      ) {
        dayCount++;
      }

      // Count session span
      let sessCount = 0;
      while (
        i + sessCount < sortedTeacherSlots.length &&
        sortedTeacherSlots[i + sessCount].dayOfWeek === curDay &&
        (sortedTeacherSlots[i + sessCount].session ||
          (sortedTeacherSlots[i + sessCount].period > 5 ? 'afternoon' : 'morning')) === curSess
      ) {
        sessCount++;
      }

      for (let k = 0; k < sessCount; k++) {
        spans.push({
          dayRowSpan: k === 0 && (i === 0 || sortedTeacherSlots[i - 1]?.dayOfWeek !== curDay) ? dayCount : 0,
          sessionRowSpan: k === 0 ? sessCount : 0,
        });
      }

      i += sessCount;
    }
    return spans;
  }, [sortedTeacherSlots, groupRows]);

  // Copy table to clipboard in clean Markdown & TSV formats
  const handleCopyTable = async () => {
    if (sortedTeacherSlots.length === 0) return;

    let text = `BẢNG LỊCH DẠY TRONG TUẦN CỦA GIÁO VIÊN ${currentTeacher?.name.toUpperCase()} (${currentTeacher?.shortName})\n`;
    text += `Trường: ${SCHOOL_INFO.name} - ${SCHOOL_INFO.campus}\n`;
    text += `Tổng số tiết: ${stats.total} tiết (Sáng: ${stats.morning}, Chiều: ${stats.afternoon})\n\n`;
    text += `| Buổi | Thứ | Tiết | Lớp | Môn học |\n`;
    text += `| :---: | :---: | :---: | :---: | :---: |\n`;

    sortedTeacherSlots.forEach((slot) => {
      const buoi = (slot.session || (slot.period > 5 ? 'afternoon' : 'morning')) === 'morning' ? 'Sáng' : 'Chiều';
      const thu = DAY_LABELS[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`;
      const tiet = `Tiết ${slot.period > 5 ? slot.period - 5 : slot.period}`;
      text += `| ${buoi} | ${thu} | ${tiet} | ${slot.className} | ${slot.subject} |\n`;
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('table');
      setTimeout(() => setCopiedType(null), 3000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  // Copy prompt command with prompt text and structured result
  const handleCopyPrompt = async () => {
    const promptCommand = `Hãy lập bảng lịch dạy trong tuần của giáo viên ${currentTeacher?.name} (${currentTeacher?.shortName}). Cấu trúc bảng gồm: Buổi (Sáng/Chiều), Thứ, Tiết, Lớp, Môn học. Sắp xếp theo thứ tự thời gian từ Thứ 2 đến Thứ 6.`;
    
    let result = `${promptCommand}\n\n`;
    result += `=== KẾT QUẢ BẢNG LỊCH DẠY (${currentTeacher?.name} - ${currentTeacher?.shortName}) ===\n`;
    result += `Buổi\tThứ\tTiết\tLớp\tMôn học\n`;

    sortedTeacherSlots.forEach((slot) => {
      const buoi = (slot.session || (slot.period > 5 ? 'afternoon' : 'morning')) === 'morning' ? 'Sáng' : 'Chiều';
      const thu = DAY_LABELS[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`;
      const tiet = `Tiết ${slot.period > 5 ? slot.period - 5 : slot.period}`;
      result += `${buoi}\t${thu}\t${tiet}\t${slot.className}\t${slot.subject}\n`;
    });

    try {
      await navigator.clipboard.writeText(result);
      setCopiedType('prompt');
      setTimeout(() => setCopiedType(null), 3000);
    } catch (e) {
      console.warn('Copy prompt failed:', e);
    }
  };

  // Export to Excel (.xlsx) with exact 5 columns
  const handleExportExcel = () => {
    const dataRows = sortedTeacherSlots.map((slot, index) => {
      const buoi = (slot.session || (slot.period > 5 ? 'afternoon' : 'morning')) === 'morning' ? 'Sáng' : 'Chiều';
      const thu = DAY_LABELS[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`;
      const tiet = `Tiết ${slot.period > 5 ? slot.period - 5 : slot.period}`;
      return {
        'STT': index + 1,
        'Buổi (Sáng/Chiều)': buoi,
        'Thứ': thu,
        'Tiết': tiet,
        'Lớp': slot.className,
        'Môn học': slot.subject,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 18 }, // Buổi (Sáng/Chiều)
      { wch: 12 }, // Thứ
      { wch: 10 }, // Tiết
      { wch: 14 }, // Lớp
      { wch: 22 }, // Môn học
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `LichDay_${currentTeacher?.shortName}`);

    const safeName = (currentTeacher?.name || currentShortName).replace(/\s+/g, '_');
    XLSX.writeFile(workbook, `Lich_Day_Trong_Tuan_${safeName}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      {/* Action and Filter Header */}
      <div className="p-4 sm:p-6 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400 text-blue-950 uppercase tracking-wider">
                Tính năng mới
              </span>
              <span className="text-xs text-blue-200 font-semibold flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-amber-300" />
                {SCHOOL_INFO.name} - {SCHOOL_INFO.campus}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              LẬP BẢNG LỊCH DẠY TRONG TUẦN CỦA GIÁO VIÊN
            </h2>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
              Cấu trúc chuẩn 5 cột: <strong>Buổi (Sáng/Chiều)</strong>, <strong>Thứ</strong>, <strong>Tiết</strong>, <strong>Lớp</strong>, <strong>Môn học</strong>. Sắp xếp theo thứ tự thời gian từ Thứ 2 đến Thứ 6.
            </p>
          </div>

          {/* Teacher Selector */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label className="text-xs font-bold text-amber-300 flex items-center gap-1 whitespace-nowrap">
              <User className="w-4 h-4 text-amber-400" />
              Chọn Giáo viên:
            </label>
            <select
              value={currentShortName}
              onChange={(e) => handleTeacherChange(e.target.value)}
              className="w-full sm:w-auto bg-white text-slate-900 font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-amber-400 shadow-sm focus:ring-2 focus:ring-amber-400"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.shortName}>
                  {t.name} ({t.shortName}) - {t.subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="mt-4 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-white/15 px-3 py-1.5 rounded-lg font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              Tổng: <strong className="text-amber-300 font-black">{stats.total}</strong> tiết (Sáng: {stats.morning}, Chiều: {stats.afternoon})
            </span>

            <button
              type="button"
              onClick={() => setGroupRows((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5 ${
                groupRows
                  ? 'bg-amber-400 text-blue-950 border-amber-300 font-bold'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
              title="Gộp các ô cùng Buổi & Thứ để bảng gọn gàng hơn"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{groupRows ? 'Đang gộp ô (Gọn)' : 'Từng dòng riêng (Chi tiết)'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Table */}
            <button
              type="button"
              onClick={handleCopyTable}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 shadow-xs transition-all active:scale-95"
              title="Sao chép bảng dạng Markdown / Bảng văn bản để dán vào Word, Zalo, Excel"
            >
              {copiedType === 'table' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Đã chép bảng!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-300" />
                  <span>Sao chép bảng</span>
                </>
              )}
            </button>

            {/* Copy Prompt & Result */}
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold shadow-xs transition-all active:scale-95"
              title="Sao chép câu lệnh chuẩn của người dùng kèm kết quả"
            >
              {copiedType === 'prompt' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-blue-950" />
                  <span>Đã chép câu lệnh & kết quả!</span>
                </>
              ) : (
                <>
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  <span>Sao chép câu lệnh chuẩn</span>
                </>
              )}
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs transition-all active:scale-95"
              title="Tải bảng dạng tệp Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-xs transition-all active:scale-95"
              title="In bản in sạch đẹp chuẩn A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In bảng A4</span>
            </button>

            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Official Formatted Document View */}
      <div className="p-6 sm:p-10 font-sans print:p-0">
        {/* Document Header for Official Print */}
        <div className="hidden print:grid grid-cols-2 gap-4 pb-4 text-center text-xs">
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

        {/* Title Banner */}
        <div className="text-center my-4 space-y-1">
          <h1 className="text-lg sm:text-2xl font-extrabold uppercase tracking-tight text-slate-900">
            BẢNG LỊCH DẠY TRONG TUẦN CỦA GIÁO VIÊN
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-800 font-semibold pt-1">
            <span className="bg-blue-50 text-blue-900 px-3 py-1 rounded-full border border-blue-200">
              Giáo viên: <strong className="text-blue-900">{currentTeacher?.name}</strong> ({currentTeacher?.shortName})
            </span>
            <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full border border-slate-200">
              Tổ bộ môn: <strong>{currentTeacher?.department}</strong>
            </span>
            <span className="bg-amber-50 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
              Năm học: <strong>{SCHOOL_INFO.schoolYear}</strong>
            </span>
          </div>
          <p className="text-xs italic text-slate-500 pt-1">
            * Lịch dạy được sắp xếp tuần tự theo thời gian từ Thứ 2 đến Thứ 6 (Buổi Sáng từ 7h00, Buổi Chiều từ 14h00).
          </p>
        </div>

        {/* The Exact 5-Column Table */}
        <div className="overflow-x-auto mt-6">
          <table className="w-full text-xs sm:text-sm text-left border-collapse border-2 border-slate-900 shadow-xs">
            <thead>
              <tr className="bg-slate-800 text-white font-bold text-center border-b-2 border-slate-900">
                <th className="p-2.5 border border-slate-900 w-12 text-center">STT</th>
                <th className="p-2.5 border border-slate-900 w-28 text-center uppercase tracking-wider">
                  Buổi (Sáng/Chiều)
                </th>
                <th className="p-2.5 border border-slate-900 w-24 text-center uppercase tracking-wider">
                  Thứ
                </th>
                <th className="p-2.5 border border-slate-900 w-20 text-center uppercase tracking-wider">
                  Tiết
                </th>
                <th className="p-2.5 border border-slate-900 w-24 text-center uppercase tracking-wider">
                  Lớp
                </th>
                <th className="p-2.5 border border-slate-900 min-w-[160px] text-center uppercase tracking-wider">
                  Môn học
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTeacherSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 border border-slate-900">
                    Giáo viên này hiện chưa có tiết dạy nào được phân công trong thời khóa biểu tuần.
                  </td>
                </tr>
              ) : (
                sortedTeacherSlots.map((slot, idx) => {
                  const sess = slot.session || (slot.period > 5 ? 'afternoon' : 'morning');
                  const buoiLabel = sess === 'morning' ? 'Sáng' : 'Chiều';
                  const thuLabel = DAY_LABELS[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`;
                  const periodNum = slot.period > 5 ? slot.period - 5 : slot.period;
                  const tietLabel = `Tiết ${periodNum}`;
                  const span = rowSpans[idx] || { dayRowSpan: 1, sessionRowSpan: 1 };

                  const isMorning = sess === 'morning';

                  return (
                    <tr
                      key={`${slot.dayOfWeek}-${sess}-${slot.period}-${slot.className}-${idx}`}
                      className={`${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      } hover:bg-amber-50/50 transition-colors border-b border-slate-900`}
                    >
                      {/* STT */}
                      <td className="p-2.5 border border-slate-900 text-center font-bold text-slate-700">
                        {idx + 1}
                      </td>

                      {/* Cột 1: Buổi (Sáng/Chiều) */}
                      {groupRows ? (
                        span.sessionRowSpan > 0 && (
                          <td
                            rowSpan={span.sessionRowSpan}
                            className={`p-2.5 border border-slate-900 text-center font-extrabold align-middle ${
                              isMorning ? 'bg-blue-50/80 text-blue-950' : 'bg-amber-50/80 text-amber-950'
                            }`}
                          >
                            <span
                              className={`inline-block px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                                isMorning
                                  ? 'bg-blue-700 text-white'
                                  : 'bg-amber-600 text-white'
                              }`}
                            >
                              {buoiLabel}
                            </span>
                          </td>
                        )
                      ) : (
                        <td
                          className={`p-2.5 border border-slate-900 text-center font-bold ${
                            isMorning ? 'text-blue-900' : 'text-amber-900'
                          }`}
                        >
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              isMorning ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {buoiLabel}
                          </span>
                        </td>
                      )}

                      {/* Cột 2: Thứ */}
                      {groupRows ? (
                        span.dayRowSpan > 0 && (
                          <td
                            rowSpan={span.dayRowSpan}
                            className="p-2.5 border border-slate-900 text-center font-bold text-slate-900 align-middle bg-slate-100/70"
                          >
                            <span className="text-sm font-extrabold text-blue-950 block">
                              {thuLabel}
                            </span>
                          </td>
                        )
                      ) : (
                        <td className="p-2.5 border border-slate-900 text-center font-bold text-slate-800">
                          {thuLabel}
                        </td>
                      )}

                      {/* Cột 3: Tiết */}
                      <td className="p-2.5 border border-slate-900 text-center font-bold text-slate-900">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-mono font-bold">
                          {tietLabel}
                        </span>
                      </td>

                      {/* Cột 4: Lớp */}
                      <td className="p-2.5 border border-slate-900 text-center font-extrabold text-blue-900">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-950 border border-blue-200">
                          {slot.className}
                        </span>
                      </td>

                      {/* Cột 5: Môn học */}
                      <td className="p-2.5 border border-slate-900 font-bold text-slate-900">
                        <span className="text-slate-900">{slot.subject}</span>
                        {slot.room && (
                          <span className="ml-2 text-[10px] text-slate-500 font-normal">
                            (Phòng {slot.room})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                <td colSpan={3} className="p-3 border border-slate-900 text-left">
                  TỔNG CỘNG SỐ TIẾT TRONG TUẦN:
                </td>
                <td colSpan={3} className="p-3 border border-slate-900 text-left font-black text-blue-900">
                  {stats.total} tiết (Buổi Sáng: {stats.morning} tiết • Buổi Chiều: {stats.afternoon} tiết)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signatures for Print */}
        <div className="hidden print:grid grid-cols-3 gap-6 pt-10 text-center text-xs text-slate-900">
          <div>
            <p className="font-bold uppercase">BAN GIÁM HIỆU</p>
            <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-bold uppercase">TỔ TRƯỞNG CHUYÊN MÔN</p>
            <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-bold uppercase">GIÁO VIÊN GIẢNG DẠY</p>
            <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-16"></div>
            <p className="font-bold text-sm">{currentTeacher?.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

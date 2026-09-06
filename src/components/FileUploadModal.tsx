import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  FileCheck,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Users,
  GraduationCap,
  Save,
  CheckSquare,
  Square,
  Trash2,
  Edit3,
  ClipboardList,
  Sparkles,
  Info,
  AlertTriangle,
  Calendar,
  Layers,
  Check,
  Home,
} from 'lucide-react';
import {
  parseExcelTimetableFile,
  parseDocxTimetableFile,
  parseTextTimetable,
  TimetableParseReport,
  parseExcelPPCTFile,
  parseDocxPPCTFile,
  parseTextPPCT,
  parseExcelTeacherListFile,
  parseDocxTeacherListFile,
  parseTextTeacherList,
} from '../utils/excelExporter';
import {
  parsePdfTimetableFile,
  parsePdfTeacherListFile,
  parsePdfPPCTFile,
} from '../utils/pdfParser';
import { parseImageFile } from '../utils/imageParser';
import { TimetableSlot, PPCTItem, Teacher } from '../types';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'tkb' | 'ppct' | 'teacher';
  onTimetableImported?: (
    slots: TimetableSlot[],
    fileName: string,
    asNewVersion?: boolean,
    fromWeek?: number,
    versionTitle?: string
  ) => void;
  onPPCTImported?: (items: PPCTItem[], fileName: string, subject: string, grade: number) => void;
  onTeachersImported?: (teachers: Teacher[], fileName: string, mode?: 'replace' | 'merge') => void;
  onGoHome?: () => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  targetType,
  onTimetableImported,
  onPPCTImported,
  onTeachersImported,
  onGoHome,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ count: number; sample: string[] } | null>(null);

  // Parsed content
  const [parsedSlots, setParsedSlots] = useState<TimetableSlot[] | null>(null);
  const [tkbReport, setTkbReport] = useState<TimetableParseReport | null>(null);
  const [tkbPreviewClass, setTkbPreviewClass] = useState<string>('');
  const [tkbConfirmed, setTkbConfirmed] = useState(false);

  const [parsedPPCTItems, setParsedPPCTItems] = useState<PPCTItem[] | null>(null);
  const [parsedTeachers, setParsedTeachers] = useState<Teacher[]>([]);

  // Image preview and OCR progress
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<{ percent: number; status: string } | null>(null);

  // Teacher specific selection & review state
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [teacherSaveMode, setTeacherSaveMode] = useState<'merge' | 'replace'>('merge');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Text paste input
  const [pastedContent, setPastedContent] = useState('');

  // Form fields for PPCT
  const [targetSubject, setTargetSubject] = useState('Toán');
  const [targetGrade, setTargetGrade] = useState(9);

  // TKB versioning options
  const [saveAsNewTKBVersion, setSaveAsNewTKBVersion] = useState(true);
  const [tkbFromWeek, setTkbFromWeek] = useState(16);
  const [tkbVersionTitle, setTkbVersionTitle] = useState('TKB Mới');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleProcessTeachersFound = (teachers: Teacher[], sourceName: string) => {
    if (teachers.length === 0) {
      setErrorMsg(
        'Không tìm thấy thông tin giáo viên hợp lệ trong tệp hoặc nội dung đã cung cấp. Vui lòng kiểm tra lại cấu trúc bảng (Cần có cột Họ và tên, Ký hiệu TKB).'
      );
      setParsedTeachers([]);
      setSelectedTeacherIds(new Set());
      setPreviewData(null);
    } else {
      setParsedTeachers(teachers);
      setSelectedTeacherIds(new Set(teachers.map((t) => t.id)));
      setPreviewData({
        count: teachers.length,
        sample: teachers.slice(0, 5).map((t) => `${t.name} (Tên TKB: ${t.shortName}) - ${t.subject} [${t.department}]`),
      });
      setSuccessMsg(
        `Đã bóc tách chính xác ${teachers.length} giáo viên từ ${sourceName}! Vui lòng kiểm tra và duyệt danh sách bên dưới trước khi lưu.`
      );
    }
  };

  const handleProcessTimetableReport = (report: TimetableParseReport, sourceName: string) => {
    if (!report.success || report.slots.length === 0) {
      setParsedSlots([]);
      setTkbReport(null);
      setTkbConfirmed(false);
      setErrorMsg(
        report.errorMessage ||
          '⚠️ CẢNH BÁO: Tệp không nhận diện được thời khóa biểu hợp lệ! Hệ thống TUYỆT ĐỐI KHÔNG tự ý thay đổi hay áp dụng vào Thời khóa biểu hiện tại.'
      );
      setSuccessMsg(null);
      setPreviewData(null);
    } else {
      setParsedSlots(report.slots);
      setTkbReport(report);
      setTkbConfirmed(false);
      if (report.classes.length > 0) {
        setTkbPreviewClass(report.classes[0]);
      }
      setErrorMsg(null);
      setPreviewData({
        count: report.slots.length,
        sample: report.slots.slice(0, 4).map((s) => `Thứ ${s.dayOfWeek} Tiết ${s.period}: ${s.subject} ${s.className} (${s.teacherShortName || 'Trống'})`),
      });
      setSuccessMsg(
        `✓ Đã nhận diện thành công ${report.slots.length} tiết giảng dạy cho ${report.classes.length} lớp (${report.classes.join(', ')}) từ ${sourceName}! Vui lòng đối chiếu bảng xem trước và xác nhận bên dưới.`
      );
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const ext = file.name.split('.').pop()?.toLowerCase();

    // Reset image preview if not image
    if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg' && ext !== 'webp') {
      setImagePreviewUrl(null);
    }

    try {
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        if (targetType === 'tkb') {
          const report = await parseExcelTimetableFile(file);
          handleProcessTimetableReport(report, file.name);
        } else if (targetType === 'teacher') {
          const teachers = await parseExcelTeacherListFile(file);
          handleProcessTeachersFound(teachers, file.name);
        } else {
          // PPCT
          const items = await parseExcelPPCTFile(file);
          if (items.length === 0) {
            setErrorMsg('Đã đọc file Excel PPCT. Vui lòng kiểm tra định dạng các cột (TT, Tên bài, Số tiết, Tuần, Thiết bị).');
          } else {
            setParsedPPCTItems(items);
            setPreviewData({
              count: items.length,
              sample: items.slice(0, 4).map((i) => `[${i.orderNumber}] ${i.lessonTitle} (${i.periodCount} tiết - ${i.timeFrame})`),
            });
            setSuccessMsg(`Đã trích xuất thành công ${items.length} bài học PPCT từ file Excel!`);
          }
        }
      } else if (ext === 'docx') {
        if (targetType === 'teacher') {
          const teachers = await parseDocxTeacherListFile(file);
          handleProcessTeachersFound(teachers, file.name);
        } else if (targetType === 'tkb') {
          const report = await parseDocxTimetableFile(file);
          handleProcessTimetableReport(report, file.name);
        } else {
          // PPCT from Word (.docx)
          const items = await parseDocxPPCTFile(file);
          if (items.length === 0) {
            setErrorMsg('Đã đọc file Word (.docx) nhưng chưa tìm thấy bảng PPCT hợp lệ. Thầy/Cô có thể sao chép bảng rồi dán vào tab "Dán bảng / danh sách văn bản".');
          } else {
            setParsedPPCTItems(items);
            setPreviewData({
              count: items.length,
              sample: items.slice(0, 4).map((i) => `[${i.orderNumber}] ${i.lessonTitle} (${i.periodCount} tiết - ${i.timeFrame})`),
            });
            setSuccessMsg(`Đã trích xuất thành công ${items.length} bài học PPCT từ file Word (.docx)!`);
          }
        }
      } else if (ext === 'pdf') {
        if (targetType === 'teacher') {
          const teachers = await parsePdfTeacherListFile(file);
          handleProcessTeachersFound(teachers, file.name);
        } else if (targetType === 'tkb') {
          const report = await parsePdfTimetableFile(file);
          handleProcessTimetableReport(report, file.name);
        } else {
          // PPCT from PDF
          const items = await parsePdfPPCTFile(file);
          if (items.length === 0) {
            setErrorMsg('Đã đọc file PDF nhưng chưa phát hiện cấu trúc bảng bài học PPCT. Thầy/Cô có thể kiểm tra nội dung hoặc chuyển sang tab Dán văn bản.');
          } else {
            setParsedPPCTItems(items);
            setPreviewData({
              count: items.length,
              sample: items.slice(0, 4).map((i) => `[${i.orderNumber}] ${i.lessonTitle} (${i.periodCount} tiết - ${i.timeFrame})`),
            });
            setSuccessMsg(`Đã trích xuất thành công ${items.length} bài học PPCT từ file PDF!`);
          }
        }
      } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
        // Image parsing (OCR)
        try {
          const objUrl = URL.createObjectURL(file);
          setImagePreviewUrl(objUrl);
        } catch (e) {
          // ignore url creation
        }

        setOcrProgress({ percent: 15, status: 'Đang đọc hình ảnh và chạy nhận dạng chữ...' });
        const imgRes = await parseImageFile(file, targetType, (pct, status) => {
          setOcrProgress({ percent: pct, status });
        });
        setOcrProgress(null);

        if (imgRes.text) {
          setPastedContent(imgRes.text);
        }

        if (targetType === 'teacher') {
          handleProcessTeachersFound(imgRes.teachers || [], file.name);
        } else if (targetType === 'tkb') {
          if (imgRes.tkbReport) {
            handleProcessTimetableReport(imgRes.tkbReport, file.name);
          } else {
            setErrorMsg(imgRes.message || 'Không thể trích xuất cấu trúc Thời khóa biểu từ hình ảnh.');
          }
        } else {
          // PPCT
          if (imgRes.ppctItems && imgRes.ppctItems.length > 0) {
            setParsedPPCTItems(imgRes.ppctItems);
            setPreviewData({
              count: imgRes.ppctItems.length,
              sample: imgRes.ppctItems.slice(0, 4).map((i) => `[${i.orderNumber}] ${i.lessonTitle} (${i.periodCount} tiết - ${i.timeFrame})`),
            });
            setSuccessMsg(`Đã trích xuất thành công ${imgRes.ppctItems.length} bài học PPCT từ hình ảnh (OCR)!`);
          } else {
            setErrorMsg(
              imgRes.message ||
                'Đã đọc ảnh nhưng chưa nhận diện rõ bài học PPCT. Thầy/Cô có thể kiểm tra nội dung chữ trong tab "Dán bảng / danh sách văn bản" để chỉnh sửa nhanh.'
            );
          }
        }
      } else if (ext === 'txt') {
        const text = await file.text();
        if (targetType === 'teacher') {
          const teachers = parseTextTeacherList(text);
          handleProcessTeachersFound(teachers, file.name);
        } else if (targetType === 'tkb') {
          const report = parseTextTimetable(text);
          handleProcessTimetableReport(report, file.name);
        } else {
          const items = parseTextPPCT(text);
          if (items.length > 0) {
            setParsedPPCTItems(items);
            setPreviewData({
              count: items.length,
              sample: items.slice(0, 4).map((i) => `[${i.orderNumber}] ${i.lessonTitle} (${i.periodCount} tiết - ${i.timeFrame})`),
            });
            setSuccessMsg(`Đã trích xuất thành công ${items.length} bài học PPCT từ tệp văn bản!`);
          } else {
            setErrorMsg('Tệp văn bản chưa có dòng bài học PPCT hợp lệ.');
          }
        }
      } else if (ext === 'doc') {
        setErrorMsg(
          'Tệp Word (.doc) là định dạng nhị phân phiên bản cũ. Thầy/Cô vui lòng:\n1. Mở tệp trong Word và Lưu lại thành định dạng mới (.docx), HOẶC\n2. Sao chép (Copy) toàn bộ bảng dữ liệu và bấm tab "Dán bảng / danh sách văn bản" ở bên cạnh để nhận diện ngay tức thì.'
        );
      } else {
        setErrorMsg('Định dạng tệp chưa được hỗ trợ. Vui lòng sử dụng file Word (.docx), PDF (.pdf), Excel (.xlsx, .xls), hoặc Hình ảnh (.png, .jpg, .jpeg, .webp).');
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi khi xử lý tệp: ${err.message || 'Không thể đọc nội dung'}`);
    } finally {
      setLoading(false);
      setOcrProgress(null);
    }
  };

  const handleParsePastedText = () => {
    if (!pastedContent.trim()) {
      setErrorMsg('Vui lòng dán nội dung văn bản hoặc bảng dữ liệu.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (targetType === 'teacher') {
        const teachers = parseTextTeacherList(pastedContent);
        handleProcessTeachersFound(teachers, 'nội dung văn bản đã dán');
      } else if (targetType === 'tkb') {
        const report = parseTextTimetable(pastedContent);
        handleProcessTimetableReport(report, 'nội dung bảng TKB đã dán');
      } else {
        // PPCT
        const items = parseTextPPCT(pastedContent);
        if (items.length === 0) {
          setErrorMsg('Chưa phát hiện được bài học PPCT từ văn bản đã dán. Thầy/Cô vui lòng định dạng mỗi bài trên một dòng hoặc dán từ bảng Word/Excel.');
        } else {
          setParsedPPCTItems(items);
          setPreviewData({
            count: items.length,
            sample: items.slice(0, 4).map((i) => `[${i.orderNumber}] ${i.lessonTitle} (${i.periodCount} tiết - ${i.timeFrame})`),
          });
          setSuccessMsg(`Đã trích xuất thành công ${items.length} bài học PPCT từ văn bản đã dán!`);
        }
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi khi phân tích văn bản: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Teacher table manipulation
  const toggleTeacherSelect = (id: string) => {
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllTeachers = () => {
    if (selectedTeacherIds.size === parsedTeachers.length) {
      setSelectedTeacherIds(new Set());
    } else {
      setSelectedTeacherIds(new Set(parsedTeachers.map((t) => t.id)));
    }
  };

  const handleDeleteTeacherRow = (id: string) => {
    setParsedTeachers((prev) => prev.filter((t) => t.id !== id));
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleTeacherFieldChange = (id: string, field: keyof Teacher, value: string) => {
    setParsedTeachers((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, [field]: value };
          if (field === 'name' && (!t.shortName || t.shortName === t.name)) {
            updated.shortName = value.trim().split(/\s+/).pop() || '';
          }
          return updated;
        }
        return t;
      })
    );
  };

  const handleApply = () => {
    if (targetType === 'tkb' && onTimetableImported) {
      if (!parsedSlots || parsedSlots.length === 0) {
        setErrorMsg('⚠️ CẢNH BÁO: Không có tiết học nào được nhận diện hợp lệ. Hệ thống TUYỆT ĐỐI KHÔNG tự ý thay đổi Thời khóa biểu hiện tại.');
        return;
      }
      if (!tkbConfirmed) {
        setErrorMsg('Vui lòng tích chọn ô "Xác nhận tính chính xác của Thời khóa biểu" trước khi lưu vào hệ thống.');
        return;
      }

      const sourceName = selectedFile ? selectedFile.name : 'TKB Mới';
      onTimetableImported(
        parsedSlots,
        sourceName,
        saveAsNewTKBVersion,
        tkbFromWeek,
        tkbVersionTitle.trim() || `TKB Mới (Tuần ${tkbFromWeek})`
      );
      onClose();
    } else if (targetType === 'teacher' && onTeachersImported) {
      // ONLY send teachers that the user explicitly checked!
      const approvedTeachers = parsedTeachers.filter((t) => selectedTeacherIds.has(t.id));
      if (approvedTeachers.length === 0) {
        setErrorMsg('Vui lòng tích chọn ít nhất 1 giáo viên để thêm vào hệ thống.');
        return;
      }
      const sourceName = selectedFile ? selectedFile.name : 'Văn bản đã dán';
      onTeachersImported(approvedTeachers, sourceName, teacherSaveMode);
      onClose();
    } else if (targetType === 'ppct' && onPPCTImported) {
      const sourceName = selectedFile ? selectedFile.name : 'PPCT Mới';
      if (parsedPPCTItems && parsedPPCTItems.length > 0) {
        onPPCTImported(parsedPPCTItems, sourceName, targetSubject, targetGrade);
      } else {
        onPPCTImported([], sourceName, targetSubject, targetGrade);
      }
      onClose();
    }
  };

  const selectedCount = selectedTeacherIds.size;
  const canSaveTeachers = targetType === 'teacher' && selectedCount > 0;
  const canSaveTKB = targetType === 'tkb' && Boolean(parsedSlots && parsedSlots.length >= 5 && tkbConfirmed);
  const canSavePPCT = targetType === 'ppct' && Boolean(parsedPPCTItems && parsedPPCTItems.length > 0);
  const canSubmit = canSaveTeachers || canSaveTKB || canSavePPCT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[94vh] sm:max-h-[92vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-900 to-indigo-900 text-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-white/10 border border-white/20 shrink-0">
              {targetType === 'teacher' ? (
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
              ) : targetType === 'tkb' ? (
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
              ) : (
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold truncate">
                {targetType === 'tkb'
                  ? 'Nhận diện & Quản lý Thời Khóa Biểu (TKB)'
                  : targetType === 'teacher'
                  ? 'Nhận diện & Quản lý Danh Sách Giáo Viên'
                  : 'Tải lên Kế Hoạch Dạy Học (PPCT)'}
              </h3>
              <p className="text-[11px] sm:text-xs text-blue-200 truncate">
                {targetType === 'tkb'
                  ? 'Kiểm tra cấu trúc chặt chẽ, đối chiếu xem trước trực tiếp, cấm tự ý sửa đổi khi nhận diện sai'
                  : 'Hỗ trợ: Excel (.xlsx, .xls), Word (.docx), PDF (.pdf), hoặc Dán văn bản trực tiếp'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Return to Home button */}
            {onGoHome && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoHome();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95 cursor-pointer border border-white/20"
                title="Đóng và trở về Trang chủ (Phiếu Báo Giảng)"
              >
                <Home className="w-3.5 h-3.5 text-amber-300" />
                <span>Trang chủ</span>
              </button>
            )}

            {canSubmit && !loading && (
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-blue-950 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Lưu dữ liệu vào hệ thống"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu ngay</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switch for Teacher, TKB and PPCT import */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-blue-700 text-blue-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải tệp tin (Word, PDF, Excel, Ảnh)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'paste'
                ? 'border-blue-700 text-blue-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>
              {targetType === 'tkb'
                ? 'Dán bảng TKB (Excel/Word/Zalo)'
                : targetType === 'teacher'
                ? 'Dán danh sách GV (Word/PDF/Zalo)'
                : 'Dán danh mục PPCT (Word/Excel/Zalo)'}
            </span>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 min-h-0">
          {targetType === 'ppct' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học:</label>
                <select
                  value={targetSubject}
                  onChange={(e) => setTargetSubject(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Toán">Toán</option>
                  <option value="Ngữ Văn">Ngữ Văn</option>
                  <option value="KHTN">KHTN (Khoa học tự nhiên)</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                  <option value="Tin học">Tin học</option>
                  <option value="Lịch sử & Địa lí">Lịch sử & Địa lí</option>
                  <option value="GDCD">GDCD</option>
                  <option value="Công nghệ">Công nghệ</option>
                  <option value="HĐTN">HĐTN - HN</option>
                  <option value="GDTC">GDTC</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Khối lớp:</label>
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={6}>Khối 6 (Lớp 6/1, 6/2)</option>
                  <option value={7}>Khối 7 (Lớp 7/1, 7/2)</option>
                  <option value={8}>Khối 8 (Lớp 8/1, 8/2)</option>
                  <option value={9}>Khối 9 (Lớp 9/1, 9/2)</option>
                </select>
              </div>
            </div>
          )}

          {/* Upload Tab Content */}
          {activeTab === 'upload' && (
            <>
              {targetType === 'teacher' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-blue-950">Quy tắc nhận diện danh sách giáo viên:</p>
                    <p className="text-blue-800 text-[11px] leading-relaxed">
                      Hệ thống tự động quét tìm các cột: <strong>Họ và tên</strong>, <strong>Ký hiệu TKB</strong> (tên gọi), <strong>Môn dạy</strong>, <strong>Tổ chuyên môn</strong>.
                      Giáo viên sẽ <strong>chỉ được thêm vào khi Thầy/Cô tích chọn duyệt</strong>, không tự động thêm lung tung.
                    </p>
                  </div>
                </div>
              )}

              {/* Drag & Drop Area */}
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/70 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Tệp đã được nạp
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors shrink-0 ml-2 cursor-pointer"
                    >
                      Đổi tệp khác
                    </button>
                  </div>

                  {/* Image thumbnail if image file */}
                  {imagePreviewUrl && (
                    <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-3">
                      <img
                        src={imagePreviewUrl}
                        alt="Bản xem trước hình ảnh"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-xs shrink-0"
                      />
                      <div className="text-xs text-slate-700 space-y-0.5 min-w-0">
                        <p className="font-bold text-slate-900">Hình ảnh đã tải lên:</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Hệ thống đã nhận diện quang học (OCR) các ký tự tiếng Việt từ ảnh. Thầy/Cô có thể kiểm tra kết quả bên dưới hoặc xem nội dung bóc tách ở tab &quot;Dán danh mục PPCT / TKB&quot;.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-blue-600 bg-blue-50/70 scale-[1.01]'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/60'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-blue-100/80 text-blue-700 flex items-center justify-center mb-0.5">
                      {targetType === 'teacher' ? (
                        <Users className="w-6 h-6 text-blue-700" />
                      ) : (
                        <Upload className="w-6 h-6 text-blue-700" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Kéo thả tệp{' '}
                        <span className="font-bold text-blue-800">
                          {targetType === 'teacher'
                            ? 'Danh sách Giáo viên'
                            : targetType === 'tkb'
                            ? 'Thời khóa biểu'
                            : 'Kế hoạch PPCT'}
                        </span>{' '}
                        vào đây hoặc <span className="text-blue-700 underline">chọn từ máy</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Hỗ trợ đầy đủ: Word (.docx, .doc), PDF (.pdf), Excel (.xlsx, .xls), Ảnh (.png, .jpg, .webp)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 pt-2.5 border-t border-slate-200/60">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded">
                      <FileSpreadsheet className="w-3 h-3 text-emerald-700" /> Excel (.xlsx, .xls)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded">
                      <FileText className="w-3 h-3 text-blue-700" /> Word (.docx)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded border border-rose-200">
                      <FileText className="w-3 h-3 text-rose-600" /> PDF (.pdf)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded border border-amber-200">
                      <Sparkles className="w-3 h-3 text-amber-700" /> Ảnh OCR (.png, .jpg)
                    </span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.docx,.doc,.pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={handleChange}
                className="hidden"
              />
            </>
          )}

          {/* Paste Tab Content */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5 text-blue-700" />
                  <span>
                    {targetType === 'tkb'
                      ? 'Dán bảng Thời khóa biểu từ Word, Excel hoặc văn bản:'
                      : targetType === 'teacher'
                      ? 'Dán nội dung danh sách giáo viên từ Word, PDF, Excel hoặc Zalo:'
                      : 'Dán danh mục Kế hoạch dạy học (PPCT) từ Word, Excel hoặc văn bản:'}
                  </span>
                </label>
              </div>

              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder={
                  targetType === 'tkb'
                    ? `Sao chép và dán bảng Thời khóa biểu vào đây (hỗ trợ phân tách bằng Tab, dấu phẩy hoặc gạch đứng):\nVí dụ dạng bảng ngang:\nThứ\tTiết\t6/1\t6/2\t7/1\t7/2\n2\t1\tChào cờ\tChào cờ\tChào cờ\tChào cờ\n2\t2\tToán (Thắng)\tVăn (Quý)\tAnh (Duyên)\tKHTN (Khoa)\n2\t3\tToán (Thắng)\tGDCD (Mai)\tToán (Dung)\tSử (Lan)...`
                    : targetType === 'teacher'
                    ? `Ví dụ sao chép từ bảng Word hoặc Excel rồi dán vào đây:\n1\tNguyễn Thị Thắm\tThắm\tToán 8, Toán 9\tTổ Tự Nhiên\n2\tTrần Văn Tuấn\tTuấn\tMĩ Thuật 6-9\tTổ Nghệ Thuật\n\nHoặc định dạng văn bản:\n- Nguyễn Thị Thắm - Thắm - Toán - Tổ Tự Nhiên\n- Trần Văn Tuấn - Tuấn - Mĩ thuật - Tổ Nghệ thuật`
                    : `Sao chép bảng PPCT từ Word/Excel hoặc dán danh sách bài học vào đây:\nVí dụ định dạng bảng (copy từ Excel/Word):\n1\tBài 1: Căn bậc hai\t2\tTuần 1\tThước, máy chiếu\tPhòng học\n2\tBài 2: Căn thức bậc hai và hằng đẳng thức\t2\tTuần 1-2\tBảng phụ\tPhòng học\n\nHoặc dạng dòng văn bản:\nBài 1: Khái niệm mở đầu (2 tiết) - Tuần 1\nBài 2: Luyện tập chung (1 tiết) - Tuần 2`
                }
                rows={6}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  disabled={loading || !pastedContent.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {targetType === 'tkb'
                      ? 'Phân tích bảng Thời khóa biểu'
                      : targetType === 'teacher'
                      ? 'Phân tích danh sách GV'
                      : 'Phân tích kế hoạch bài học PPCT'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* OCR Progress state */}
          {ocrProgress && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>{ocrProgress.status}</span>
                </span>
                <span>{ocrProgress.percent}%</span>
              </div>
              <div className="w-full bg-blue-200/70 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress.percent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-blue-700 font-medium">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Đang phân tích và bóc tách dữ liệu...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 whitespace-pre-line">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{successMsg}</div>
            </div>
          )}

          {/* Teacher Review & Selection Table */}
          {targetType === 'teacher' && parsedTeachers.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="bg-slate-100/90 rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-blue-700" />
                    <span>
                      Duyệt danh sách giáo viên ({selectedCount}/{parsedTeachers.length} được chọn):
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Chỉ các giáo viên được tích chọn mới được đưa vào hệ thống. Thầy/Cô có thể sửa trực tiếp hoặc xóa dòng nhận diện nhầm.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={toggleSelectAllTeachers}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    {selectedCount === parsedTeachers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
              </div>

              {/* Teachers Table with Inline Edits */}
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-100 text-slate-800 text-[11px] font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-10 text-center">Chọn</th>
                      <th className="p-2 w-10 text-center">STT</th>
                      <th className="p-2 min-w-[140px]">Họ và tên</th>
                      <th className="p-2 min-w-[100px]">Ký hiệu TKB</th>
                      <th className="p-2 min-w-[120px]">Môn dạy</th>
                      <th className="p-2 min-w-[120px]">Tổ CM</th>
                      <th className="p-2 w-10 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedTeachers.map((t, idx) => {
                      const isSelected = selectedTeacherIds.has(t.id);
                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isSelected ? 'bg-white' : 'bg-slate-50/60 opacity-60'
                          }`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTeacherSelect(t.id)}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-2 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={t.name}
                              onChange={(e) => handleTeacherFieldChange(t.id, 'name', e.target.value)}
                              className="w-full text-xs font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={t.shortName}
                              onChange={(e) => handleTeacherFieldChange(t.id, 'shortName', e.target.value)}
                              className="w-full text-xs font-bold text-blue-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={t.subject}
                              onChange={(e) => handleTeacherFieldChange(t.id, 'subject', e.target.value)}
                              className="w-full text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={t.department}
                              onChange={(e) => handleTeacherFieldChange(t.id, 'department', e.target.value)}
                              className="w-full text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteTeacherRow(t.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="Xóa dòng này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mode choice for teachers */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <span>Cách thức lưu vào danh sách giáo viên:</span>
                </div>
                <label className="flex items-start gap-2 text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="teacherSaveMode"
                    checked={teacherSaveMode === 'merge'}
                    onChange={() => setTeacherSaveMode('merge')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-blue-900 block">
                      Bổ sung vào danh sách hiện tại (Khuyên dùng)
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Giữ nguyên các giáo viên đang có, chỉ thêm các giáo viên mới được tích chọn chưa có trong hệ thống.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 text-slate-800 cursor-pointer pt-1 border-t border-amber-200/60">
                  <input
                    type="radio"
                    name="teacherSaveMode"
                    checked={teacherSaveMode === 'replace'}
                    onChange={() => setTeacherSaveMode('replace')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-rose-900 block">
                      Thay thế toàn bộ danh sách giáo viên
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Xóa danh sách giáo viên cũ, chỉ giữ đúng {selectedCount} giáo viên đã được tích chọn ở trên.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* PPCT Preview when targetType is ppct */}
          {targetType === 'ppct' && previewData && (
            <div className="bg-white/90 rounded-lg p-2.5 text-xs text-slate-700 border border-emerald-100 shadow-2xs">
              <div className="font-semibold text-slate-800 mb-1 flex items-center justify-between">
                <span>Xem trước dữ liệu trích xuất ({previewData.count} mục):</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 max-h-28 sm:max-h-36 overflow-y-auto pr-1">
                {previewData.sample.map((item, idx) => (
                  <li key={idx} className="truncate">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* TKB Rich Interactive Preview & Safety Verification */}
          {targetType === 'tkb' && (
            <div className="space-y-3">
              {tkbReport && parsedSlots && parsedSlots.length >= 5 ? (
                <div className="bg-white rounded-xl border border-blue-200 p-3.5 shadow-xs space-y-3">
                  {/* Metric Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-blue-100 text-blue-800">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Bảng xem trước đối chiếu TKB đã nhận diện:
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold">
                        {parsedSlots.length} tiết học
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                        {tkbReport.classes.length} lớp học
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                        {tkbReport.teachers.length} giáo viên
                      </span>
                    </div>
                  </div>

                  {/* Class Filter Pills */}
                  {tkbReport.classes.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="font-semibold">Xem lịch từng lớp để đối chiếu với TKB gốc:</span>
                        <span className="text-slate-400">Đang xem: Lớp {tkbPreviewClass || tkbReport.classes[0]}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                        {tkbReport.classes.map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setTkbPreviewClass(cls)}
                            className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                              (tkbPreviewClass || tkbReport.classes[0]) === cls
                                ? 'bg-blue-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Lớp {cls}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timetable Matrix Grid for Selected Class */}
                  {tkbReport.classes.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-[11px] text-center border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="py-1.5 px-2 border-r border-slate-200 w-14">Tiết</th>
                            {[2, 3, 4, 5, 6, 7].map((d) => (
                              <th key={d} className="py-1.5 px-2 border-r border-slate-200 last:border-r-0 min-w-[75px]">
                                Thứ {d}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Sáng: Tiết 1 - 5 */}
                          <tr className="bg-blue-50/50 text-[10px] font-bold text-blue-900 border-b border-slate-200">
                            <td colSpan={7} className="py-1 px-2 text-left pl-3 uppercase tracking-wider">
                              Buổi Sáng
                            </td>
                          </tr>
                          {[1, 2, 3, 4, 5].map((period) => (
                            <tr key={`morning-${period}`} className="border-b border-slate-200/80 hover:bg-slate-50/80">
                              <td className="py-1.5 px-2 font-bold text-slate-600 bg-slate-50/50 border-r border-slate-200">
                                Tiết {period}
                              </td>
                              {[2, 3, 4, 5, 6, 7].map((day) => {
                                const currentClass = tkbPreviewClass || tkbReport.classes[0];
                                const slot = parsedSlots.find(
                                  (s) =>
                                    s.dayOfWeek === day &&
                                    s.period === period &&
                                    (s.session === 'morning' || !s.session) &&
                                    s.className.toLowerCase() === currentClass.toLowerCase()
                                );
                                return (
                                  <td
                                    key={day}
                                    className={`py-1.5 px-1.5 border-r border-slate-200 last:border-r-0 ${
                                      slot ? 'bg-blue-50/30' : 'text-slate-300'
                                    }`}
                                  >
                                    {slot ? (
                                      <div className="leading-tight">
                                        <div className="font-bold text-blue-950 truncate">{slot.subject}</div>
                                        {slot.teacherShortName && (
                                          <div className="text-[10px] text-indigo-700 font-medium truncate">
                                            ({slot.teacherShortName})
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span>—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}

                          {/* Chiều: Tiết 1 - 4 (nếu có) */}
                          {parsedSlots.some((s) => s.session === 'afternoon') && (
                            <>
                              <tr className="bg-amber-50/60 text-[10px] font-bold text-amber-900 border-y border-slate-200">
                                <td colSpan={7} className="py-1 px-2 text-left pl-3 uppercase tracking-wider">
                                  Buổi Chiều
                                </td>
                              </tr>
                              {[1, 2, 3, 4, 5].map((period) => (
                                <tr key={`afternoon-${period}`} className="border-b border-slate-200/80 hover:bg-slate-50/80">
                                  <td className="py-1.5 px-2 font-bold text-slate-600 bg-slate-50/50 border-r border-slate-200">
                                    Tiết {period}
                                  </td>
                                  {[2, 3, 4, 5, 6, 7].map((day) => {
                                    const currentClass = tkbPreviewClass || tkbReport.classes[0];
                                    const slot = parsedSlots.find(
                                      (s) =>
                                        s.dayOfWeek === day &&
                                        s.period === period &&
                                        s.session === 'afternoon' &&
                                        s.className.toLowerCase() === currentClass.toLowerCase()
                                    );
                                    return (
                                      <td
                                        key={day}
                                        className={`py-1.5 px-1.5 border-r border-slate-200 last:border-r-0 ${
                                          slot ? 'bg-amber-50/40' : 'text-slate-300'
                                        }`}
                                      >
                                        {slot ? (
                                          <div className="leading-tight">
                                            <div className="font-bold text-amber-950 truncate">{slot.subject}</div>
                                            {slot.teacherShortName && (
                                              <div className="text-[10px] text-amber-800 font-medium truncate">
                                                ({slot.teacherShortName})
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span>—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* MANDATORY CONFIRMATION CHECKBOX */}
                  <div
                    onClick={() => setTkbConfirmed(!tkbConfirmed)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                      tkbConfirmed
                        ? 'border-emerald-600 bg-emerald-50/90 shadow-xs'
                        : 'border-amber-400 bg-amber-50/70 hover:bg-amber-100/60'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {tkbConfirmed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-700" />
                      ) : (
                        <Square className="w-5 h-5 text-amber-700" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">
                        Xác nhận tính chính xác của Thời khóa biểu:
                      </p>
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        Tôi đã kiểm tra kỹ bảng đối chiếu các tiết học, môn học và giáo viên ở trên. Xác nhận dữ liệu đã được nhận diện đúng và đồng ý cho phép hệ thống lưu vào Thời khóa biểu nhà trường.
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedFile && !loading ? (
                /* Strict Alert When Parsing Fails Or Yields Invalid Slots */
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-rose-950">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>CẢNH BÁO AN TOÀN: CHƯA NHẬN DIỆN ĐƯỢC THỜI KHÓA BIỂU HỢP LỆ</span>
                  </div>
                  <p className="text-xs leading-relaxed text-rose-800">
                    Hệ thống tuân thủ nghiêm ngặt nguyên tắc: <strong>Tuyệt đối không tự ý thay đổi, ghi đè hoặc làm xáo trộn Thời khóa biểu hiện tại</strong> khi tệp tải lên chưa được nhận diện chính xác.
                  </p>
                  <div className="text-[11px] text-rose-700 bg-white/80 p-2.5 rounded-lg border border-rose-200 space-y-1">
                    <p className="font-semibold">Cách khắc phục:</p>
                    <p>• Kiểm tra tệp Excel của trường có chứa các cột: Thứ, Tiết, Lớp, Môn học, Giáo viên.</p>
                    <p>• Hoặc chuyển sang tab <strong>"Dán bảng TKB"</strong> ở trên để sao chép trực tiếp bảng thời khóa biểu.</p>
                  </div>
                </div>
              ) : null}

              {/* TKB Versioning Options - Only active when valid slots are recognized */}
              {parsedSlots && parsedSlots.length >= 5 && (
                <div className="p-3 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2.5 text-xs">
                  <div className="font-bold text-blue-950 flex items-center justify-between">
                    <span>Tùy chọn lưu Thời khóa biểu:</span>
                  </div>
                  <label className="flex items-start gap-2 text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="tkbSaveMode"
                      checked={saveAsNewTKBVersion}
                      onChange={() => setSaveAsNewTKBVersion(true)}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-blue-900 block">
                        Lưu thành ĐỢT TKB MỚI (Vẫn lưu giữ TKB cũ cho các tuần trước đó)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Hệ thống sẽ giữ nguyên thời khóa biểu của các tuần trước, và áp dụng thời khóa biểu mới này từ tuần được chọn.
                      </span>
                    </div>
                  </label>

                  {saveAsNewTKBVersion && (
                    <div className="pl-5 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Áp dụng từ Tuần:
                        </label>
                        <select
                          value={tkbFromWeek}
                          onChange={(e) => setTkbFromWeek(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                            <option key={w} value={w}>
                              Tuần {w} {w <= 18 ? '(Học kì I)' : '(Học kì II)'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Tên đợt TKB mới:
                        </label>
                        <input
                          type="text"
                          value={tkbVersionTitle}
                          onChange={(e) => setTkbVersionTitle(e.target.value)}
                          placeholder="VD: TKB Số 2"
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer pt-1 border-t border-blue-200/50">
                    <input
                      type="radio"
                      name="tkbSaveMode"
                      checked={!saveAsNewTKBVersion}
                      onChange={() => setSaveAsNewTKBVersion(false)}
                      className="text-blue-600"
                    />
                    <span className="text-slate-700">Ghi đè trực tiếp vào Thời khóa biểu đang xem</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer - Sticky and Always Visible */}
        <div className="shrink-0 sticky bottom-0 z-20 bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-slate-500 order-2 sm:order-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                canSubmit ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            <span className="text-[11px] sm:text-xs font-medium text-slate-600">
              {targetType === 'teacher' && parsedTeachers.length > 0
                ? `Đã chọn ${selectedCount} / ${parsedTeachers.length} giáo viên`
                : targetType === 'tkb' && parsedSlots && parsedSlots.length >= 5
                ? tkbConfirmed
                  ? `✓ Đã xác nhận TKB (${parsedSlots.length} tiết) • Sẵn sàng lưu`
                  : '⚠️ Cần tích ô xác nhận tính chính xác của TKB để mở nút lưu'
                : targetType === 'tkb' && selectedFile
                ? 'Đã khóa bảo vệ TKB • Không tự ý sửa đổi khi nhận diện sai'
                : 'Dữ liệu được bảo vệ an toàn & kiểm tra nghiêm ngặt'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              disabled={!canSubmit || loading}
              onClick={handleApply}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="truncate">
                {targetType === 'teacher'
                  ? selectedCount > 0
                    ? `Xác nhận lưu ${selectedCount} GV đã chọn`
                    : 'Chưa chọn giáo viên nào'
                  : targetType === 'tkb'
                  ? parsedSlots && parsedSlots.length >= 5
                    ? tkbConfirmed
                      ? `Lưu Thời khóa biểu (${parsedSlots.length} tiết)`
                      : 'Chưa xác nhận bảng TKB ở trên'
                    : 'Chưa nhận diện được TKB (Đã khóa)'
                  : parsedPPCTItems && parsedPPCTItems.length > 0
                  ? `Lưu Kế hoạch PPCT (${parsedPPCTItems.length} bài)`
                  : 'Lưu Kế hoạch dạy học (PPCT)'}
              </span>
              <ArrowRight className="w-4 h-4 text-blue-200 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

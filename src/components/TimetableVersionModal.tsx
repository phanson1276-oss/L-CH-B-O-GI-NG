import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit3, X, Check, Info, Clock, AlertCircle, Copy, FileSpreadsheet, Home, Trash2, Upload } from 'lucide-react';
import { TimetableVersion } from '../types';

interface TimetableVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  currentVersion?: TimetableVersion;
  existingVersions?: TimetableVersion[];
  onSave: (data: {
    title: string;
    effectiveFromWeek: number;
    effectiveToWeek?: number;
    effectiveDate: string;
    copyFromCurrent: boolean;
    note?: string;
  }) => void;
  onDeleteVersion?: (versionId: string) => void;
  onGoHome?: () => void;
  onOpenUploadModal?: () => void;
}

export const TimetableVersionModal: React.FC<TimetableVersionModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentVersion,
  existingVersions = [],
  onSave,
  onDeleteVersion,
  onGoHome,
  onOpenUploadModal,
}) => {
  // Determine suggested next version title and start week
  const versionList = existingVersions || [];
  const nextVersionNumber = versionList.length + 1;
  const latestFromWeek = versionList.reduce(
    (max, v) => (v.effectiveFromWeek > max ? v.effectiveFromWeek : max),
    1
  );
  const defaultNextWeek = Math.min(latestFromWeek + 4, 35);

  const [title, setTitle] = useState('');
  const [effectiveFromWeek, setEffectiveFromWeek] = useState(16);
  const [effectiveToWeek, setEffectiveToWeek] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState('22/12/2025');
  const [copyFromCurrent, setCopyFromCurrent] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && currentVersion) {
        setTitle(currentVersion.title);
        setEffectiveFromWeek(currentVersion.effectiveFromWeek);
        setEffectiveToWeek(currentVersion.effectiveToWeek ? String(currentVersion.effectiveToWeek) : '');
        setEffectiveDate(currentVersion.effectiveDate);
        setCopyFromCurrent(false);
        setNote(currentVersion.note || '');
      } else {
        // Create mode
        setTitle(`TKB Số ${nextVersionNumber} (Lần ${nextVersionNumber + 6}) - Áp dụng từ Tuần ${defaultNextWeek}`);
        setEffectiveFromWeek(defaultNextWeek);
        setEffectiveToWeek('');
        // Format today or default date
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        setEffectiveDate(dateStr);
        setCopyFromCurrent(true);
        setNote(`Áp dụng điều chỉnh từ tuần ${defaultNextWeek}`);
      }
    }
  }, [isOpen, mode, currentVersion, nextVersionNumber, defaultNextWeek]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      effectiveFromWeek: Number(effectiveFromWeek),
      effectiveToWeek: effectiveToWeek.trim() ? Number(effectiveToWeek) : undefined,
      effectiveDate: effectiveDate.trim() || '22/12/2025',
      copyFromCurrent,
      note: note.trim() || undefined,
    });
    onClose();
  };

  const handleUploadClick = () => {
    onClose();
    if (onOpenUploadModal) {
      onOpenUploadModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-hidden">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92dvh] sm:max-h-[88vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="shrink-0 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-blue-800/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20 shrink-0">
              {mode === 'create' ? (
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
              ) : (
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold truncate">
                {mode === 'create'
                  ? 'Thay Đổi Thời Khóa Biểu Mới'
                  : 'Chỉnh Sửa Thông Tin Đợt TKB'}
              </h3>
              <p className="text-[11px] sm:text-xs text-blue-200 truncate">
                {mode === 'create'
                  ? 'Tạo TKB mới và tự động lưu giữ TKB cũ cho các tuần trước đó'
                  : 'Cập nhật tên gọi và phạm vi tuần áp dụng'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            {onGoHome && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoHome();
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95 cursor-pointer border border-white/20"
                title="Đóng và trở về Trang chủ"
              >
                <Home className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden xs:inline">Trang chủ</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="timetable-version-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm overscroll-contain"
        >
          {/* Explanation Alert for History Mechanism with prominent direct Save & Upload buttons */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl space-y-3 text-blue-950 text-xs shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5 shadow-2xs">
                <Info className="w-4 h-4" />
              </div>
              <div className="leading-relaxed flex-1">
                <div className="font-bold text-sm text-blue-950 mb-1 flex items-center gap-1.5">
                  <span>Cơ chế lưu giữ lịch sử TKB:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-200 text-blue-800">Tự động thông minh</span>
                </div>
                {effectiveFromWeek > 1 ? (
                  <p className="text-slate-700">
                    Khi Thầy/Cô tạo hoặc lưu TKB mới áp dụng từ <strong>Tuần {effectiveFromWeek}</strong>, hệ thống sẽ tự động chốt TKB cũ áp dụng đến hết <strong>Tuần {effectiveFromWeek - 1}</strong>. Khi xem hoặc xuất báo giảng các tuần trước, hệ thống vẫn dùng đúng TKB cũ!
                  </p>
                ) : (
                  <p className="text-slate-700">
                    Đây là đợt Thời khóa biểu áp dụng từ <strong>Tuần 1</strong> (đầu năm học). Mọi thay đổi sẽ được ghi nhận và Thầy/Cô có thể tạo thêm các đợt TKB mới cho các tuần tiếp theo bất cứ lúc nào!
                  </p>
                )}
              </div>
            </div>

            {/* Prominent Quick Action Buttons directly inside the Info Box */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-blue-200">
              <button
                type="submit"
                form="timetable-version-form"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer hover:shadow-md"
                title="Lưu ngay đợt Thời khóa biểu này"
              >
                <Check className="w-4 h-4 text-amber-300" />
                <span>{mode === 'create' ? 'Lưu & Áp Dụng TKB Mới' : 'Lưu Thay Đổi Đợt TKB'}</span>
              </button>

              {onOpenUploadModal && (
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer hover:shadow-md"
                  title="Tải tệp Thời khóa biểu mới từ máy tính (hỗ trợ Excel, Word, PDF)"
                >
                  <Upload className="w-4 h-4 text-emerald-200" />
                  <span>Tải TKB mới lên (Excel / Word / PDF)</span>
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên đợt Thời khóa biểu (*):
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: TKB Số 2 (Lần 8) - Áp dụng từ Tuần 16"
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Week Range Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Áp dụng từ Tuần (*):
              </label>
              <select
                value={effectiveFromWeek}
                onChange={(e) => setEffectiveFromWeek(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {w <= 18 ? '(Học kì I)' : '(Học kì II)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đến Tuần (Tùy chọn):
              </label>
              <select
                value={effectiveToWeek}
                onChange={(e) => setEffectiveToWeek(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Đến hết năm học (hoặc TKB kế tiếp)</option>
                {Array.from({ length: 35 }, (_, i) => i + 1)
                  .filter((w) => w >= effectiveFromWeek)
                  .map((w) => (
                    <option key={w} value={w}>
                      Đến hết Tuần {w}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Effective Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày bắt đầu thực hiện:
              </label>
              <input
                type="text"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                placeholder="VD: 22/12/2025"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú điều chỉnh:
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Đổi tiết Toán lớp 8, điều chỉnh KHTN"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Copy Option in Create Mode */}
          {mode === 'create' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <p className="text-xs font-bold text-slate-700">Khởi tạo dữ liệu các tiết học:</p>
              
              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="initMode"
                  checked={copyFromCurrent}
                  onChange={() => setCopyFromCurrent(true)}
                  className="text-blue-600 focus:ring-blue-500 mt-0.5 shrink-0"
                />
                <div>
                  <span className="font-semibold text-blue-900 block">
                    Sao chép toàn bộ tiết từ TKB hiện tại để chỉnh sửa nhanh (Khuyên dùng)
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Giúp Thầy/Cô không phải nhập lại từ đầu, chỉ cần chỉnh sửa các tiết có thay đổi.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer pt-1">
                <input
                  type="radio"
                  name="initMode"
                  checked={!copyFromCurrent}
                  onChange={() => setCopyFromCurrent(false)}
                  className="text-blue-600 focus:ring-blue-500 mt-0.5 shrink-0"
                />
                <div>
                  <span className="font-medium text-slate-700 block">
                    Tạo bảng thời khóa biểu trống (để nhập mới hoàn toàn hoặc tải tệp lên)
                  </span>
                </div>
              </label>

              {onOpenUploadModal && (
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">Hoặc tải trực tiếp tệp thời khóa biểu:</span>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Tải tệp TKB (.xlsx, .docx, .pdf)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Sticky Footer - Always Visible on Screen */}
        <div className="shrink-0 p-3 sm:px-6 sm:py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {mode === 'edit' && currentVersion && onDeleteVersion ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteVersion(currentVersion.id);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
              title="Xóa đợt Thời khóa biểu này khỏi hệ thống"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Xóa đợt TKB này</span>
            </button>
          ) : onOpenUploadModal ? (
            <button
              type="button"
              onClick={handleUploadClick}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-300 transition-colors cursor-pointer"
              title="Mở hộp thoại tải tệp Thời khóa biểu mới từ máy tính"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Tải tệp TKB mới lên</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="timetable-version-form"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{mode === 'create' ? 'Tạo & Áp Dụng TKB Mới' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Edit3,
  Calendar,
  Clock,
  User,
  BookOpen,
  GraduationCap,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Teacher, TimetableSlot } from '../types';

export interface SlotEditorData {
  day: number;
  period: number;
  session: 'morning' | 'afternoon';
  originalDay: number;
  originalPeriod: number;
  originalSession: 'morning' | 'afternoon';
  originalClassName: string;
  className: string;
  subject: string;
  teacherShortName: string;
  isExistingSlot: boolean;
}

interface TimetableSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotData: SlotEditorData | null;
  onSave: (updated: SlotEditorData) => void;
  onDelete?: (slotData: SlotEditorData) => void;
  teachers: Teacher[];
  classes: string[];
  timetableSlots: TimetableSlot[];
}

const COMMON_SUBJECTS = [
  'Toán',
  'Ngữ văn',
  'Tiếng Anh',
  'KHTN',
  'Lịch sử & Địa lí',
  'GDCD',
  'Tin học',
  'Công nghệ',
  'GDTC',
  'Nghệ thuật',
  'HĐTN, HN',
  'SHL',
  'Chào cờ',
];

export const TimetableSlotModal: React.FC<TimetableSlotModalProps> = ({
  isOpen,
  onClose,
  slotData,
  onSave,
  onDelete,
  teachers,
  classes,
  timetableSlots,
}) => {
  const [formData, setFormData] = useState<SlotEditorData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync form data when slotData changes
  useEffect(() => {
    if (slotData) {
      setFormData({ ...slotData });
      setValidationError(null);
    } else {
      setFormData(null);
      setValidationError(null);
    }
  }, [slotData]);

  // Real-time conflict detection in the modal
  const conflict = useMemo(() => {
    if (!formData || !formData.teacherShortName) return null;
    const teacherClean = formData.teacherShortName.trim().toLowerCase();
    if (!teacherClean || teacherClean === 'gv') return null;

    const conflictsFound = (timetableSlots || []).filter((s) => {
      const sSession = s.session || (s.period > 5 ? 'afternoon' : 'morning');
      const sPeriod = s.period > 5 ? s.period - 5 : s.period;

      // Skip the original slot position itself being modified
      const isOriginal =
        s.dayOfWeek === formData.originalDay &&
        sPeriod === formData.originalPeriod &&
        sSession === formData.originalSession &&
        s.className === formData.originalClassName;
      if (isOriginal) return false;

      return (
        s.dayOfWeek === formData.day &&
        sPeriod === formData.period &&
        sSession === formData.session &&
        s.teacherShortName &&
        s.teacherShortName.toLowerCase() === teacherClean &&
        s.className !== formData.className
      );
    });

    if (conflictsFound.length > 0) {
      const conflictingClasses = Array.from(new Set(conflictsFound.map((s) => s.className)));
      return {
        teacherName: formData.teacherShortName,
        classes: conflictingClasses,
      };
    }
    return null;
  }, [formData, timetableSlots]);

  if (!isOpen || !formData) return null;

  const handleTeacherSelect = (shortName: string) => {
    setFormData((prev) => (prev ? { ...prev, teacherShortName: shortName } : null));
    setValidationError(null);
  };

  const handleSubjectSelect = (subject: string) => {
    setFormData((prev) => (prev ? { ...prev, subject } : null));
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      setValidationError('Vui lòng nhập hoặc chọn tên môn học cho tiết này.');
      return;
    }
    if (!formData.className.trim()) {
      setValidationError('Vui lòng chọn lớp học.');
      return;
    }
    setValidationError(null);
    onSave(formData);
  };

  const sessionLabel = formData.session === 'afternoon' ? 'Chiều' : 'Sáng';
  const sessionTime = formData.session === 'afternoon' ? '14h00' : '7h00';

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in"
      onClick={onClose}
      id="timetable-slot-modal-backdrop"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        id="timetable-slot-modal"
      >
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl text-amber-300 backdrop-blur-xs border border-white/10">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base tracking-wide">
                  CHỈNH SỬA TIẾT HỌC
                </h3>
                {formData.isExistingSlot ? (
                  <span className="text-[10px] font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full uppercase">
                    Đã có tiết
                  </span>
                ) : (
                  <span className="text-[10px] font-black bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full uppercase">
                    Tiết mới
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Chỉnh sửa trực tiếp môn học, lớp, hoặc giáo viên phụ trách
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Đóng bảng điều khiển"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Location Badge Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-1.5 text-xs shrink-0">
          <span className="font-bold text-slate-500 mr-1">Vị trí ô đã chọn:</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-bold rounded-md flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-700" />
            Buổi {sessionLabel} ({sessionTime})
          </span>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 font-bold rounded-md flex items-center gap-1">
            <Calendar className="w-3 h-3 text-indigo-700" />
            Thứ {formData.day}
          </span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md">
            Tiết {formData.period}
          </span>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-bold rounded-md flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-purple-700" />
            Lớp {formData.originalClassName}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-center gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-bold text-xs text-amber-900">{validationError}</span>
            </div>
          )}

          {/* Conflict Warning Banner */}
          {conflict && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <strong className="text-rose-900 font-bold">Cảnh báo: Trùng lịch giáo viên!</strong>
                <p className="text-rose-800 leading-relaxed">
                  Giáo viên <strong>{conflict.teacherName}</strong> đã có lịch dạy tại lớp{' '}
                  <strong className="font-bold underline">{conflict.classes.join(', ')}</strong> vào cùng Tiết {formData.period} Thứ {formData.day} (Buổi {sessionLabel}). Hệ thống vẫn cho phép lưu nhưng sẽ đánh dấu cảnh báo trùng giờ trên bảng TKB.
                </p>
              </div>
            </div>
          )}

          {/* 1. Thay đổi LỚP HỌC */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-900">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                1. Lớp học (Thay đổi lớp cho tiết này)
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Chọn lớp trong danh sách trường
              </span>
            </label>
            <select
              value={formData.className}
              onChange={(e) =>
                setFormData((prev) => (prev ? { ...prev, className: e.target.value } : null))
              }
              className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-2xs cursor-pointer"
            >
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  Lớp {cls} {cls === formData.originalClassName ? '(Lớp hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Thay đổi TÊN MÔN HỌC */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-900">
                <BookOpen className="w-4 h-4 text-blue-600" />
                2. Tên môn học
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Nhập môn hoặc bấm chọn nhanh bên dưới
              </span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => (prev ? { ...prev, subject: e.target.value } : null))
              }
              placeholder="VD: Toán, Ngữ văn, Tiếng Anh, KHTN..."
              className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-2xs"
            />

            {/* Quick Subjects Selection Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_SUBJECTS.map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => handleSubjectSelect(subj)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    formData.subject === subj
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-2xs scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Thay đổi GIÁO VIÊN PHỤ TRÁCH */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-900">
                <User className="w-4 h-4 text-emerald-600" />
                3. Giáo viên phụ trách
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Chọn từ danh sách giáo viên hoặc nhập tên viết tắt
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <select
                  value={formData.teacherShortName}
                  onChange={(e) => handleTeacherSelect(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs shadow-2xs cursor-pointer"
                >
                  <option value="">-- Để trống (Tiết trống / Nghỉ) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.shortName}>
                      {t.name} ({t.shortName}) - Môn: {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={formData.teacherShortName}
                  onChange={(e) => handleTeacherSelect(e.target.value)}
                  placeholder="Tên viết tắt (VD: Lan)"
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs shadow-2xs"
                  title="Nhập tên viết tắt nếu chưa có trong danh sách"
                />
              </div>
            </div>
          </div>

          {/* 4. Điều chỉnh Buổi / Thứ / Tiết (Tùy chọn di chuyển tiết) */}
          <div className="pt-3 border-t border-slate-200">
            <span className="font-bold text-slate-700 block mb-1.5 text-[11px] uppercase tracking-wider">
              Khung thời gian (Buổi, Thứ, Tiết)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Buổi</span>
                <select
                  value={formData.session}
                  onChange={(e) =>
                    setFormData((prev) =>
                      prev ? { ...prev, session: e.target.value as 'morning' | 'afternoon' } : null
                    )
                  }
                  className="w-full border border-slate-300 rounded-xl p-2 font-semibold text-slate-800 bg-slate-50 text-xs cursor-pointer"
                >
                  <option value="morning">Sáng (7h00)</option>
                  <option value="afternoon">Chiều (14h00)</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Thứ</span>
                <select
                  value={formData.day}
                  onChange={(e) =>
                    setFormData((prev) =>
                      prev ? { ...prev, day: Number(e.target.value) } : null
                    )
                  }
                  className="w-full border border-slate-300 rounded-xl p-2 font-semibold text-slate-800 bg-slate-50 text-xs cursor-pointer"
                >
                  <option value={2}>Thứ 2</option>
                  <option value={3}>Thứ 3</option>
                  <option value={4}>Thứ 4</option>
                  <option value={5}>Thứ 5</option>
                  <option value={6}>Thứ 6</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Tiết</span>
                <select
                  value={formData.period}
                  onChange={(e) =>
                    setFormData((prev) =>
                      prev ? { ...prev, period: Number(e.target.value) } : null
                    )
                  }
                  className="w-full border border-slate-300 rounded-xl p-2 font-semibold text-slate-800 bg-slate-50 text-xs cursor-pointer"
                >
                  <option value={1}>Tiết 1</option>
                  <option value={2}>Tiết 2</option>
                  <option value={3}>Tiết 3</option>
                  <option value={4}>Tiết 4</option>
                  <option value={5}>Tiết 5</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div>
            {formData.isExistingSlot && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(formData)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Xóa tiết học này để đưa về ô trống"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Xóa tiết này</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Lưu thay đổi tiết</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

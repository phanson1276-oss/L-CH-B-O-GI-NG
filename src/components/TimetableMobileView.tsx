import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  Plus,
  Edit2,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  History,
  Sparkles,
  Search,
  Save,
  Home,
} from 'lucide-react';
import { TimetableData, TimetableSlot, Teacher, TimetableVersion } from '../types';

interface TimetableMobileViewProps {
  timetable: TimetableData;
  teachers: Teacher[];
  classes: string[];
  timetableVersions: TimetableVersion[];
  activeTimetableId: string;
  onSelectVersion: (version: TimetableVersion) => void;
  onOpenCreateVersionModal: () => void;
  onEditSlot: (slot: { day: number; period: number; className: string }) => void;
  onOpenUploadModal: () => void;
  onSwitchToFullMatrix: () => void;
  onSaveTimetable?: () => void;
  onGoHome?: () => void;
  onDeleteVersion?: (versionId: string) => void;
  onEditVersion?: () => void;
  onDeleteAllOldVersions?: () => void;
  onClearAllTKB?: () => void;
}

export const TimetableMobileView: React.FC<TimetableMobileViewProps> = ({
  timetable,
  teachers = [],
  classes = [],
  timetableVersions = [],
  activeTimetableId,
  onSelectVersion,
  onOpenCreateVersionModal,
  onEditSlot,
  onOpenUploadModal,
  onSwitchToFullMatrix,
  onSaveTimetable,
  onGoHome,
  onDeleteVersion,
  onEditVersion,
  onDeleteAllOldVersions,
  onClearAllTKB,
}) => {
  // Mobile sub-mode: 'by_teacher' or 'by_class'
  const [filterMode, setFilterMode] = useState<'by_teacher' | 'by_class'>('by_teacher');
  const [selectedTeacherShortName, setSelectedTeacherShortName] = useState<string>(
    teachers?.[0]?.shortName || 'Thắm'
  );
  const [selectedClassName, setSelectedClassName] = useState<string>('9A1');
  const [selectedDay, setSelectedDay] = useState<number>(2); // Thứ 2 default

  const daysList = [
    { day: 2, label: 'Thứ 2' },
    { day: 3, label: 'Thứ 3' },
    { day: 4, label: 'Thứ 4' },
    { day: 5, label: 'Thứ 5' },
    { day: 6, label: 'Thứ 6' },
    { day: 7, label: 'Thứ 7' },
  ];

  // Current active version
  const currentVersion = (timetableVersions || []).find((v) => v.id === activeTimetableId) || (timetableVersions || [])[0];

  // Periods list 1..5 for Morning, 1..5 for Afternoon
  const morningPeriods = [1, 2, 3, 4, 5];
  const afternoonPeriods = [1, 2, 3, 4, 5];

  // Slots for the current selection
  const currentSlots = useMemo(() => {
    return (timetable?.slots || []).filter((s) => {
      if (s.dayOfWeek !== selectedDay) return false;
      if (filterMode === 'by_teacher') {
        return s.teacherShortName?.toLowerCase() === selectedTeacherShortName?.toLowerCase();
      } else {
        return s.className?.toLowerCase() === selectedClassName?.toLowerCase();
      }
    });
  }, [timetable?.slots, selectedDay, filterMode, selectedTeacherShortName, selectedClassName]);

  // Find slot for a specific period
  const getSlot = (period: number, session: 'morning' | 'afternoon') => {
    return currentSlots.find((s) => s.period === period && s.session === session);
  };

  return (
    <div className="space-y-3 pb-24 text-slate-900" id="timetable-mobile-view">
      {/* Top Banner: Timetable Version & Info */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              {currentVersion?.title || timetable.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="text-[11px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Trở về Trang chủ"
              >
                <Home className="w-3.5 h-3.5 text-amber-300" />
                <span>Trang chủ</span>
              </button>
            )}

            {onSaveTimetable && (
              <button
                type="button"
                onClick={onSaveTimetable}
                className="text-[11px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2 py-1 rounded-lg font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                title="Lưu Thời khóa biểu vào bộ nhớ hệ thống"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu TKB</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCreateVersionModal}
              className="text-[11px] bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg font-bold hover:bg-amber-300"
            >
              + Đổi TKB mới
            </button>
          </div>
        </div>

        {/* Version switcher dropdown & actions */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-200 shrink-0">Đợt áp dụng:</span>
            <select
              value={activeTimetableId}
              onChange={(e) => {
                const v = timetableVersions.find((item) => item.id === e.target.value);
                if (v) onSelectVersion(v);
              }}
              className="w-full bg-white/15 text-white font-bold text-xs rounded-xl px-2.5 py-1.5 border border-white/20"
            >
              {timetableVersions.map((ver) => (
                <option key={ver.id} value={ver.id} className="text-slate-900 bg-white">
                  {ver.title} ({ver.effectiveToWeek ? `Tuần ${ver.effectiveFromWeek} - ${ver.effectiveToWeek}` : `Từ Tuần ${ver.effectiveFromWeek}+`})
                </option>
              ))}
            </select>
          </div>

          {/* Version management action bar for mobile */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-white/15 text-[11px]">
            <div className="flex items-center gap-1.5">
              {onEditVersion && (
                <button
                  type="button"
                  onClick={onEditVersion}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium border border-white/15 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 text-blue-200" />
                  <span>Sửa đợt này</span>
                </button>
              )}

              {onDeleteVersion && (
                <button
                  type="button"
                  onClick={() => onDeleteVersion(activeTimetableId)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 hover:text-white font-medium border border-rose-500/30 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{timetableVersions.length > 1 ? 'Xóa đợt này' : 'Xóa sạch tiết'}</span>
                </button>
              )}
            </div>

            {timetableVersions.length > 1 && onDeleteAllOldVersions && (
              <button
                type="button"
                onClick={onDeleteAllOldVersions}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 hover:text-white font-bold border border-amber-500/30 cursor-pointer"
                title="Xóa tất cả các đợt TKB cũ và chỉ giữ đợt này cho cả 35 tuần"
              >
                <Trash2 className="w-3 h-3 text-amber-300" />
                <span>Xóa hết TKB cũ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mode Selector & Filter */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Toggle between By Teacher vs By Class */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterMode('by_teacher')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[40px] ${
              filterMode === 'by_teacher'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Theo Giáo viên</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('by_class')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[40px] ${
              filterMode === 'by_class'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Theo Lớp học</span>
          </button>
        </div>

        {/* Dynamic Selector based on filterMode */}
        {filterMode === 'by_teacher' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn Giáo viên:
            </label>
            <select
              value={selectedTeacherShortName}
              onChange={(e) => setSelectedTeacherShortName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.shortName}>
                  {t.name} ({t.shortName}) - {t.subject}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn Lớp học:
            </label>
            <select
              value={selectedClassName}
              onChange={(e) => setSelectedClassName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
            >
              {classes.map((c) => (
                <option key={c} value={c}>
                  Lớp {c}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="text-blue-700 font-bold hover:underline"
          >
            + Tải file TKB mới (Excel, Word, PDF)
          </button>

          <button
            type="button"
            onClick={onSwitchToFullMatrix}
            className="text-slate-600 hover:text-slate-900 font-semibold"
          >
            Xem bảng ma trận 18 lớp →
          </button>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="sticky top-14 z-20 bg-slate-50/95 backdrop-blur-md py-1">
        <div className="grid grid-cols-6 gap-1">
          {daysList.map((d) => {
            const isSelected = selectedDay === d.day;
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelectedDay(d.day)}
                className={`py-2 rounded-xl text-xs font-bold transition-all text-center min-h-[42px] ${
                  isSelected
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Periods Schedule: Morning & Afternoon */}
      <div className="space-y-3">
        {/* Morning Session */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <Sun className="w-4 h-4 text-amber-600" />
            <span>BUỔI SÁNG (Tiết 1 - 5)</span>
          </div>

          <div className="divide-y divide-slate-100">
            {morningPeriods.map((p) => {
              const slot = getSlot(p, 'morning');
              return (
                <div key={p} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                      T{p}
                    </span>

                    {slot ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {filterMode === 'by_teacher' ? `Lớp ${slot.className}` : slot.teacherShortName}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {slot.subject}
                          </span>
                        </div>
                        {slot.room && (
                          <span className="text-[11px] text-slate-500">Phòng: {slot.room}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-400">Trống (Nghỉ)</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const targetClass = filterMode === 'by_class' ? selectedClassName : slot?.className || '9A1';
                      onEditSlot({ day: selectedDay, period: p, className: targetClass });
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-700 rounded-lg hover:bg-slate-100"
                    title="Chỉnh sửa tiết này"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Afternoon Session */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
            <Moon className="w-4 h-4 text-indigo-600" />
            <span>BUỔI CHIỀU (Tiết 1 - 5)</span>
          </div>

          <div className="divide-y divide-slate-100">
            {afternoonPeriods.map((p) => {
              const slot = getSlot(p, 'afternoon');
              return (
                <div key={p} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                      T{p}
                    </span>

                    {slot ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {filterMode === 'by_teacher' ? `Lớp ${slot.className}` : slot.teacherShortName}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {slot.subject}
                          </span>
                        </div>
                        {slot.room && (
                          <span className="text-[11px] text-slate-500">Phòng: {slot.room}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-400">Trống (Nghỉ)</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const targetClass = filterMode === 'by_class' ? selectedClassName : slot?.className || '9A1';
                      onEditSlot({ day: selectedDay, period: p, className: targetClass });
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-700 rounded-lg hover:bg-slate-100"
                    title="Chỉnh sửa tiết này"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

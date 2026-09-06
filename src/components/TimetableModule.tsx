import React, { useState, useMemo } from 'react';
import {
  Upload,
  Download,
  Filter,
  User,
  Users,
  Calendar,
  Plus,
  RefreshCw,
  Check,
  Edit2,
  Search,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Eye,
  Clock,
  History,
  CalendarRange,
  Edit3,
  Save,
  Home,
  Printer,
  FileText,
  Info,
  ClipboardList,
} from 'lucide-react';
import { TimetableData, TimetableSlot, Teacher, TimetableVersion, DeviceMode } from '../types';
import { TEACHERS_LIST, CLASSES_LIST, SCHOOL_INFO, INITIAL_TIMETABLE, INITIAL_TIMETABLE_VERSIONS } from '../data/mockData';
import { TimetableVersionModal } from './TimetableVersionModal';
import { TimetableMobileView } from './TimetableMobileView';
import { ConfirmModal, ConfirmDialogState } from './ConfirmModal';
import { TeacherWeeklyScheduleTable } from './TeacherWeeklyScheduleTable';
import { exportTimetableToPdf } from '../utils/pdfExport';
import * as XLSX from 'xlsx';

interface TimetableModuleProps {
  timetable: TimetableData;
  setTimetable: React.Dispatch<React.SetStateAction<TimetableData>>;
  selectedTeacherShortName: string;
  setSelectedTeacherShortName: (shortName: string) => void;
  onOpenUploadModal: () => void;
  teachers?: Teacher[];
  onOpenUploadTeacherModal?: () => void;
  onOpenTeacherManagerModal?: () => void;
  onSaveTimetable?: () => void;
  onGoHome?: () => void;
  // Versioning Props
  timetableVersions?: TimetableVersion[];
  setTimetableVersions?: React.Dispatch<React.SetStateAction<TimetableVersion[]>>;
  activeTimetableId?: string;
  setActiveTimetableId?: (id: string) => void;
  selectedWeek?: number;
  deviceMode?: DeviceMode;
  setDeviceMode?: (mode: DeviceMode) => void;
}

export interface TimetableConflict {
  key: string;
  dayOfWeek: number;
  dayName: string;
  session: 'morning' | 'afternoon';
  sessionName: 'Sáng' | 'Chiều';
  period: number;
  teacherShortName: string;
  classes: string[];
  subjects: string[];
}

export const TimetableModule: React.FC<TimetableModuleProps> = ({
  timetable,
  setTimetable,
  selectedTeacherShortName,
  setSelectedTeacherShortName,
  onOpenUploadModal,
  teachers = TEACHERS_LIST,
  onOpenUploadTeacherModal,
  onOpenTeacherManagerModal,
  onSaveTimetable,
  onGoHome,
  timetableVersions = INITIAL_TIMETABLE_VERSIONS,
  setTimetableVersions,
  activeTimetableId = 'tkb-v2',
  setActiveTimetableId,
  selectedWeek = 16,
  deviceMode = 'desktop',
  setDeviceMode,
}) => {
  const [mobileTKBFormat, setMobileTKBFormat] = useState<'schedule' | 'matrix'>('schedule');
  const [viewMode, setViewMode] = useState<'matrix' | 'teacher' | 'weekly-schedule'>('matrix');
  const [sessionFilter, setSessionFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [editingSlot, setEditingSlot] = useState<{
    day: number;
    period: number;
    className: string;
    session: 'morning' | 'afternoon';
  } | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [showConflictDetails, setShowConflictDetails] = useState(true);
  const [savedTKBRecently, setSavedTKBRecently] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const morningSlotsCount = useMemo(() => {
    return timetable.slots.filter((s) => (s.session || (s.period > 5 ? 'afternoon' : 'morning')) === 'morning').length;
  }, [timetable.slots]);

  const afternoonSlotsCount = useMemo(() => {
    return timetable.slots.filter((s) => (s.session || (s.period > 5 ? 'afternoon' : 'morning')) === 'afternoon').length;
  }, [timetable.slots]);

  const handleSaveTimetableClick = () => {
    if (onSaveTimetable) {
      onSaveTimetable();
    } else {
      try {
        localStorage.setItem('baogiang_timetable_v2', JSON.stringify(timetable));
        if (timetableVersions) {
          localStorage.setItem('baogiang_tkb_versions_v2', JSON.stringify(timetableVersions));
        }
      } catch (e) {
        console.warn('Error saving timetable', e);
      }
    }
    setSavedTKBRecently(true);
    setTimeout(() => setSavedTKBRecently(false), 2500);
  };

  // Version management modal states
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionModalMode, setVersionModalMode] = useState<'create' | 'edit'>('create');

  const days = [
    { dayNumber: 2, name: 'Thứ 2 (Hai)' },
    { dayNumber: 3, name: 'Thứ 3 (Ba)' },
    { dayNumber: 4, name: 'Thứ 4 (Tư)' },
    { dayNumber: 5, name: 'Thứ 5 (Năm)' },
    { dayNumber: 6, name: 'Thứ 6 (Sáu)' },
  ];

  const periods = [1, 2, 3, 4, 5];

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Helper to find slot for a day, period, class and session
  const getSlot = (
    day: number,
    period: number,
    className: string,
    session: 'morning' | 'afternoon' = 'morning'
  ): TimetableSlot | undefined => {
    return timetable.slots.find((s) => {
      const sSession = s.session || (s.period > 5 ? 'afternoon' : 'morning');
      const sPeriod = s.period > 5 ? s.period - 5 : s.period;
      const targetPeriod = period > 5 ? period - 5 : period;
      return (
        s.dayOfWeek === day &&
        sPeriod === targetPeriod &&
        sSession === session &&
        s.className === className
      );
    });
  };

  // Conflict Detection Logic: Strictly enforce Primary Key [Buoi] + [Thu] + [Tiet] + [Giáo viên]
  // Rule: Do NOT compare conflicts between Morning (7h00) and Afternoon (14h00)
  const conflicts: TimetableConflict[] = useMemo(() => {
    const groups: { [key: string]: TimetableSlot[] } = {};

    timetable.slots.forEach((slot) => {
      const teacherKey = slot.teacherShortName?.trim().toLowerCase();
      // Skip empty, placeholder, or collective / general activities
      if (
        !teacherKey ||
        teacherKey === '-' ||
        teacherKey === '—' ||
        teacherKey === 'none' ||
        teacherKey === 'shl' ||
        teacherKey === 'chào cờ' ||
        teacherKey === 'hội đồng' ||
        teacherKey === 'sinh hoạt chuyên môn'
      ) {
        return;
      }

      const session = slot.session || (slot.period > 5 ? 'afternoon' : 'morning');
      const normPeriod = slot.period > 5 ? slot.period - 5 : slot.period;

      // Primary Key: [Buổi] + [Thứ] + [Tiết]
      const key = `${session}-${slot.dayOfWeek}-${normPeriod}-${teacherKey}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(slot);
    });

    const result: TimetableConflict[] = [];
    Object.entries(groups).forEach(([key, slotList]) => {
      if (slotList.length > 1) {
        const first = slotList[0];
        const dayObj = days.find((d) => d.dayNumber === first.dayOfWeek);
        const session = first.session || (first.period > 5 ? 'afternoon' : 'morning');
        const normPeriod = first.period > 5 ? first.period - 5 : first.period;
        result.push({
          key,
          dayOfWeek: first.dayOfWeek,
          dayName: dayObj ? dayObj.name : `Thứ ${first.dayOfWeek}`,
          session,
          sessionName: session === 'afternoon' ? 'Chiều' : 'Sáng',
          period: normPeriod,
          teacherShortName: first.teacherShortName,
          classes: slotList.map((s) => s.className),
          subjects: slotList.map((s) => s.subject),
        });
      }
    });

    return result;
  }, [timetable.slots]);

  // Set of conflicting slot identifiers: `${session}-${day}-${period}-${className}`
  const conflictingSlotIdentifiers = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach((conflict) => {
      conflict.classes.forEach((cls) => {
        set.add(`${conflict.session}-${conflict.dayOfWeek}-${conflict.period}-${cls}`);
      });
    });
    return set;
  }, [conflicts]);

  // Check if a specific slot has conflict
  const getConflictForSlot = (
    day: number,
    period: number,
    className: string,
    session: 'morning' | 'afternoon' = 'morning'
  ): TimetableConflict | undefined => {
    const normPeriod = period > 5 ? period - 5 : period;
    return conflicts.find(
      (c) =>
        c.session === session &&
        c.dayOfWeek === day &&
        c.period === normPeriod &&
        c.classes.includes(className)
    );
  };

  // Conflicts affecting currently selected teacher
  const selectedTeacherConflicts = useMemo(() => {
    return conflicts.filter(
      (c) => c.teacherShortName.toLowerCase() === selectedTeacherShortName.toLowerCase()
    );
  }, [conflicts, selectedTeacherShortName]);

  const handleStartEdit = (
    day: number,
    period: number,
    className: string,
    session: 'morning' | 'afternoon' = 'morning'
  ) => {
    const current = getSlot(day, period, className, session);
    setEditSubject(current?.subject || '');
    setEditTeacher(current?.teacherShortName || '');
    setEditingSlot({ day, period, className, session });
  };

  const handleSaveEdit = () => {
    if (!editingSlot) return;

    setTimetable((prev) => {
      const targetPeriod = editingSlot.period > 5 ? editingSlot.period - 5 : editingSlot.period;
      const filtered = prev.slots.filter((s) => {
        const sSession = s.session || (s.period > 5 ? 'afternoon' : 'morning');
        const sPeriod = s.period > 5 ? s.period - 5 : s.period;
        return !(
          s.dayOfWeek === editingSlot.day &&
          sPeriod === targetPeriod &&
          sSession === editingSlot.session &&
          s.className === editingSlot.className
        );
      });

      if (editSubject.trim()) {
        filtered.push({
          dayOfWeek: editingSlot.day,
          session: editingSlot.session,
          period: targetPeriod,
          className: editingSlot.className,
          subject: editSubject.trim(),
          teacherShortName: editTeacher.trim() || 'GV',
        });
      }

      const updated = { ...prev, slots: filtered };
      if (setTimetableVersions && activeTimetableId) {
        setTimetableVersions((vList) =>
          vList.map((v) => (v.id === activeTimetableId ? { ...v, slots: filtered } : v))
        );
      }
      return updated;
    });

    const sessionLabel = editingSlot.session === 'afternoon' ? 'Chiều' : 'Sáng';
    showToast(`Đã lưu tiết ${editingSlot.period} (${sessionLabel}) lớp ${editingSlot.className}`);
    setEditingSlot(null);
  };

  const handleDeleteSlot = () => {
    if (!editingSlot) return;

    setTimetable((prev) => {
      const targetPeriod = editingSlot.period > 5 ? editingSlot.period - 5 : editingSlot.period;
      const filtered = prev.slots.filter((s) => {
        const sSession = s.session || (s.period > 5 ? 'afternoon' : 'morning');
        const sPeriod = s.period > 5 ? s.period - 5 : s.period;
        return !(
          s.dayOfWeek === editingSlot.day &&
          sPeriod === targetPeriod &&
          sSession === editingSlot.session &&
          s.className === editingSlot.className
        );
      });
      if (setTimetableVersions && activeTimetableId) {
        setTimetableVersions((vList) =>
          vList.map((v) => (v.id === activeTimetableId ? { ...v, slots: filtered } : v))
        );
      }
      return { ...prev, slots: filtered };
    });

    const sessionLabel = editingSlot.session === 'afternoon' ? 'Chiều' : 'Sáng';
    showToast(`Đã xóa tiết ${editingSlot.period} (${sessionLabel}) lớp ${editingSlot.className}`);
    setEditingSlot(null);
  };

  // Delete all TKB slots
  const handleClearAllTKB = () => {
    if (timetable.slots.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa tiết học Thời khóa biểu',
      message: `CẢNH BÁO: Thầy/Cô có chắc chắn muốn XÓA TOÀN BỘ ${timetable.slots.length} tiết học của đợt "${timetable.title}" không?\n\nSau khi xóa, bảng Thời khóa biểu sẽ trở về trạng thái trống (0 tiết). Thầy/Cô có thể nhập trực tiếp, tải tệp Excel mới hoặc khôi phục TKB mẫu bất kỳ lúc nào.`,
      confirmText: 'Xóa sạch tiết học',
      cancelText: 'Giữ lại',
      type: 'danger',
      onConfirm: () => {
        setTimetable((prev) => {
          if (setTimetableVersions && activeTimetableId) {
            setTimetableVersions((vList) =>
              vList.map((v) => (v.id === activeTimetableId ? { ...v, slots: [] } : v))
            );
          }
          return {
            ...prev,
            slots: [],
          };
        });
        showToast('Đã xóa toàn bộ tiết học của đợt này!', 'info');
      },
    });
  };

  // Current active version object
  const currentVersionObj = useMemo(() => {
    return timetableVersions.find((v) => v.id === activeTimetableId) || timetableVersions[0];
  }, [timetableVersions, activeTimetableId]);

  // Handle switching active timetable version
  const handleSelectVersion = (version: TimetableVersion) => {
    if (setActiveTimetableId) {
      setActiveTimetableId(version.id);
    }
    setTimetable({
      title: version.title,
      effectiveDate: version.effectiveDate,
      effectiveFromWeek: version.effectiveFromWeek,
      effectiveToWeek: version.effectiveToWeek,
      slots: version.slots,
    });
    showToast(`Đang xem: ${version.title} (Áp dụng từ Tuần ${version.effectiveFromWeek}${version.effectiveToWeek ? ` đến Tuần ${version.effectiveToWeek}` : ' trở đi'})`, 'info');
  };

  // Handle save from TimetableVersionModal (create or edit)
  const handleSaveVersion = (data: {
    title: string;
    effectiveFromWeek: number;
    effectiveToWeek?: number;
    effectiveDate: string;
    copyFromCurrent: boolean;
    note?: string;
  }) => {
    if (versionModalMode === 'create') {
      const newId = `tkb-v${Date.now()}`;
      const newSlots = data.copyFromCurrent ? [...timetable.slots] : [];

      const newVer: TimetableVersion = {
        id: newId,
        title: data.title,
        effectiveFromWeek: data.effectiveFromWeek,
        effectiveToWeek: data.effectiveToWeek,
        effectiveDate: data.effectiveDate,
        slots: newSlots,
        createdAt: new Date().toISOString(),
        note: data.note,
      };

      if (setTimetableVersions) {
        setTimetableVersions((prev) => {
          // Automatically cap earlier versions whose effectiveToWeek was unset or overlaps
          const updated = prev.map((v) => {
            if (v.effectiveFromWeek < data.effectiveFromWeek && (!v.effectiveToWeek || v.effectiveToWeek >= data.effectiveFromWeek)) {
              return { ...v, effectiveToWeek: data.effectiveFromWeek - 1 };
            }
            return v;
          });
          return [...updated, newVer];
        });
      }

      if (setActiveTimetableId) {
        setActiveTimetableId(newId);
      }

      setTimetable({
        title: newVer.title,
        effectiveDate: newVer.effectiveDate,
        effectiveFromWeek: newVer.effectiveFromWeek,
        effectiveToWeek: newVer.effectiveToWeek,
        slots: newVer.slots,
      });

      showToast(`Đã tạo TKB mới áp dụng từ Tuần ${data.effectiveFromWeek}! TKB cũ đã được lưu giữ an toàn cho các tuần trước.`);
    } else {
      // Edit mode
      if (setTimetableVersions) {
        setTimetableVersions((prev) =>
          prev.map((v) =>
            v.id === activeTimetableId
              ? {
                  ...v,
                  title: data.title,
                  effectiveFromWeek: data.effectiveFromWeek,
                  effectiveToWeek: data.effectiveToWeek,
                  effectiveDate: data.effectiveDate,
                  note: data.note,
                }
              : v
          )
        );
      }

      setTimetable((prev) => ({
        ...prev,
        title: data.title,
        effectiveDate: data.effectiveDate,
        effectiveFromWeek: data.effectiveFromWeek,
        effectiveToWeek: data.effectiveToWeek,
      }));

      showToast(`Đã cập nhật thông tin đợt: ${data.title}`);
    }
  };

  // Handle delete a specific version
  const handleDeleteVersion = (versionId: string) => {
    const versionToDelete = timetableVersions.find((v) => v.id === versionId);
    if (!versionToDelete) return;

    if (timetableVersions.length <= 1) {
      setConfirmDialog({
        isOpen: true,
        title: 'Đợt Thời khóa biểu duy nhất',
        message: `Đây là đợt Thời khóa biểu duy nhất hiện có trên hệ thống (${versionToDelete.title} - ${versionToDelete.slots.length} tiết).\n\nHệ thống cần duy trì ít nhất 1 đợt Thời khóa biểu. Thầy/Cô có muốn XÓA SẠCH toàn bộ tiết học của đợt này để đưa bảng về trạng thái trống (0 tiết) phục vụ nhập tệp TKB mới không?`,
        confirmText: 'Xóa sạch tiết học',
        cancelText: 'Hủy bỏ',
        type: 'warning',
        onConfirm: () => {
          setTimetable((prev) => ({ ...prev, slots: [] }));
          if (setTimetableVersions) {
            setTimetableVersions((list) =>
              list.map((v) => (v.id === versionId ? { ...v, slots: [] } : v))
            );
          }
          showToast('Đã xóa toàn bộ tiết học. Bảng TKB hiện đang trống, sẵn sàng tải tệp mới!', 'info');
        },
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa đợt Thời khóa biểu',
      message: `Thầy/Cô có chắc chắn muốn xóa đợt "${versionToDelete.title}" khỏi hệ thống?\n\n• Số tiết học: ${versionToDelete.slots.length} tiết\n• Phạm vi áp dụng: Tuần ${versionToDelete.effectiveFromWeek}${versionToDelete.effectiveToWeek ? ` đến Tuần ${versionToDelete.effectiveToWeek}` : ' trở đi'}\n\nSau khi xóa, hệ thống sẽ tự động cập nhật lại thời gian áp dụng của các đợt TKB còn lại.`,
      confirmText: 'Xóa đợt này',
      cancelText: 'Không xóa',
      type: 'danger',
      onConfirm: () => {
        const remaining = timetableVersions.filter((v) => v.id !== versionId);
        // If the deleted version was the earliest, adjust remaining earliest to start from week 1
        const adjustedRemaining = remaining.map((v, idx) => {
          if (idx === 0 && v.effectiveFromWeek > 1) {
            return { ...v, effectiveFromWeek: 1 };
          }
          return v;
        });

        if (setTimetableVersions) {
          setTimetableVersions(adjustedRemaining);
        }

        if (activeTimetableId === versionId) {
          const nextVer = adjustedRemaining[adjustedRemaining.length - 1];
          if (setActiveTimetableId) {
            setActiveTimetableId(nextVer.id);
          }
          setTimetable({
            title: nextVer.title,
            effectiveDate: nextVer.effectiveDate,
            effectiveFromWeek: nextVer.effectiveFromWeek,
            effectiveToWeek: nextVer.effectiveToWeek,
            slots: nextVer.slots,
          });
        }

        showToast(`Đã xóa đợt TKB "${versionToDelete.title}" thành công!`, 'info');
      },
    });
  };

  // Delete all old versions and keep only the current/latest version for all 35 weeks
  const handleDeleteAllOldVersions = () => {
    if (timetableVersions.length <= 1) return;
    const current = currentVersionObj || timetableVersions[timetableVersions.length - 1];

    setConfirmDialog({
      isOpen: true,
      title: 'Xóa tất cả các đợt TKB cũ',
      message: `Thầy/Cô có chắc chắn muốn XÓA TẤT CẢ các đợt TKB cũ và CHỈ GIỮ LẠI đợt "${current.title}" (${current.slots.length} tiết) không?\n\nSau khi xóa, đợt "${current.title}" sẽ được áp dụng cho toàn bộ năm học (từ Tuần 1 đến Tuần 35). Toàn bộ các đợt TKB cũ sẽ được dọn sạch hoàn toàn khỏi bộ nhớ.`,
      confirmText: 'Chỉ giữ đợt này (Xóa hết TKB cũ)',
      cancelText: 'Hủy bỏ',
      type: 'warning',
      onConfirm: () => {
        const singleVer: TimetableVersion = {
          ...current,
          effectiveFromWeek: 1,
          effectiveToWeek: undefined,
        };
        const singleList = [singleVer];
        if (setTimetableVersions) {
          setTimetableVersions(singleList);
        }
        if (setActiveTimetableId) {
          setActiveTimetableId(singleVer.id);
        }
        setTimetable({
          title: singleVer.title,
          effectiveDate: singleVer.effectiveDate,
          effectiveFromWeek: 1,
          effectiveToWeek: undefined,
          slots: singleVer.slots,
        });
        showToast(`Đã xóa sạch các đợt TKB cũ! Đợt "${singleVer.title}" hiện áp dụng cho toàn bộ năm học.`, 'info');
      },
    });
  };

  // Reset to default TKB
  const handleResetDefaultTKB = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Khôi phục Thời khóa biểu mẫu',
      message: 'Khôi phục lại Thời khóa biểu mẫu chuẩn (Lần 8 - Tuần 16) của trường THCS Đồng Phú? Dữ liệu các tiết học hiện tại của đợt này sẽ được đặt lại theo TKB mẫu.',
      confirmText: 'Khôi phục TKB mẫu',
      cancelText: 'Hủy bỏ',
      type: 'info',
      onConfirm: () => {
        setTimetable({
          title: INITIAL_TIMETABLE.title,
          effectiveDate: INITIAL_TIMETABLE.effectiveDate,
          slots: INITIAL_TIMETABLE.slots,
        });
        showToast('Đã khôi phục Thời khóa biểu mẫu chuẩn thành công!');
      },
    });
  };

  // Download official TKB Excel template
  const handleDownloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Thứ', 'Tiết', ...CLASSES_LIST];
    const data: any[][] = [
      ['TRƯỜNG THCS ĐỒNG PHÚ - THỜI KHÓA BIỂU ÁP DỤNG HỌC KÌ I'],
      [`Áp dụng: ${timetable.title} (Từ ngày ${timetable.effectiveDate})`],
      [''],
      headers,
    ];

    days.forEach((d) => {
      periods.forEach((p, pIdx) => {
        const row = [pIdx === 0 ? d.name : '', p];
        CLASSES_LIST.forEach((cls) => {
          const slot = getSlot(d.dayNumber, p, cls);
          row.push(slot ? `${slot.subject} ${slot.teacherShortName}` : '');
        });
        data.push(row);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'TKB_Dong_Phu');
    XLSX.writeFile(wb, `TKB_${timetable.title.replace(/\s+/g, '_')}_THCS_Dong_Phu.xlsx`);
  };

  // Export Timetable to PDF / Print Dialog
  const handleExportPdf = () => {
    if (viewMode === 'teacher' && selectedTeacherShortName) {
      const teacherObj = teachers.find(
        (t) => t.shortName.toLowerCase() === selectedTeacherShortName.toLowerCase()
      );
      exportTimetableToPdf(timetable, {
        filterTeacher: selectedTeacherShortName,
        filterTeacherName: teacherObj ? teacherObj.name : selectedTeacherShortName,
        schoolName: SCHOOL_INFO.name,
        campus: SCHOOL_INFO.campus,
        schoolYear: SCHOOL_INFO.schoolYear,
        effectiveDate: timetable.effectiveDate,
        effectiveFromWeek: timetable.effectiveFromWeek || selectedWeek,
        classes: CLASSES_LIST,
      });
    } else {
      exportTimetableToPdf(timetable, {
        schoolName: SCHOOL_INFO.name,
        campus: SCHOOL_INFO.campus,
        schoolYear: SCHOOL_INFO.schoolYear,
        effectiveDate: timetable.effectiveDate,
        effectiveFromWeek: timetable.effectiveFromWeek || selectedWeek,
        classes: CLASSES_LIST,
      });
    }
  };

  // Filter slots for active teacher view
  const currentTeacherObj = teachers.find((t) => t.shortName.toLowerCase() === selectedTeacherShortName.toLowerCase()) || teachers[0];
  const teacherSlots = timetable.slots.filter(
    (s) => s.teacherShortName.toLowerCase() === selectedTeacherShortName.toLowerCase()
  );

  // If mobile mode is active and user is in mobile schedule format, render TimetableMobileView
  if (deviceMode === 'mobile' && mobileTKBFormat === 'schedule') {
    return (
      <div className="space-y-4">
        {/* Mobile View Toggle Bar */}
        <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-blue-900">
            <Calendar className="w-4 h-4 text-blue-700" />
            <span>Chế độ Điện thoại: Lịch dạy theo ngày</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileTKBFormat('matrix')}
            className="flex items-center gap-1 font-bold text-blue-700 hover:text-blue-950 bg-white px-2.5 py-1 rounded-lg border border-blue-300 shadow-2xs"
          >
            <span>Xem bảng ma trận {CLASSES_LIST.length} lớp →</span>
          </button>
        </div>

        <TimetableMobileView
          timetable={timetable}
          teachers={teachers}
          classes={CLASSES_LIST}
          timetableVersions={timetableVersions}
          activeTimetableId={activeTimetableId}
          onSelectVersion={handleSelectVersion}
          onOpenCreateVersionModal={() => {
            setVersionModalMode('create');
            setIsVersionModalOpen(true);
          }}
          onEditSlot={(slot) => {
            const currentSlot = getSlot(slot.day, slot.period, slot.className);
            setEditingSlot(slot);
            setEditSubject(currentSlot ? currentSlot.subject : '');
            setEditTeacher(currentSlot ? currentSlot.teacherShortName : '');
          }}
          onOpenUploadModal={onOpenUploadModal}
          onSwitchToFullMatrix={() => setMobileTKBFormat('matrix')}
          onSaveTimetable={handleSaveTimetableClick}
          onGoHome={onGoHome}
          onDeleteVersion={handleDeleteVersion}
          onEditVersion={() => {
            setVersionModalMode('edit');
            setIsVersionModalOpen(true);
          }}
          onDeleteAllOldVersions={handleDeleteAllOldVersions}
          onClearAllTKB={handleClearAllTKB}
        />

        {/* Timetable Version Modal */}
        <TimetableVersionModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          mode={versionModalMode}
          currentVersion={timetableVersions.find((v) => v.id === activeTimetableId)}
          existingVersions={timetableVersions}
          onSave={handleSaveVersion}
          onDeleteVersion={handleDeleteVersion}
          onGoHome={onGoHome}
          onOpenUploadModal={onOpenUploadModal}
        />

        {confirmDialog && (
          <ConfirmModal
            isOpen={confirmDialog.isOpen}
            onClose={() => setConfirmDialog(null)}
            onConfirm={confirmDialog.onConfirm}
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmText={confirmDialog.confirmText}
            cancelText={confirmDialog.cancelText}
            type={confirmDialog.type}
          />
        )}

        {/* Edit Slot Modal */}
        {editingSlot && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-3">
                Chỉnh sửa Tiết {editingSlot.period} - Thứ {editingSlot.day} (Lớp {editingSlot.className})
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Môn học</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    placeholder="VD: Toán, Ngữ Văn, Tiếng Anh..."
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giáo viên phụ trách</label>
                  <select
                    value={editTeacher}
                    onChange={(e) => setEditTeacher(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="">-- Để trống (Tiết nghỉ) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.shortName}>
                        {t.name} ({t.shortName}) - {t.subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 rounded-lg shadow-sm"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* If in mobile mode with matrix format, show button to switch back to schedule */}
      {deviceMode === 'mobile' && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <span>📱 Đang xem bảng ma trận 18 lớp kéo ngang.</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileTKBFormat('schedule')}
            className="flex items-center gap-1 font-bold text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs hover:bg-amber-100"
          >
            <span>Về xem theo ngày</span>
          </button>
        </div>
      )}

      {/* Toast notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Timetable Versions & Historical Preservation Banner */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl p-4 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Quản lý các đợt Thời khóa biểu • Lưu giữ TKB cũ cho các tuần trước
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {timetableVersions.map((ver) => {
              const isSelected = ver.id === activeTimetableId;
              const isEffectiveForWeek =
                selectedWeek >= ver.effectiveFromWeek &&
                (!ver.effectiveToWeek || selectedWeek <= ver.effectiveToWeek);

              return (
                <div key={ver.id} className="inline-flex items-center">
                  <button
                    onClick={() => handleSelectVersion(ver)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all border ${
                      timetableVersions.length > 1 ? 'rounded-l-lg' : 'rounded-lg'
                    } ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm font-bold'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                    title={`${ver.title} (Áp dụng từ Tuần ${ver.effectiveFromWeek}${ver.effectiveToWeek ? ` đến Tuần ${ver.effectiveToWeek}` : ' trở đi'})`}
                  >
                    <span>{ver.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/20 text-blue-100'
                    }`}>
                      {ver.effectiveToWeek ? `Tuần ${ver.effectiveFromWeek} - ${ver.effectiveToWeek}` : `Từ Tuần ${ver.effectiveFromWeek}+`}
                    </span>
                    {isEffectiveForWeek && (
                      <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold">
                        Đang áp dụng T{selectedWeek}
                      </span>
                    )}
                  </button>

                  {timetableVersions.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVersion(ver.id);
                      }}
                      className={`p-1.5 rounded-r-lg border-y border-r transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 hover:bg-rose-600 text-slate-950 hover:text-white border-amber-300'
                          : 'bg-white/10 hover:bg-rose-600 text-white/70 hover:text-white border-white/20'
                      }`}
                      title={`Xóa đợt "${ver.title}" (${ver.slots.length} tiết)`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Create New Timetable Version button */}
          <button
            onClick={() => {
              setVersionModalMode('create');
              setIsVersionModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Tạo thời khóa biểu mới áp dụng cho các tuần tới, giữ nguyên thời khóa biểu cũ cho các tuần trước"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Đợt TKB mới</span>
          </button>

          {/* Delete All Old Versions if multiple exist */}
          {timetableVersions.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteAllOldVersions}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-500/25 hover:bg-rose-500/40 text-rose-100 hover:text-white rounded-lg text-xs font-semibold border border-rose-400/40 transition-all cursor-pointer shadow-xs"
              title="Xóa tất cả các đợt TKB cũ và chỉ giữ lại đợt đang xem áp dụng cho toàn bộ năm học"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-300" />
              <span>Xóa các đợt cũ</span>
            </button>
          )}

          {/* Edit current version info */}
          <button
            onClick={() => {
              setVersionModalMode('edit');
              setIsVersionModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-colors cursor-pointer"
            title="Chỉnh sửa tên và phạm vi tuần của đợt TKB này"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-200" />
            <span>Sửa đợt</span>
          </button>

          {/* Delete active version */}
          <button
            onClick={() => handleDeleteVersion(activeTimetableId)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 hover:text-white rounded-lg text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
            title={timetableVersions.length > 1 ? "Xóa đợt TKB đang chọn" : "Xóa sạch tiết học của đợt này"}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{timetableVersions.length > 1 ? 'Xóa đợt' : 'Xóa tiết'}</span>
          </button>
        </div>
      </div>

      {/* Top Action & Info Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Modul 2
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                TẢI & QUẢN LÝ THỜI KHÓA BIỂU
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Áp dụng: <strong>{timetable.title}</strong> • Thực hiện từ ngày {timetable.effectiveDate} • {SCHOOL_INFO.name} ({timetable.slots.length} tiết)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Upload TKB Button */}
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>Tải lên TKB (Excel, Word, PDF)</span>
            </button>

            {/* Template Download */}
            <button
              onClick={handleDownloadExcelTemplate}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold border border-slate-200 transition-colors"
              title="Tải tệp Excel mẫu của trường"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Tải mẫu Excel</span>
            </button>

            {/* Save TKB Button */}
            <button
              onClick={handleSaveTimetableClick}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold shadow-xs transition-all active:scale-95 ${
                savedTKBRecently
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
              title="Lưu Thời khóa biểu này vào bộ nhớ hệ thống"
            >
              {savedTKBRecently ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Đã lưu TKB ✓</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-200" />
                  <span>Lưu TKB</span>
                </>
              )}
            </button>

            {/* Export TKB PDF */}
            <button
              id="btn-export-tkb-pdf"
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-sm font-bold shadow-2xs transition-colors cursor-pointer"
              title="Xuất Thời khóa biểu ra file PDF hoặc In ấn chuẩn A4"
            >
              <Printer className="w-4 h-4 text-rose-600" />
              <span>Xuất PDF / In</span>
            </button>

            {/* Clear / Delete TKB Button */}
            {timetable.slots.length > 0 ? (
              <button
                onClick={handleClearAllTKB}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-sm font-semibold border border-rose-200 transition-colors cursor-pointer"
                title="Xóa toàn bộ các tiết trong Thời khóa biểu"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa hết tiết</span>
              </button>
            ) : (
              <button
                onClick={handleResetDefaultTKB}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-sm font-semibold border border-emerald-200 transition-colors cursor-pointer"
                title="Khôi phục thời khóa biểu mẫu chuẩn"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nạp TKB mẫu chuẩn</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher and Filters */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold gap-1">
              <button
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'matrix'
                    ? 'bg-white text-blue-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Ma trận Toàn trường ({CLASSES_LIST.join(' - ')})</span>
              </button>
              <button
                onClick={() => setViewMode('teacher')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'teacher'
                    ? 'bg-white text-blue-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Lịch TKB theo GV ({selectedTeacherShortName})</span>
              </button>
              <button
                onClick={() => setViewMode('weekly-schedule')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'weekly-schedule'
                    ? 'bg-amber-400 text-blue-950 shadow-2xs font-black'
                    : 'text-slate-700 hover:text-slate-950 bg-amber-50 hover:bg-amber-100 border border-amber-300/60'
                }`}
                title="Lập bảng lịch dạy trong tuần gồm 5 cột chuẩn: Buổi, Thứ, Tiết, Lớp, Môn học"
              >
                <ClipboardList className="w-3.5 h-3.5 text-blue-950" />
                <span>📋 Lập bảng lịch dạy 5 cột ({selectedTeacherShortName})</span>
              </button>
            </div>

            {/* Session Filter Tabs (Morning 7h00 vs Afternoon 14h00) */}
            <div className="flex p-1 bg-blue-50/70 border border-blue-200 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setSessionFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  sessionFilter === 'all'
                    ? 'bg-blue-700 text-white shadow-2xs font-bold'
                    : 'text-blue-900 hover:bg-blue-100/60'
                }`}
                title="Hiển thị cả 2 bảng Sáng và Chiều"
              >
                Tất cả (Sáng & Chiều)
              </button>
              <button
                onClick={() => setSessionFilter('morning')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  sessionFilter === 'morning'
                    ? 'bg-blue-700 text-white shadow-2xs font-bold'
                    : 'text-blue-900 hover:bg-blue-100/60'
                }`}
                title="Chỉ hiển thị Bảng 1: Buổi Sáng (7h00)"
              >
                Bảng 1: Sáng (7h00)
              </button>
              <button
                onClick={() => setSessionFilter('afternoon')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  sessionFilter === 'afternoon'
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'text-amber-900 hover:bg-amber-100/60'
                }`}
                title="Chỉ hiển thị Bảng 2: Buổi Chiều (14h00)"
              >
                Bảng 2: Chiều (14h00)
              </button>
            </div>
          </div>

          {/* Teacher Selector Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Chọn Giáo viên:
            </label>
            <select
              value={selectedTeacherShortName}
              onChange={(e) => setSelectedTeacherShortName(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              {teachers.map((t) => {
                const teacherHasConflict = conflicts.some(
                  (c) => c.teacherShortName.toLowerCase() === t.shortName.toLowerCase()
                );
                return (
                  <option key={t.id} value={t.shortName}>
                    {t.name} ({t.shortName}) - {t.subject} {teacherHasConflict ? '⚠️ (Trùng tiết)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* CONFLICT DETECTION WARNING BANNER (Visual Alert) */}
      {conflicts.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-4 shadow-sm animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-200 text-rose-800 rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                  CẢNH BÁO XUNG ĐỘT THỜI KHÓA BIỂU: PHÁT HIỆN {conflicts.length} LỖI TRÙNG TIẾT DẠY!
                </h4>
                <p className="text-xs text-rose-700 mt-1">
                  Có giáo viên đang được xếp lịch dạy đồng thời ở 2 hoặc nhiều lớp khác nhau trong cùng một tiết học. Vui lòng kiểm tra và chỉnh sửa lại các tiết bị đánh dấu màu đỏ dưới đây.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowConflictDetails(!showConflictDetails)}
              className="text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-lg shrink-0 border border-rose-300 transition-colors"
            >
              {showConflictDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'} ({conflicts.length})
            </button>
          </div>

          {/* Detailed conflict list */}
          {showConflictDetails && (
            <div className="mt-3 pt-3 border-t border-rose-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {conflicts.map((conflict, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white border border-rose-300 rounded-lg flex items-center justify-between shadow-2xs hover:bg-rose-50/50 transition-colors"
                >
                  <div className="text-xs">
                    <div className="font-bold text-rose-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      {conflict.dayName} • Tiết {conflict.period}
                    </div>
                    <div className="text-rose-800 mt-0.5">
                      GV: <strong>{conflict.teacherShortName}</strong> dạy trùng các lớp:{' '}
                      <strong className="text-rose-900 font-mono font-bold">{conflict.classes.join(', ')}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTeacherShortName(conflict.teacherShortName);
                      showToast(`Đã chuyển sang xem lịch của GV ${conflict.teacherShortName}`);
                    }}
                    className="p-1.5 text-rose-700 hover:text-rose-900 hover:bg-rose-100 rounded-md text-[11px] font-bold shrink-0 ml-2"
                    title="Xem GV này"
                  >
                    Xem GV
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State Banner if No Slots */}
      {timetable.slots.length === 0 && (
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">Thời khóa biểu hiện đang trống</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Bạn đã xóa tệp TKB. Hãy tải lên tệp Thời khóa biểu mới (Word, Excel, PDF) hoặc khôi phục TKB mẫu chuẩn của trường.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenUploadModal}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Tải lên TKB mới
            </button>
            <button
              onClick={handleResetDefaultTKB}
              className="px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors"
            >
              Khôi phục TKB mẫu
            </button>
          </div>
        </div>
      )}

      {/* View Mode 1: Full Matrix View with Visual Conflict Highlighting & Session Separation */}
      {viewMode === 'matrix' && (
        <div className="space-y-6">
          {/* Render Matrix Table Helper */}
          {(() => {
            const renderTable = (
              session: 'morning' | 'afternoon',
              title: string,
              badgeText: string,
              desc: string,
              count: number,
              theme: 'blue' | 'amber'
            ) => {
              const isMorning = session === 'morning';
              return (
                <div
                  key={session}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Session Header */}
                  <div
                    className={`p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isMorning
                        ? 'bg-linear-to-r from-blue-900 to-indigo-900'
                        : 'bg-linear-to-r from-amber-800 to-orange-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 font-black text-xs rounded-full uppercase tracking-wide ${
                            isMorning
                              ? 'bg-amber-400 text-amber-950'
                              : 'bg-yellow-300 text-amber-950'
                          }`}
                        >
                          {badgeText}
                        </span>
                        <h3 className="text-base font-bold">{title}</h3>
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          isMorning ? 'text-blue-100' : 'text-amber-100'
                        }`}
                      >
                        {desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                          isMorning
                            ? 'bg-blue-800/60 border-blue-700 text-blue-100'
                            : 'bg-amber-950/40 border-amber-700 text-amber-100'
                        }`}
                      >
                        Số tiết {isMorning ? 'sáng' : 'chiều'}:{' '}
                        <strong className="text-white font-bold">{count}</strong> tiết
                      </div>
                    </div>
                  </div>

                  {/* Afternoon Special Notice Banner */}
                  {!isMorning && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-bold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-amber-700" />
                        Ghi chú lịch chiều:
                      </span>
                      <span>
                        • <strong>Chiều Thứ 2:</strong> Bồi dưỡng HSG (Địa 9, Sinh 8, Anh 6, Anh 7, Toán 7)
                      </span>
                      <span>
                        • <strong>Chiều Thứ 6:</strong> Họp Hội đồng / Họp Chi bộ / Sinh hoạt chuyên môn
                      </span>
                    </div>
                  )}

                  {/* Legend Bar */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400 inline-block"></span>
                        <span>Tiết của GV đang chọn ({selectedTeacherShortName})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                        <span className="w-3 h-3 rounded bg-rose-100 border border-rose-500 inline-block"></span>
                        <span>⚠️ Tiết bị trùng trong cùng buổi</span>
                      </div>
                    </div>
                    <span className="text-slate-400 italic">Nhấp vào ô để chỉnh sửa môn và giáo viên</span>
                  </div>

                  {/* Matrix Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                          <th className="p-2.5 text-center border-r border-slate-200 w-16">Thứ</th>
                          <th className="p-2.5 text-center border-r border-slate-200 w-12">Tiết</th>
                          {CLASSES_LIST.map((cls) => (
                            <th
                              key={cls}
                              className={`p-2.5 text-center border-r border-slate-200 min-w-[90px] ${
                                isMorning ? 'bg-blue-50/40' : 'bg-amber-50/40'
                              }`}
                            >
                              {cls}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {days.map((d) => (
                          <React.Fragment key={d.dayNumber}>
                            {periods.map((p, pIdx) => (
                              <tr
                                key={`${session}-${d.dayNumber}-${p}`}
                                className={`${
                                  pIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                                } hover:bg-blue-50/30 transition-colors`}
                              >
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={periods.length}
                                    className="p-2 text-center font-bold text-slate-800 bg-slate-100/70 border-r border-b border-slate-300 align-middle text-sm"
                                  >
                                    {d.name.split(' ')[0]}
                                    <div className="text-[11px] font-normal text-slate-500">
                                      {d.name.split(' ')[1]}
                                    </div>
                                  </td>
                                )}
                                <td className="p-2 text-center font-bold text-slate-700 border-r border-slate-200">
                                  {p}
                                </td>

                                {CLASSES_LIST.map((cls) => {
                                  const slot = getSlot(d.dayNumber, p, cls, session);
                                  const isHighlighted =
                                    slot &&
                                    slot.teacherShortName.toLowerCase() ===
                                      selectedTeacherShortName.toLowerCase();
                                  const conflictInfo = getConflictForSlot(d.dayNumber, p, cls, session);
                                  const hasConflict = Boolean(conflictInfo);

                                  const isEditing =
                                    editingSlot &&
                                    editingSlot.day === d.dayNumber &&
                                    editingSlot.period === p &&
                                    editingSlot.className === cls &&
                                    editingSlot.session === session;

                                  if (isEditing) {
                                    return (
                                      <td
                                        key={cls}
                                        className="p-1.5 border-r border-slate-200 bg-amber-50"
                                      >
                                        <div className="space-y-1">
                                          <input
                                            type="text"
                                            placeholder="Môn (VD: Toán)"
                                            value={editSubject}
                                            onChange={(e) => setEditSubject(e.target.value)}
                                            className="w-full text-xs font-semibold px-1 py-0.5 border border-slate-300 rounded bg-white"
                                            autoFocus
                                          />
                                          <input
                                            type="text"
                                            placeholder="Tên GV (VD: Lan)"
                                            value={editTeacher}
                                            onChange={(e) => setEditTeacher(e.target.value)}
                                            className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded bg-white"
                                          />
                                          <div className="flex gap-1">
                                            <button
                                              onClick={handleSaveEdit}
                                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded px-1 py-0.5 text-[10px] font-bold"
                                            >
                                              Lưu
                                            </button>
                                            <button
                                              onClick={handleDeleteSlot}
                                              className="bg-rose-600 hover:bg-rose-700 text-white rounded px-1.5 py-0.5 text-[10px] font-bold"
                                              title="Xóa tiết này"
                                            >
                                              Xóa
                                            </button>
                                            <button
                                              onClick={() => setEditingSlot(null)}
                                              className="bg-slate-300 hover:bg-slate-400 text-slate-700 rounded px-1 py-0.5 text-[10px]"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td
                                      key={cls}
                                      onClick={() => handleStartEdit(d.dayNumber, p, cls, session)}
                                      className={`p-2 border-r border-slate-200 cursor-pointer transition-all ${
                                        hasConflict
                                          ? 'bg-rose-100 border-rose-300 text-rose-950 ring-2 ring-rose-500 font-bold'
                                          : isHighlighted
                                          ? 'bg-amber-100/80 font-bold border-amber-300 text-blue-900 ring-1 ring-amber-400 inset-shadow-xs'
                                          : 'hover:bg-slate-100'
                                      }`}
                                      title={
                                        hasConflict
                                          ? `⚠️ XUNG ĐỘT: GV ${conflictInfo?.teacherShortName} bị trùng lịch với lớp ${conflictInfo?.classes.filter((c) => c !== cls).join(', ')}!`
                                          : 'Nhấp để sửa hoặc xóa tiết này'
                                      }
                                    >
                                      {slot ? (
                                        <div className="flex flex-col items-center justify-center">
                                          {hasConflict && (
                                            <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-rose-800 bg-rose-200 px-1 py-0.2 rounded mb-0.5">
                                              <AlertTriangle className="w-2.5 h-2.5 text-rose-700" />
                                              Trùng tiết
                                            </span>
                                          )}
                                          <span
                                            className={`text-[11px] leading-tight text-center ${
                                              hasConflict
                                                ? 'font-black text-rose-950'
                                                : 'font-semibold text-slate-800'
                                            }`}
                                          >
                                            {slot.subject}
                                          </span>
                                          <span
                                            className={`text-[10px] ${
                                              hasConflict
                                                ? 'text-rose-900 font-extrabold underline'
                                                : isHighlighted
                                                ? 'text-amber-800 font-bold'
                                                : 'text-slate-500 italic'
                                            }`}
                                          >
                                            {slot.teacherShortName}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 text-center block">-</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            };

            return (
              <>
                {(sessionFilter === 'all' || sessionFilter === 'morning') &&
                  renderTable(
                    'morning',
                    'BẢNG 1: THỜI KHÓA BIỂU BUỔI SÁNG (Bắt đầu học lúc 7h00)',
                    'Bảng 1: Sáng',
                    'Khung giờ buổi sáng (7h00 - 11h15) • Tiết 1 đến Tiết 5 • 8 lớp học',
                    morningSlotsCount,
                    'blue'
                  )}

                {(sessionFilter === 'all' || sessionFilter === 'afternoon') &&
                  renderTable(
                    'afternoon',
                    'BẢNG 2: THỜI KHÓA BIỂU BUỔI CHIỀU (Bắt đầu học lúc 14h00)',
                    'Bảng 2: Chiều',
                    'Khung giờ buổi chiều (14h00 - 17h00) • Độc lập hoàn toàn với Buổi Sáng',
                    afternoonSlotsCount,
                    'amber'
                  )}
              </>
            );
          })()}
        </div>
      )}

      {/* View Mode 2: Individual Teacher Timetable with Distinct Sessions */}
      {viewMode === 'teacher' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-700" />
                Thời khóa biểu giảng dạy của:{' '}
                <span className="text-blue-700">
                  {currentTeacherObj?.name || selectedTeacherShortName || 'Giáo viên'}
                </span>{' '}
                ({selectedTeacherShortName})
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Tổ: <strong>{currentTeacherObj?.department || 'Tổ bộ môn'}</strong> • Môn phụ trách:{' '}
                <strong>{currentTeacherObj?.subject || 'Bộ môn'}</strong> • Tổng số tiết/tuần:{' '}
                <strong className="text-blue-800">{teacherSlots.length} tiết</strong> (Sáng:{' '}
                <strong>
                  {
                    teacherSlots.filter(
                      (s) =>
                        (s.session || (s.period > 5 ? 'afternoon' : 'morning')) === 'morning'
                    ).length
                  }
                </strong>
                , Chiều:{' '}
                <strong>
                  {
                    teacherSlots.filter(
                      (s) =>
                        (s.session || (s.period > 5 ? 'afternoon' : 'morning')) === 'afternoon'
                    ).length
                  }
                </strong>
                )
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('weekly-schedule')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-blue-950 text-xs font-black shadow-xs transition-all active:scale-95"
                title="Chuyển sang Bảng lịch dạy 5 cột: Buổi (Sáng/Chiều), Thứ, Tiết, Lớp, Môn học"
              >
                <ClipboardList className="w-3.5 h-3.5 text-blue-950" />
                <span>Bảng 5 cột chuẩn</span>
              </button>

              {selectedTeacherConflicts.length > 0 ? (
                <span className="text-xs font-bold px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  {selectedTeacherConflicts.length} tiết trùng giờ
                </span>
              ) : (
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full w-fit">
                  ✓ Lịch dạy hợp lệ
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {days.map((d) => {
              const dayMorningSlots = teacherSlots
                .filter(
                  (s) =>
                    s.dayOfWeek === d.dayNumber &&
                    (s.session || (s.period > 5 ? 'afternoon' : 'morning')) === 'morning'
                )
                .sort((a, b) => a.period - b.period);

              const dayAfternoonSlots = teacherSlots
                .filter(
                  (s) =>
                    s.dayOfWeek === d.dayNumber &&
                    (s.session || (s.period > 5 ? 'afternoon' : 'morning')) === 'afternoon'
                )
                .sort((a, b) => a.period - b.period);

              return (
                <div
                  key={d.dayNumber}
                  className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col"
                >
                  <div className="bg-linear-to-r from-blue-800 to-indigo-800 text-white text-center py-2 px-3">
                    <span className="font-bold text-sm">{d.name}</span>
                  </div>

                  <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                    {/* Sáng */}
                    {(sessionFilter === 'all' || sessionFilter === 'morning') && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between pb-1 border-b border-blue-100">
                          <span className="text-[11px] font-bold text-blue-900 uppercase">
                            Buổi Sáng (7h00)
                          </span>
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                            {dayMorningSlots.length} tiết
                          </span>
                        </div>

                        {periods.map((p) => {
                          const slotsForThisPeriod = dayMorningSlots.filter(
                            (s) => (s.period > 5 ? s.period - 5 : s.period) === p
                          );
                          const isConflicted = slotsForThisPeriod.length > 1;

                          if (slotsForThisPeriod.length === 0) {
                            return (
                              <div
                                key={`m-${p}`}
                                className="p-1.5 rounded border border-dashed border-slate-200 bg-slate-100/40 text-slate-400 text-[11px] flex items-center justify-between"
                              >
                                <span className="font-semibold text-slate-400">Tiết {p}</span>
                                <span className="text-[10px] italic">Trống</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`m-${p}`}
                              className={`p-1.5 rounded border text-xs space-y-1 ${
                                isConflicted
                                  ? 'bg-rose-50 border-rose-300 text-rose-950 ring-1 ring-rose-400 shadow-2xs'
                                  : 'bg-white border-blue-200 shadow-2xs text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-bold text-[11px] ${
                                    isConflicted ? 'text-rose-900' : 'text-blue-900'
                                  }`}
                                >
                                  Tiết {p}
                                </span>
                                {isConflicted && (
                                  <span className="px-1 py-0.2 bg-rose-200 text-rose-800 rounded font-black text-[9px] flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Trùng!
                                  </span>
                                )}
                              </div>

                              {slotsForThisPeriod.map((slot, sIdx) => (
                                <div
                                  key={sIdx}
                                  className={`flex items-center justify-between p-1 rounded text-[11px] ${
                                    isConflicted ? 'bg-white/80 border border-rose-200' : ''
                                  }`}
                                >
                                  <span
                                    className={`font-bold ${
                                      isConflicted ? 'text-rose-800' : 'text-blue-700'
                                    }`}
                                  >
                                    {slot.subject}
                                  </span>
                                  <span
                                    className={`ml-1 px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                                      isConflicted
                                        ? 'bg-rose-100 text-rose-900 font-bold'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    Lớp {slot.className}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Chiều */}
                    {(sessionFilter === 'all' || sessionFilter === 'afternoon') && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between pb-1 border-b border-amber-100">
                          <span className="text-[11px] font-bold text-amber-900 uppercase">
                            Buổi Chiều (14h00)
                          </span>
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                            {dayAfternoonSlots.length} tiết
                          </span>
                        </div>

                        {periods.slice(0, 3).map((p) => {
                          const slotsForThisPeriod = dayAfternoonSlots.filter(
                            (s) => (s.period > 5 ? s.period - 5 : s.period) === p
                          );
                          const isConflicted = slotsForThisPeriod.length > 1;

                          if (slotsForThisPeriod.length === 0) {
                            return (
                              <div
                                key={`a-${p}`}
                                className="p-1.5 rounded border border-dashed border-slate-200 bg-slate-100/40 text-slate-400 text-[11px] flex items-center justify-between"
                              >
                                <span className="font-semibold text-slate-400">Tiết {p}</span>
                                <span className="text-[10px] italic">Trống</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`a-${p}`}
                              className={`p-1.5 rounded border text-xs space-y-1 ${
                                isConflicted
                                  ? 'bg-rose-50 border-rose-300 text-rose-950 ring-1 ring-rose-400 shadow-2xs'
                                  : 'bg-white border-amber-200 shadow-2xs text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-bold text-[11px] ${
                                    isConflicted ? 'text-rose-900' : 'text-amber-900'
                                  }`}
                                >
                                  Tiết {p}
                                </span>
                                {isConflicted && (
                                  <span className="px-1 py-0.2 bg-rose-200 text-rose-800 rounded font-black text-[9px] flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Trùng!
                                  </span>
                                )}
                              </div>

                              {slotsForThisPeriod.map((slot, sIdx) => (
                                <div
                                  key={sIdx}
                                  className={`flex items-center justify-between p-1 rounded text-[11px] ${
                                    isConflicted ? 'bg-white/80 border border-rose-200' : ''
                                  }`}
                                >
                                  <span
                                    className={`font-bold ${
                                      isConflicted ? 'text-rose-800' : 'text-amber-800'
                                    }`}
                                  >
                                    {slot.subject}
                                  </span>
                                  <span
                                    className={`ml-1 px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                                      isConflicted
                                        ? 'bg-rose-100 text-rose-900 font-bold'
                                        : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    Lớp {slot.className}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Mode 3: 5-Column Weekly Schedule for Teacher (Buổi, Thứ, Tiết, Lớp, Môn học) */}
      {viewMode === 'weekly-schedule' && (
        <TeacherWeeklyScheduleTable
          teachers={teachers}
          timetable={timetable}
          selectedTeacherShortName={selectedTeacherShortName}
          onSelectTeacher={(sName) => setSelectedTeacherShortName(sName)}
        />
      )}

      {/* Timetable Version Management Modal */}
      <TimetableVersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        mode={versionModalMode}
        currentVersion={currentVersionObj}
        existingVersions={timetableVersions}
        onSave={handleSaveVersion}
        onDeleteVersion={handleDeleteVersion}
        onGoHome={onGoHome}
        onOpenUploadModal={onOpenUploadModal}
      />

      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          type={confirmDialog.type}
        />
      )}
    </div>
  );
};

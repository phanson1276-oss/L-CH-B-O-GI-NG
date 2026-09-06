import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TeacherListModule } from './components/TeacherListModule';
import { TimetableModule } from './components/TimetableModule';
import { PPCTModule } from './components/PPCTModule';
import { PhieuBaoGiangModule } from './components/PhieuBaoGiangModule';
import { FileUploadModal } from './components/FileUploadModal';
import { TeacherManagerModal } from './components/TeacherManagerModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { INITIAL_TIMETABLE, INITIAL_TIMETABLE_VERSIONS, INITIAL_PPCT_PLANS, TEACHERS_LIST, SCHOOL_INFO } from './data/mockData';
import { TimetableData, PPCTPlan, TimetableSlot, PPCTItem, Teacher, TimetableVersion, DeviceMode } from './types';
import { getSystemCurrentAcademicWeek, getTodaySystemInfo } from './utils/academicCalendar';
import { CheckCircle, Info, Sparkles, School, ShieldCheck, Users, Upload, Smartphone, Monitor, Save, Home } from 'lucide-react';

const STORAGE_KEYS = {
  TEACHERS: 'baogiang_teachers_v4',
  TIMETABLE: 'baogiang_timetable_v4',
  TIMETABLE_VERSIONS: 'baogiang_tkb_versions_v4',
  PPCT_PLANS: 'baogiang_ppct_plans_v4',
};

export default function App() {
  const [activeModule, setActiveModule] = useState<1 | 2 | 3 | 4>(4); // Default to Module 4 (Phiếu Báo Giảng)
  // Tuần thực hiện mặc định theo ngày tháng của hệ thống (Tính tự động theo năm học và ngày hiện hành)
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    return getSystemCurrentAcademicWeek();
  });
  const [selectedTeacherShortName, setSelectedTeacherShortName] = useState<string>('T.Sơn'); // Thầy Sơn (TTCM - Toán & KHTN)

  // Return to Home handler (Trở về module 4 - Phiếu Báo Giảng và tuần hệ thống)
  const handleGoHome = () => {
    setActiveModule(4);
    const systemInfo = getTodaySystemInfo();
    setSelectedWeek(systemInfo.currentWeek);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Device Mode: 'desktop' (Máy tính) or 'mobile' (Điện thoại)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => {
    const saved = localStorage.getItem('user_device_mode');
    if (saved === 'desktop' || saved === 'mobile') return saved;
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop';
  });

  const [isSimulatedFrame, setIsSimulatedFrame] = useState<boolean>(false);

  const handleSetDeviceMode = (mode: DeviceMode) => {
    setDeviceMode(mode);
    try {
      localStorage.setItem('user_device_mode', mode);
    } catch {}
    showToast(
      mode === 'mobile'
        ? 'Đã chuyển sang Chế độ Điện thoại: Tối ưu màn hình dọc, chia ngày dạng thẻ, phím bấm lớn.'
        : 'Đã chuyển sang Chế độ Máy tính: Bảng biểu đầy đủ, ma trận các lớp, định dạng in ấn A4.'
    );
  };

  // Teachers State with LocalStorage Persistence
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading saved teachers:', e);
    }
    return TEACHERS_LIST;
  });

  // Timetable & Versions State with LocalStorage Persistence
  const [timetableVersions, setTimetableVersions] = useState<TimetableVersion[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMETABLE_VERSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading saved timetable versions:', e);
    }
    return INITIAL_TIMETABLE_VERSIONS;
  });

  const [activeTimetableId, setActiveTimetableId] = useState<string>(INITIAL_TIMETABLE.id);

  const [timetable, setTimetable] = useState<TimetableData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.slots)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading saved timetable:', e);
    }
    return INITIAL_TIMETABLE;
  });

  const [ppctPlans, setPpctPlans] = useState<PPCTPlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PPCT_PLANS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading saved ppct plans:', e);
    }
    return INITIAL_PPCT_PLANS;
  });

  // Auto-sync state changes to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    } catch (e) {
      console.warn('Failed to auto-save teachers:', e);
    }
  }, [teachers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));
    } catch (e) {
      console.warn('Failed to auto-save timetable:', e);
    }
  }, [timetable]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMETABLE_VERSIONS, JSON.stringify(timetableVersions));
    } catch (e) {
      console.warn('Failed to auto-save timetable versions:', e);
    }
  }, [timetableVersions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PPCT_PLANS, JSON.stringify(ppctPlans));
    } catch (e) {
      console.warn('Failed to auto-save ppctPlans:', e);
    }
  }, [ppctPlans]);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'tkb' | 'ppct' | 'teacher'>('tkb');
  const [isTeacherManagerOpen, setIsTeacherManagerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenUploadForTKB = () => {
    setUploadTarget('tkb');
    setIsUploadModalOpen(true);
  };

  const handleOpenUploadForPPCT = () => {
    setUploadTarget('ppct');
    setIsUploadModalOpen(true);
  };

  const handleOpenUploadForTeacher = () => {
    setUploadTarget('teacher');
    setIsUploadModalOpen(true);
  };

  // Explicit Save Handlers
  const handleSaveTeachers = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      showToast(`✓ Đã lưu danh sách gồm ${teachers.length} giáo viên vào bộ nhớ hệ thống thành công!`);
    } catch (e) {
      showToast('Có lỗi khi lưu danh sách giáo viên.');
    }
  };

  const handleSaveTimetable = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));
      localStorage.setItem(STORAGE_KEYS.TIMETABLE_VERSIONS, JSON.stringify(timetableVersions));
      showToast(`✓ Đã lưu Thời khóa biểu (${timetable.slots.length} tiết - ${timetable.title}) vào bộ nhớ hệ thống thành công!`);
    } catch (e) {
      showToast('Có lỗi khi lưu Thời khóa biểu.');
    }
  };

  const handleSaveAllData = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));
      localStorage.setItem(STORAGE_KEYS.TIMETABLE_VERSIONS, JSON.stringify(timetableVersions));
      showToast(`✓ Đã lưu toàn bộ Thời khóa biểu & Danh sách ${teachers.length} giáo viên vào bộ nhớ thành công!`);
    } catch (e) {
      showToast('Có lỗi khi lưu dữ liệu.');
    }
  };

  const handleTimetableImported = (
    newSlots: TimetableSlot[],
    fileName: string,
    asNewVersion: boolean = false,
    fromWeek: number = 16,
    versionTitle: string = ''
  ) => {
    // ABSOLUTE SECURITY GUARD: Never modify existing timetable if slots are empty or faulty
    if (!newSlots || newSlots.length === 0) {
      showToast(
        '⚠️ CẢNH BÁO: Tệp không có tiết học hợp lệ. Hệ thống TUYỆT ĐỐI GIỮ NGUYÊN Thời khóa biểu hiện tại và KHÔNG thay đổi dữ liệu!'
      );
      return;
    }

    if (newSlots.length < 5) {
      showToast(
        '⚠️ CẢNH BÁO: Số lượng tiết học nhận diện được quá ít (< 5 tiết), nghi ngờ cấu trúc tệp sai. Hệ thống giữ nguyên Thời khóa biểu hiện tại.'
      );
      return;
    }

    if (asNewVersion) {
      const newId = `tkb-v${Date.now()}`;
      const title = versionTitle.trim() || `TKB Mới (${fileName.replace(/\.[^/.]+$/, '')})`;
      const newVer: TimetableVersion = {
        id: newId,
        title,
        effectiveFromWeek: fromWeek,
        effectiveDate: new Date().toLocaleDateString('vi-VN'),
        slots: newSlots,
        createdAt: new Date().toISOString(),
        note: `Nhập từ tệp ${fileName}`,
      };

      const updatedVersions = timetableVersions.map((v) => {
        if (v.effectiveFromWeek < fromWeek && (!v.effectiveToWeek || v.effectiveToWeek >= fromWeek)) {
          return { ...v, effectiveToWeek: fromWeek - 1 };
        }
        return v;
      });
      const finalVersions = [...updatedVersions, newVer];

      setTimetableVersions(finalVersions);
      setActiveTimetableId(newId);

      const newTimetableData: TimetableData = {
        title: newVer.title,
        schoolYear: timetable.schoolYear || '2024-2025',
        schoolName: timetable.schoolName || SCHOOL_INFO.name,
        effectiveDate: newVer.effectiveDate,
        effectiveFromWeek: newVer.effectiveFromWeek,
        effectiveToWeek: newVer.effectiveToWeek,
        slots: newSlots,
      };
      setTimetable(newTimetableData);

      try {
        localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(newTimetableData));
        localStorage.setItem(STORAGE_KEYS.TIMETABLE_VERSIONS, JSON.stringify(finalVersions));
      } catch (e) {
        console.warn(e);
      }

      showToast(
        `✓ Đã lưu đợt TKB mới: "${title}" (${newSlots.length} tiết) áp dụng từ Tuần ${fromWeek} vào hệ thống!`
      );
    } else {
      // Overwrite current active timetable
      const updatedTimetable = {
        ...timetable,
        slots: newSlots,
      };
      setTimetable(updatedTimetable);
      const updatedVersions = timetableVersions.map((v) =>
        v.id === activeTimetableId ? { ...v, slots: newSlots } : v
      );
      setTimetableVersions(updatedVersions);

      try {
        localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(updatedTimetable));
        localStorage.setItem(STORAGE_KEYS.TIMETABLE_VERSIONS, JSON.stringify(updatedVersions));
      } catch (e) {
        console.warn(e);
      }

      showToast(`✓ Đã lưu và cập nhật ${newSlots.length} tiết TKB từ tệp ${fileName} vào hệ thống!`);
    }
  };

  const handleTeachersImported = (
    newTeachers: Teacher[],
    fileName: string,
    mode: 'replace' | 'merge' = 'replace'
  ) => {
    if (!newTeachers || newTeachers.length === 0) {
      showToast(`Không có giáo viên nào được chọn để lưu.`);
      return;
    }

    if (mode === 'merge') {
      // Keep existing teachers, only append new teachers
      const existingNameMap = new Map(teachers.map((t) => [t.name.toLowerCase().trim(), t]));
      const existingShortMap = new Map(teachers.map((t) => [t.shortName.toLowerCase().trim(), t]));

      const trulyNew: Teacher[] = [];
      newTeachers.forEach((nt) => {
        const normName = nt.name.toLowerCase().trim();
        const normShort = nt.shortName.toLowerCase().trim();
        if (!existingNameMap.has(normName) && !existingShortMap.has(normShort)) {
          trulyNew.push(nt);
        }
      });

      const merged = [...teachers, ...trulyNew];
      setTeachers(merged);
      try {
        localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(merged));
      } catch (e) {
        console.warn(e);
      }
      showToast(
        `✓ Đã bổ sung ${trulyNew.length} giáo viên mới vào danh sách (Tổng cộng hiện có: ${merged.length} GV)!`
      );
    } else {
      // Replace completely with user-approved list
      setTeachers(newTeachers);
      if (newTeachers.length > 0) {
        setSelectedTeacherShortName(newTeachers[0].shortName);
      }
      try {
        localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(newTeachers));
      } catch (e) {
        console.warn(e);
      }
      showToast(
        `✓ Đã cập nhật và lưu danh sách ${newTeachers.length} giáo viên từ tệp ${fileName} vào hệ thống thành công!`
      );
    }
  };

  const handlePPCTImported = (
    newItems: PPCTItem[],
    fileName: string,
    subject: string,
    grade: number
  ) => {
    if (newItems && newItems.length > 0) {
      setPpctPlans((prev) => {
        const existingIndex = prev.findIndex((p) => p.subject === subject && p.grade === grade);
        const totalPeriods = newItems.reduce((acc, curr) => acc + curr.periodCount, 0);

        const newPlan: PPCTPlan = {
          id: `${subject.toLowerCase()}-${grade}`,
          subject,
          grade,
          schoolYear: SCHOOL_INFO.schoolYear,
          totalPeriods,
          term1Periods: Math.min(totalPeriods, 72),
          term2Periods: Math.max(0, totalPeriods - 72),
          items: newItems,
        };

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newPlan;
          return updated;
        } else {
          return [...prev, newPlan];
        }
      });
      showToast(`Đã tải lên thành công ${newItems.length} bài học môn ${subject} Lớp ${grade} từ tệp ${fileName}!`);
    } else {
      showToast(`Đã ghi nhận kế hoạch dạy học môn ${subject} Lớp ${grade} từ ${fileName}!`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Official Header */}
      <Header
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        selectedWeek={selectedWeek}
        setSelectedWeek={setSelectedWeek}
        selectedTeacherShortName={selectedTeacherShortName}
        onOpenTeacherManager={() => setIsTeacherManagerOpen(true)}
        onOpenUploadTeacherModal={handleOpenUploadForTeacher}
        onGoHome={handleGoHome}
        deviceMode={deviceMode}
        setDeviceMode={handleSetDeviceMode}
        isSimulatedFrame={isSimulatedFrame}
        setIsSimulatedFrame={setIsSimulatedFrame}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6 ${
          deviceMode === 'mobile' ? 'max-w-2xl pb-24' : 'max-w-7xl'
        }`}
      >
        {/* Simulated Phone Frame (if enabled by user on desktop) */}
        {deviceMode === 'mobile' && isSimulatedFrame && (
          <div className="hidden md:flex items-center justify-between bg-amber-100 text-amber-950 px-4 py-2 rounded-xl text-xs font-bold border border-amber-300">
            <span>📱 Khung mô phỏng kích thước smartphone thật trên máy tính đang bật.</span>
            <button
              type="button"
              onClick={() => setIsSimulatedFrame(false)}
              className="text-blue-700 underline font-bold"
            >
              Mở rộng toàn màn hình
            </button>
          </div>
        )}

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 p-4 bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Active Module View: 4 Core Modules */}
        {activeModule === 1 && (
          <TeacherListModule
            teachers={teachers}
            setTeachers={setTeachers}
            onOpenUploadModal={handleOpenUploadForTeacher}
            onSaveTeachers={handleSaveTeachers}
          />
        )}

        {activeModule === 2 && (
          <TimetableModule
            timetable={timetable}
            setTimetable={setTimetable}
            selectedTeacherShortName={selectedTeacherShortName}
            setSelectedTeacherShortName={setSelectedTeacherShortName}
            onOpenUploadModal={handleOpenUploadForTKB}
            teachers={teachers}
            onOpenUploadTeacherModal={handleOpenUploadForTeacher}
            onOpenTeacherManagerModal={() => setActiveModule(1)}
            onSaveTimetable={handleSaveTimetable}
            timetableVersions={timetableVersions}
            setTimetableVersions={setTimetableVersions}
            activeTimetableId={activeTimetableId}
            setActiveTimetableId={setActiveTimetableId}
            selectedWeek={selectedWeek}
            deviceMode={deviceMode}
            setDeviceMode={handleSetDeviceMode}
            onGoHome={handleGoHome}
          />
        )}

        {activeModule === 3 && (
          <PPCTModule
            ppctPlans={ppctPlans}
            setPpctPlans={setPpctPlans}
            onOpenUploadModal={handleOpenUploadForPPCT}
            onGoHome={handleGoHome}
          />
        )}

        {activeModule === 4 && (
          <PhieuBaoGiangModule
            timetable={timetable}
            ppctPlans={ppctPlans}
            selectedTeacherShortName={selectedTeacherShortName}
            setSelectedTeacherShortName={setSelectedTeacherShortName}
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            teachers={teachers}
            onOpenUploadTeacherModal={handleOpenUploadForTeacher}
            onOpenTeacherManagerModal={() => setActiveModule(1)}
            timetableVersions={timetableVersions}
            deviceMode={deviceMode}
            setDeviceMode={handleSetDeviceMode}
            onGoHome={handleGoHome}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only in mobile mode) */}
      {deviceMode === 'mobile' && (
        <MobileBottomNav
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          onOpenTeacherManager={() => setIsTeacherManagerOpen(true)}
          setDeviceMode={handleSetDeviceMode}
          onGoHome={handleGoHome}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500 print:hidden mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1 font-medium text-slate-700">
            <School className="w-4 h-4 text-blue-600" />
            {SCHOOL_INFO.name} • {SCHOOL_INFO.district} • {SCHOOL_INFO.province}
          </p>
          <p>
            Phần mềm Lập Lịch Báo Giảng Tự Động • Hỗ trợ tải lên & xuất file Excel, Word (.doc, .docx), PDF
          </p>
        </div>
      </footer>

      {/* Multi-format File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        targetType={uploadTarget}
        onTimetableImported={handleTimetableImported}
        onPPCTImported={handlePPCTImported}
        onTeachersImported={handleTeachersImported}
        onGoHome={handleGoHome}
      />

      {/* Teacher List Manager Modal */}
      <TeacherManagerModal
        isOpen={isTeacherManagerOpen}
        onClose={() => setIsTeacherManagerOpen(false)}
        teachers={teachers}
        setTeachers={setTeachers}
        selectedTeacherShortName={selectedTeacherShortName}
        setSelectedTeacherShortName={setSelectedTeacherShortName}
        onOpenUploadTeacherModal={handleOpenUploadForTeacher}
        onSaveTeachers={handleSaveTeachers}
        onGoHome={handleGoHome}
      />
    </div>
  );
}


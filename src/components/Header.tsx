import React, { useMemo } from 'react';
import { Calendar, FileSpreadsheet, FileText, School, Clock, Download, Sparkles, Users, Upload, Smartphone, Monitor, RotateCcw, Home, GraduationCap } from 'lucide-react';
import { SCHOOL_INFO } from '../data/mockData';
import { DeviceMode } from '../types';
import { DeviceModeSelector } from './DeviceModeSelector';
import { getTodaySystemInfo, getAcademicWeekDates } from '../utils/academicCalendar';

interface HeaderProps {
  activeModule: 1 | 2 | 3 | 4;
  setActiveModule: (m: 1 | 2 | 3 | 4) => void;
  selectedWeek: number;
  setSelectedWeek: (w: number) => void;
  selectedTeacherShortName: string;
  onOpenTeacherManager?: () => void;
  onOpenUploadTeacherModal?: () => void;
  onGoHome?: () => void;
  deviceMode?: DeviceMode;
  setDeviceMode?: (mode: DeviceMode) => void;
  isSimulatedFrame?: boolean;
  setIsSimulatedFrame?: (sim: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  setActiveModule,
  selectedWeek,
  setSelectedWeek,
  selectedTeacherShortName,
  onOpenTeacherManager,
  onOpenUploadTeacherModal,
  onGoHome,
  deviceMode = 'desktop',
  setDeviceMode,
  isSimulatedFrame = false,
  setIsSimulatedFrame,
}) => {
  const systemInfo = useMemo(() => getTodaySystemInfo(), []);
  const currentSystemWeek = systemInfo.currentWeek;

  const handleHomeClick = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      setActiveModule(4);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner with School Identity */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* School Identity with Home click support */}
          <div
            onClick={handleHomeClick}
            className="flex items-center gap-3 cursor-pointer group select-none transition-transform hover:scale-[1.01]"
            title="Nhấp để trở về Trang chủ (Phiếu Báo Giảng Tự Động)"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 backdrop-blur-xs border border-white/20 flex items-center justify-center text-amber-300 font-bold text-xl shadow-inner transition-colors">
              <School className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-blue-200 font-semibold flex items-center gap-1.5">
                <span>{SCHOOL_INFO.district}</span>
                <span>-</span>
                <span>{SCHOOL_INFO.province}</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-400/25 text-amber-300 px-1.5 py-0.2 rounded font-bold border border-amber-300/30">
                  <Home className="w-2.5 h-2.5" /> Trang chủ
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2 flex-wrap">
                {SCHOOL_INFO.name}
                {SCHOOL_INFO.campus && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                    {SCHOOL_INFO.campus}
                  </span>
                )}
                <span className="hidden sm:inline-block text-xs font-normal px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Hệ thống Báo giảng Tự động
                </span>
              </h1>
            </div>
          </div>

          {/* Quick Info & Device Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Device Mode Selector: Máy tính / Điện thoại */}
            {setDeviceMode && (
              <DeviceModeSelector
                deviceMode={deviceMode}
                setDeviceMode={setDeviceMode}
                isSimulatedFrame={isSimulatedFrame}
                setIsSimulatedFrame={setIsSimulatedFrame}
              />
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <Clock className="w-4 h-4 text-amber-300" />
              <span className="text-blue-100">Năm học: <strong className="text-white">{systemInfo.schoolYearLabel}</strong></span>
              <span className="text-white/40">|</span>
              <span className="text-blue-100">{systemInfo.semesterLabel}</span>
              <span className="text-white/40">|</span>
              <span className="text-amber-300 font-semibold">{systemInfo.fullTodayLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Module Switcher Tabs: 4 Modules */}
        <nav className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100/90 rounded-xl border border-slate-200/90">
          <button
            id="tab-module-1"
            onClick={() => setActiveModule(1)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeModule === 1
                ? 'bg-blue-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className={`w-4 h-4 ${activeModule === 1 ? 'text-amber-300' : 'text-blue-600'}`} />
            <span>1. Danh sách GV</span>
          </button>

          <button
            id="tab-module-2"
            onClick={() => setActiveModule(2)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeModule === 2
                ? 'bg-blue-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeModule === 2 ? 'text-amber-300' : 'text-blue-600'}`} />
            <span>2. Thời khóa biểu</span>
          </button>

          <button
            id="tab-module-3"
            onClick={() => setActiveModule(3)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeModule === 3
                ? 'bg-blue-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <GraduationCap className={`w-4 h-4 ${activeModule === 3 ? 'text-amber-300' : 'text-indigo-600'}`} />
            <span>3. PPCT</span>
            <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-bold">
              Đưa lên
            </span>
          </button>

          <button
            id="tab-module-4"
            onClick={() => setActiveModule(4)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeModule === 4
                ? 'bg-linear-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                : 'text-slate-700 hover:text-blue-700 hover:bg-white/60'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeModule === 4 ? 'text-amber-300' : 'text-amber-600'}`} />
            <span>4. Lịch báo giảng</span>
            <span className="text-[10px] bg-amber-400 text-blue-950 px-1.5 py-0.5 rounded font-black">
              Tự động tạo
            </span>
          </button>
        </nav>

        {/* Global Week Selector with System Default Indicator */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600 hidden sm:inline" />
            <label htmlFor="select-week" className="text-slate-700 font-bold whitespace-nowrap text-xs sm:text-sm">
              Tuần thực hiện:
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              id="select-week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className={`border font-semibold text-slate-800 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:outline-hidden focus:ring-2 shadow-2xs transition-colors ${
                selectedWeek === currentSystemWeek
                  ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 focus:ring-emerald-500 font-bold'
                  : 'bg-white border-slate-300 focus:ring-blue-500'
              }`}
            >
              {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                const { startDateStr, endDateStr } = getAcademicWeekDates(w);
                const isCurrent = w === currentSystemWeek;
                return (
                  <option key={w} value={w}>
                    Tuần {w} {isCurrent ? '★ (Hiện tại)' : ''}: {startDateStr.slice(0, 5)} - {endDateStr.slice(0, 5)} {w <= 18 ? '(HK I)' : '(HK II)'}
                  </option>
                );
              })}
            </select>

            {/* Quick action: Return to current system week if viewing other week */}
            {selectedWeek !== currentSystemWeek ? (
              <button
                type="button"
                onClick={() => setSelectedWeek(currentSystemWeek)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors shadow-2xs cursor-pointer active:scale-95"
                title={`Nhấp để quay về Tuần ${currentSystemWeek} theo ngày hệ thống (${systemInfo.dateStr})`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>Về Tuần {currentSystemWeek}</span>
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
                title={`Đang hiển thị đúng theo ngày hệ thống hôm nay (${systemInfo.dateStr})`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Mặc định hệ thống</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};


import React from 'react';
import { Calendar, FileSpreadsheet, FileText, Users, Monitor, Home, GraduationCap } from 'lucide-react';
import { DeviceMode } from '../types';

interface MobileBottomNavProps {
  activeModule: 1 | 2 | 3 | 4;
  setActiveModule: (m: 1 | 2 | 3 | 4) => void;
  onOpenTeacherManager: () => void;
  setDeviceMode: (mode: DeviceMode) => void;
  onGoHome?: () => void;
  reportCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeModule,
  setActiveModule,
  onOpenTeacherManager,
  setDeviceMode,
  onGoHome,
  reportCount = 0,
}) => {
  const handleHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      setActiveModule(4);
    }
  };

  return (
    <div
      id="mobile-bottom-nav"
      className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 shadow-lg px-2 py-1 flex items-center justify-around print:hidden"
    >
      {/* 1. Modul đưa danh sách giáo viên */}
      <button
        type="button"
        onClick={() => setActiveModule(1)}
        className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all min-w-[62px] min-h-[44px] ${
          activeModule === 1
            ? 'text-blue-700 bg-blue-50 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Users className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">1. Giáo viên</span>
      </button>

      {/* 2. Modul Tải thời khóa biểu */}
      <button
        type="button"
        onClick={() => setActiveModule(2)}
        className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all min-w-[62px] min-h-[44px] ${
          activeModule === 2
            ? 'text-blue-700 bg-blue-50 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Calendar className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">2. TKB</span>
      </button>

      {/* 3. Modul PPCT */}
      <button
        type="button"
        onClick={() => setActiveModule(3)}
        className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all min-w-[62px] min-h-[44px] ${
          activeModule === 3
            ? 'text-indigo-700 bg-indigo-50 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <GraduationCap className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">3. PPCT</span>
      </button>

      {/* 4. Modul Lịch báo giảng */}
      <button
        type="button"
        onClick={() => setActiveModule(4)}
        className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[75px] min-h-[44px] ${
          activeModule === 4
            ? 'text-white bg-linear-to-r from-blue-700 to-indigo-700 font-bold shadow-sm'
            : 'text-slate-600 hover:text-blue-700'
        }`}
      >
        <FileText className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">4. Báo Giảng</span>
        {reportCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-blue-950 font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
            {reportCount > 99 ? '99+' : reportCount}
          </span>
        )}
      </button>

      {/* Switch to Desktop */}
      <button
        type="button"
        onClick={() => setDeviceMode('desktop')}
        className="flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-slate-500 hover:text-blue-800 transition-all min-w-[50px] min-h-[44px]"
        title="Chuyển sang chế độ Máy tính (Desktop view)"
      >
        <Monitor className="w-5 h-5 mb-0.5 text-blue-600" />
        <span className="text-[10px] leading-tight text-blue-700 font-semibold">Máy tính</span>
      </button>
    </div>
  );
};

import React from 'react';
import { Monitor, Smartphone, Check, Sparkles } from 'lucide-react';
import { DeviceMode } from '../types';

interface DeviceModeSelectorProps {
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  isSimulatedFrame?: boolean;
  setIsSimulatedFrame?: (sim: boolean) => void;
  compact?: boolean;
}

export const DeviceModeSelector: React.FC<DeviceModeSelectorProps> = ({
  deviceMode,
  setDeviceMode,
  isSimulatedFrame = false,
  setIsSimulatedFrame,
  compact = false,
}) => {
  return (
    <div className="inline-flex items-center gap-1.5" id="device-mode-selector">
      {/* Device Mode Switcher */}
      <div className="flex items-center p-1 bg-slate-900/30 backdrop-blur-md rounded-xl border border-white/20 shadow-inner">
        {/* Máy tính */}
        <button
          type="button"
          onClick={() => setDeviceMode('desktop')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            deviceMode === 'desktop'
              ? 'bg-white text-blue-950 shadow-sm'
              : 'text-blue-100 hover:text-white hover:bg-white/10'
          }`}
          title="Chế độ Máy tính: Giao diện đầy đủ, bảng biểu ma trận, A4 chuẩn in ấn, thích hợp cho máy tính bàn, laptop"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Máy tính</span>
          {deviceMode === 'desktop' && <Check className="w-3 h-3 text-blue-700" />}
        </button>

        {/* Điện thoại */}
        <button
          type="button"
          onClick={() => setDeviceMode('mobile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            deviceMode === 'mobile'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-blue-100 hover:text-white hover:bg-white/10'
          }`}
          title="Chế độ Điện thoại: Giao diện tối ưu màn hình dọc, chia ngày dạng thẻ, phím bấm lớn, tiện theo dõi trên smartphone"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Điện thoại</span>
          {deviceMode === 'mobile' && <Check className="w-3 h-3 text-slate-950" />}
        </button>
      </div>

      {/* When in mobile mode on a desktop screen, allow toggling simulated phone frame */}
      {deviceMode === 'mobile' && setIsSimulatedFrame && !compact && (
        <button
          type="button"
          onClick={() => setIsSimulatedFrame(!isSimulatedFrame)}
          className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isSimulatedFrame
              ? 'bg-amber-400/20 text-amber-200 border-amber-400/40 hover:bg-amber-400/30'
              : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'
          }`}
          title="Bật/tắt khung mô phỏng kích thước màn hình điện thoại thật trên máy tính"
        >
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>{isSimulatedFrame ? 'Khung điện thoại: Bật' : 'Mở rộng màn hình'}</span>
        </button>
      )}
    </div>
  );
};

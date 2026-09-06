import React, { useState, useEffect } from 'react';
import { Bookmark, Sparkles, Check, Trash2, X, Plus, Clock, Copy, Layers, FileDown, FileUp, RotateCcw, CheckCircle2, Info, ArrowRight, ShieldCheck, AlertCircle, Home } from 'lucide-react';
import { WeekTemplate, WeekTemplateCustomization, LessonReportRow, Teacher } from '../types';

interface WeekTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeek: number;
  currentTeacher?: Teacher;
  reportRows: LessonReportRow[];
  onApplyTemplate: (template: WeekTemplate, mode: 'notes_equipment_only' | 'full') => void;
  showToast?: (msg: string, type?: 'success' | 'info') => void;
  onGoHome?: () => void;
}

const TEMPLATES_STORAGE_KEY = 'baogiang_week_templates_v1';

// Default standard preset templates for Vietnamese secondary schools
const DEFAULT_PRESET_TEMPLATES: WeekTemplate[] = [
  {
    id: 'preset-kt15p',
    name: 'Mẫu tuần Kiểm tra 15 phút định kỳ',
    description: 'Tự động áp dụng ghi chú KT 15 phút cho các tiết đầu tuần và chuẩn bị đề kiểm tra',
    teacherShortName: 'all',
    createdAt: '2026-09-01',
    isDefaultPreset: true,
    customizations: [
      {
        dayOfWeek: 2,
        session: 'morning',
        periodTKB: 1,
        className: '8.1',
        subject: 'Toán',
        notes: 'KT 15 phút',
        equipment: 'Đề kiểm tra, phiếu học tập',
      },
      {
        dayOfWeek: 2,
        session: 'morning',
        periodTKB: 2,
        className: '8.2',
        subject: 'Toán',
        notes: 'KT 15 phút',
        equipment: 'Đề kiểm tra, phiếu học tập',
      },
      {
        dayOfWeek: 3,
        session: 'morning',
        periodTKB: 1,
        className: '9.1',
        subject: 'Toán',
        notes: 'KT 15 phút',
        equipment: 'Đề kiểm tra, máy tính cầm tay',
      },
      {
        dayOfWeek: 3,
        session: 'morning',
        periodTKB: 2,
        className: '9.2',
        subject: 'Toán',
        notes: 'KT 15 phút',
        equipment: 'Đề kiểm tra, máy tính cầm tay',
      },
    ],
  },
  {
    id: 'preset-thuchanh',
    name: 'Mẫu tuần Tiết thực hành & Phòng bộ môn',
    description: 'Đăng ký phòng học chức năng (Tin học/Ngoại ngữ) và phân bổ thiết bị thực hành',
    teacherShortName: 'all',
    createdAt: '2026-09-01',
    isDefaultPreset: true,
    customizations: [
      {
        dayOfWeek: 2,
        session: 'morning',
        periodTKB: 3,
        className: '8.1',
        subject: 'Toán',
        notes: 'Tiết thực hành - Phòng máy',
        equipment: 'Máy vi tính, phần mềm GeoGebra',
      },
      {
        dayOfWeek: 4,
        session: 'morning',
        periodTKB: 2,
        className: '9.1',
        subject: 'Toán',
        notes: 'Tiết thực hành ngoài trời',
        equipment: 'Giác kế, thước cuộn, cọc tiêu',
      },
    ],
  },
  {
    id: 'preset-thaogiang',
    name: 'Mẫu tuần Thao giảng - Dự giờ Tổ chuyên môn',
    description: 'Đánh dấu tiết thao giảng cấp trường/tổ, chuẩn bị thiết bị trình chiếu TV/máy chiếu',
    teacherShortName: 'all',
    createdAt: '2026-09-01',
    isDefaultPreset: true,
    customizations: [
      {
        dayOfWeek: 4,
        session: 'morning',
        periodTKB: 3,
        className: '8.1',
        subject: 'Toán',
        notes: 'Dự giờ / Thao giảng Tổ',
        equipment: 'Kế hoạch bài dạy, Tivi / Máy chiếu',
      },
      {
        dayOfWeek: 5,
        session: 'morning',
        periodTKB: 2,
        className: '9.2',
        subject: 'Toán',
        notes: 'Thao giảng chuyên đề số',
        equipment: 'Phiếu học tập, bài giảng điện tử',
      },
    ],
  },
];

export const WeekTemplateModal: React.FC<WeekTemplateModalProps> = ({
  isOpen,
  onClose,
  currentWeek,
  currentTeacher = {
    id: 'gv-fallback',
    name: 'Giáo viên',
    shortName: 'GV',
    subject: 'Toán',
    department: 'Tổ Toán',
  },
  reportRows,
  onApplyTemplate,
  showToast = (_msg: string, _type?: 'success' | 'info') => {},
  onGoHome,
}) => {
  const teacherName = currentTeacher?.name || 'Giáo viên';
  const teacherShortName = currentTeacher?.shortName || 'GV';
  const teacherSubject = currentTeacher?.subject || 'Bộ môn';

  const [activeTab, setActiveTab] = useState<'apply' | 'save' | 'manage'>('apply');
  const [templates, setTemplates] = useState<WeekTemplate[]>([]);

  // State for saving a new template
  const [newTemplateName, setNewTemplateName] = useState(`Mẫu Tuần ${currentWeek} - ${teacherName}`);
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [saveMode, setSaveMode] = useState<'notes_equipment_only' | 'full'>('notes_equipment_only');

  // State for applying template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [applyMode, setApplyMode] = useState<'notes_equipment_only' | 'full'>('notes_equipment_only');

  // Load templates from localStorage + default presets on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTemplates(parsed);
          if (!selectedTemplateId) {
            setSelectedTemplateId(parsed[0].id);
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load templates from storage', e);
    }
    // Fallback to presets
    setTemplates(DEFAULT_PRESET_TEMPLATES);
    setSelectedTemplateId(DEFAULT_PRESET_TEMPLATES[0].id);
  }, []);

  // Sync to localStorage
  const persistTemplates = (newTemplates: WeekTemplate[]) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(newTemplates));
    } catch (e) {
      console.warn('Could not save templates to storage', e);
    }
  };

  if (!isOpen) return null;

  // Handle Save Current Week as Template
  const handleSaveCurrentWeekAsTemplate = () => {
    if (!newTemplateName.trim()) {
      showToast('Vui lòng nhập tên cho mẫu tuần!', 'info');
      return;
    }

    const customizations: WeekTemplateCustomization[] = reportRows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      session: r.session,
      periodTKB: r.periodTKB,
      className: r.className,
      subject: r.subject,
      equipment: r.equipment,
      notes: r.notes,
      customLessonName: saveMode === 'full' ? r.lessonName : undefined,
    }));

    const newTemplate: WeekTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || `Lưu từ Tuần ${currentWeek} của GV ${teacherName} (${customizations.length} tiết)`,
      teacherShortName: teacherShortName,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      sourceWeek: currentWeek,
      customizations,
      isDefaultPreset: false,
    };

    const updated = [newTemplate, ...templates];
    persistTemplates(updated);
    setSelectedTemplateId(newTemplate.id);
    showToast(`Đã lưu thành công mẫu "${newTemplate.name}"!`);
    setActiveTab('apply');
  };

  // Handle Apply Template
  const handleExecuteApply = (template: WeekTemplate) => {
    onApplyTemplate(template, applyMode);
    showToast(`Đã áp dụng mẫu "${template.name}" cho Tuần ${currentWeek}!`);
    onClose();
  };

  // Handle Delete Template
  const handleDeleteTemplate = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa mẫu tuần "${name}"?`)) {
      const updated = templates.filter((t) => t.id !== id);
      persistTemplates(updated);
      showToast(`Đã xóa mẫu "${name}"!`);
      if (selectedTemplateId === id && updated.length > 0) {
        setSelectedTemplateId(updated[0].id);
      }
    }
  };

  // Reset to default standard presets
  const handleResetPresets = () => {
    if (confirm('Khôi phục lại danh sách các mẫu tuần chuẩn ban đầu?')) {
      persistTemplates(DEFAULT_PRESET_TEMPLATES);
      setSelectedTemplateId(DEFAULT_PRESET_TEMPLATES[0].id);
      showToast('Đã khôi phục các mẫu tuần mặc định!');
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Count how many items in selected template match current reportRows
  const matchCount = selectedTemplate
    ? reportRows.filter((r) =>
        selectedTemplate.customizations.some(
          (c) =>
            (c.dayOfWeek === r.dayOfWeek && c.periodTKB === r.periodTKB && c.className === r.className) ||
            (c.className === r.className && c.subject === r.subject)
        )
      ).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-amber-300">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Lưu & Áp Dụng Mẫu Tuần</h3>
              <p className="text-xs text-blue-100">
                Lưu lại ghi chú, thiết bị dạy học và tùy chỉnh của một tuần để áp dụng nhanh cho các tuần tiếp theo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onGoHome && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoHome();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95 cursor-pointer border border-white/20"
                title="Đóng và trở về Trang chủ"
              >
                <Home className="w-3.5 h-3.5 text-amber-300" />
                <span>Trang chủ</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('apply')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x ${
              activeTab === 'apply'
                ? 'bg-white text-blue-700 border-slate-200 -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Áp dụng mẫu ({templates.length})</span>
          </button>

          <button
            onClick={() => {
              setNewTemplateName(`Mẫu Tuần ${currentWeek} - ${teacherName}`);
              setActiveTab('save');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x ${
              activeTab === 'save'
                ? 'bg-white text-blue-700 border-slate-200 -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Lưu từ Tuần {currentWeek}</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x ${
              activeTab === 'manage'
                ? 'bg-white text-blue-700 border-slate-200 -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-600" />
            <span>Quản lý mẫu</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: APPLY TEMPLATE */}
          {activeTab === 'apply' && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Đang chọn áp dụng cho: Tuần {currentWeek} • GV {teacherName} ({teacherSubject})</p>
                  <p className="text-slate-600 mt-0.5">
                    Hệ thống sẽ giữ nguyên tiến độ bài dạy PPCT của Tuần {currentWeek} và cập nhật các Ghi chú (KT 15p, Thực hành, Dạy bù...) và Thiết bị dạy học tương ứng.
                  </p>
                </div>
              </div>

              {/* Template Selection List */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn mẫu tuần muốn áp dụng:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {templates.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-slate-900 leading-tight">
                            {tpl.name}
                          </h4>
                          {tpl.isDefaultPreset && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                              Mẫu chuẩn
                            </span>
                          )}
                        </div>

                        {tpl.description && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {tpl.description}
                          </p>
                        )}

                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span>{tpl.customizations.length} cấu hình tiết</span>
                          <span className="text-slate-400">{tpl.createdAt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Application Options & Preview */}
              {selectedTemplate && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      Chế độ áp dụng cho Tuần {currentWeek}:
                    </span>
                    <div className="flex p-0.5 bg-white rounded-lg border border-slate-300">
                      <button
                        onClick={() => setApplyMode('notes_equipment_only')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          applyMode === 'notes_equipment_only'
                            ? 'bg-blue-700 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Chỉ Ghi chú & Thiết bị (Khuyên dùng)
                      </button>
                      <button
                        onClick={() => setApplyMode('full')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          applyMode === 'full'
                            ? 'bg-blue-700 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Toàn bộ tùy chỉnh
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span>
                      Độ khớp: <strong className="text-emerald-700">{matchCount} / {reportRows.length}</strong> tiết trong tuần này có thể áp dụng
                    </span>
                    <span className="text-slate-500">
                      {applyMode === 'notes_equipment_only'
                        ? 'Giữ nguyên bài học PPCT tuần này'
                        : 'Bao gồm cả tên bài học tùy chỉnh'}
                    </span>
                  </div>

                  {/* Summary of customized notes in template */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-700">Các ghi chú tiêu biểu trong mẫu này:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {selectedTemplate.customizations
                        .filter((c) => c.notes || c.equipment)
                        .slice(0, 6)
                        .map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 font-medium"
                          >
                            Thứ {c.dayOfWeek} (T{c.periodTKB} - {c.className}): <strong className="text-blue-700">{c.notes || c.equipment}</strong>
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVE CURRENT WEEK AS TEMPLATE */}
          {activeTab === 'save' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Lưu cấu hình phiếu báo giảng hiện tại (Tuần {currentWeek})</p>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    Toàn bộ {reportRows.length} tiết giảng dạy của GV {teacherName} cùng với các ghi chú (KT 15p, phòng máy, tiết bù...) và thiết bị sẽ được lưu lại thành một mẫu dùng lại.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên mẫu tuần (*):
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="VD: Mẫu tuần kiểm tra 15 phút, Mẫu chuẩn tuần chẵn..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mô tả ghi chú (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="VD: Tuần có 2 tiết kiểm tra 15p tại 8/1, 8/2 và 1 tiết thực hành phòng máy..."
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phạm vi lưu trữ:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      onClick={() => setSaveMode('notes_equipment_only')}
                      className={`p-2.5 rounded-xl border-2 flex items-start gap-2 cursor-pointer transition-all ${
                        saveMode === 'notes_equipment_only'
                          ? 'border-blue-600 bg-blue-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="save_mode"
                        checked={saveMode === 'notes_equipment_only'}
                        onChange={() => setSaveMode('notes_equipment_only')}
                        className="mt-0.5 text-blue-600"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Chỉ lưu Ghi chú & Thiết bị</span>
                        <span className="text-[11px] text-slate-500">Khuyên dùng để giữ nguyên tính tự động của PPCT theo tuần khi áp dụng</span>
                      </div>
                    </label>

                    <label
                      onClick={() => setSaveMode('full')}
                      className={`p-2.5 rounded-xl border-2 flex items-start gap-2 cursor-pointer transition-all ${
                        saveMode === 'full'
                          ? 'border-blue-600 bg-blue-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="save_mode"
                        checked={saveMode === 'full'}
                        onChange={() => setSaveMode('full')}
                        className="mt-0.5 text-blue-600"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Lưu toàn bộ tùy chỉnh</span>
                        <span className="text-[11px] text-slate-500">Bao gồm cả tên bài học và số tiết PPCT đã chỉnh sửa</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview of current week items */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Danh sách tiết sẽ lưu ({reportRows.length} tiết):
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 divide-y divide-slate-200 text-[11px]">
                    {reportRows.map((r, i) => (
                      <div key={i} className="p-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Thứ {r.dayOfWeek} (T{r.periodTKB})
                          </span>
                          <span className="font-bold text-slate-800">{r.className} - {r.subject}</span>
                          <span className="text-slate-500 truncate max-w-xs">{r.lessonName}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {r.notes && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold">
                              {r.notes}
                            </span>
                          )}
                          {r.equipment && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">
                              {r.equipment}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANAGE TEMPLATES */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Danh sách {templates.length} mẫu tuần đang lưu trữ:
                </span>
                <button
                  onClick={handleResetPresets}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                  title="Khôi phục lại các mẫu chuẩn ban đầu"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục mẫu chuẩn</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {tpl.name}
                        </h4>
                        {tpl.isDefaultPreset && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            Mặc định
                          </span>
                        )}
                        {tpl.sourceWeek && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                            Từ Tuần {tpl.sourceWeek}
                          </span>
                        )}
                      </div>
                      {tpl.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{tpl.description}</p>
                      )}
                      <div className="text-[10px] text-slate-400 mt-1">
                        Tạo ngày: {tpl.createdAt} • {tpl.customizations.length} tiết giảng dạy
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          handleExecuteApply(tpl);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Áp dụng</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa mẫu tuần này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Đóng
          </button>

          {activeTab === 'apply' && selectedTemplate && (
            <button
              onClick={() => handleExecuteApply(selectedTemplate)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Áp dụng mẫu "{selectedTemplate.name}" cho Tuần {currentWeek}</span>
            </button>
          )}

          {activeTab === 'save' && (
            <button
              onClick={handleSaveCurrentWeekAsTemplate}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Lưu thành Mẫu Tuần mới</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

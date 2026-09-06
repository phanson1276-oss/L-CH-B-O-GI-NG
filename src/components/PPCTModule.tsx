import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, Download, Plus, Trash2, Edit3, Save, Check, FileSpreadsheet, Layers, BookOpen, Search, Info, RotateCcw, X, CheckCircle2, GraduationCap, Filter, Sparkles, FolderPlus, ArrowDownCircle, Tag, Home } from 'lucide-react';
import { PPCTPlan, PPCTItem } from '../types';
import { SCHOOL_INFO, INITIAL_PPCT_PLANS, STANDARD_SUBJECTS_LIST, GRADES_LIST } from '../data/mockData';
import { FULL_STANDARD_PPCT_PLANS, getStandardPeriodsForSubject } from '../data/ppctCurriculumData';
import * as XLSX from 'xlsx';

interface PPCTModuleProps {
  ppctPlans: PPCTPlan[];
  setPpctPlans: React.Dispatch<React.SetStateAction<PPCTPlan[]>>;
  onOpenUploadModal: () => void;
  onGoHome?: () => void;
}

// Helper to highlight matching keyword
const HighlightText: React.FC<{ text?: string; query: string; className?: string }> = ({
  text = '',
  query,
  className = '',
}) => {
  if (!query || !query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }
  const cleanQuery = query.trim().toLowerCase();
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(cleanQuery);

  if (index === -1) {
    return <span className={className}>{text}</span>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + cleanQuery.length);
  const after = text.slice(index + cleanQuery.length);

  return (
    <span className={className}>
      {before}
      <mark className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded-xs">{match}</mark>
      <HighlightText text={after} query={query} />
    </span>
  );
};

export const PPCTModule: React.FC<PPCTModuleProps> = ({
  ppctPlans,
  setPpctPlans,
  onOpenUploadModal,
  onGoHome,
}) => {
  // Separate selections for Grade and Subject
  const [selectedGrade, setSelectedGrade] = useState<number>(9);
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('ALL');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<'ALL' | 'HK1' | 'HK2'>('ALL');
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageSearchTerm, setManageSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Editing item state
  const [editChapter, setEditChapter] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPeriods, setEditPeriods] = useState(1);
  const [editTimeFrame, setEditTimeFrame] = useState('');
  const [editEquipment, setEditEquipment] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // New item modal or inline form
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Normalize subject comparison
  const normalizeStr = (s: string) => s.toLowerCase().trim().normalize('NFC');

  // Find currently active plan based on selectedSubject and selectedGrade
  const currentPlan = useMemo(() => {
    return ppctPlans.find(
      (p) =>
        p.grade === selectedGrade &&
        (normalizeStr(p.subject) === normalizeStr(selectedSubject) ||
          normalizeStr(p.subject).includes(normalizeStr(selectedSubject)) ||
          normalizeStr(selectedSubject).includes(normalizeStr(p.subject)))
    );
  }, [ppctPlans, selectedGrade, selectedSubject]);

  // Distinct chapters for fast filtering and jump
  const distinctChapters = useMemo(() => {
    if (!currentPlan) return [];
    const list: string[] = [];
    currentPlan.items.forEach((it) => {
      const ch = (it.chapter || '').trim();
      if (ch && !list.includes(ch)) {
        list.push(ch);
      }
    });
    return list;
  }, [currentPlan]);

  // Reset chapter filter if grade or subject changes
  useEffect(() => {
    setSelectedChapterFilter('ALL');
    setSelectedSemesterFilter('ALL');
    setSearchFilter('');
  }, [selectedGrade, selectedSubject]);

  // If no plan matches the (selectedGrade, selectedSubject), check if we have it in standard catalog
  const standardCatalogPlan = useMemo(() => {
    return FULL_STANDARD_PPCT_PLANS.find(
      (p) =>
        p.grade === selectedGrade &&
        (normalizeStr(p.subject) === normalizeStr(selectedSubject) ||
          normalizeStr(p.subject).includes(normalizeStr(selectedSubject)) ||
          normalizeStr(selectedSubject).includes(normalizeStr(p.subject)))
    );
  }, [selectedGrade, selectedSubject]);

  // Available subjects from both standard list and user-uploaded plans
  const allAvailableSubjects = useMemo(() => {
    const set = new Set<string>(STANDARD_SUBJECTS_LIST);
    ppctPlans.forEach((p) => {
      if (p.subject) set.add(p.subject);
    });
    return Array.from(set);
  }, [ppctPlans]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Create or load missing plan from standard curriculum
  const handleInitializeStandardPlan = () => {
    if (standardCatalogPlan) {
      setPpctPlans((prev) => [...prev, standardCatalogPlan]);
      showToast(`Đã nạp Kế hoạch PPCT môn ${standardCatalogPlan.subject} - Lớp ${standardCatalogPlan.grade} theo chuẩn GDPT 2018!`);
    } else {
      const periodInfo = getStandardPeriodsForSubject(selectedSubject);
      const newPlan: PPCTPlan = {
        id: `plan-${Date.now()}-${selectedGrade}`,
        subject: selectedSubject,
        grade: selectedGrade,
        schoolYear: '2026-2027',
        totalPeriods: periodInfo.total,
        term1Periods: periodInfo.term1,
        term2Periods: periodInfo.term2,
        items: [
          {
            id: `item-${Date.now()}-1`,
            orderNumber: 1,
            chapter: `CHƯƠNG I. MỞ ĐẦU VÀ KIẾN THỨC CƠ BẢN`,
            lessonTitle: `Bài 1: Giới thiệu môn ${selectedSubject} lớp ${selectedGrade}`,
            periodCount: 2,
            timeFrame: 'Tuần 1',
            equipment: 'SGK, máy chiếu, bảng phụ',
            notes: 'Phòng học bộ môn',
          },
          {
            id: `item-${Date.now()}-2`,
            orderNumber: 2,
            chapter: `CHƯƠNG I. MỞ ĐẦU VÀ KIẾN THỨC CƠ BẢN`,
            lessonTitle: `Bài 2: Các chủ đề rèn luyện năng lực và thực hành`,
            periodCount: 2,
            timeFrame: 'Tuần 2',
            equipment: 'Phiếu học tập, tranh ảnh',
            notes: 'Phòng học',
          },
        ],
      };
      setPpctPlans((prev) => [...prev, newPlan]);
      showToast(`Đã khởi tạo kế hoạch PPCT môn ${selectedSubject} - Lớp ${selectedGrade}!`);
    }
  };

  const handleStartEdit = (item: PPCTItem) => {
    setEditingItemId(item.id);
    setEditChapter(item.chapter || '');
    setEditTitle(item.lessonTitle);
    setEditPeriods(item.periodCount);
    setEditTimeFrame(item.timeFrame);
    setEditEquipment(item.equipment);
    setEditNotes(item.notes);
  };

  const handleSaveEdit = (itemId: string) => {
    if (!currentPlan) return;

    const updatedItems = currentPlan.items.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          chapter: editChapter.trim(),
          lessonTitle: editTitle.trim() || 'Bài học mới',
          periodCount: Number(editPeriods) || 1,
          timeFrame: editTimeFrame.trim() || 'Tuần ...',
          equipment: editEquipment.trim(),
          notes: editNotes.trim(),
        };
      }
      return it;
    });

    setPpctPlans((prev) =>
      prev.map((p) => (p.id === currentPlan.id ? { ...p, items: updatedItems } : p))
    );

    setEditingItemId(null);
    showToast('Đã cập nhật bài học thành công!');
  };

  const handleDeleteItem = (itemId: string) => {
    if (!currentPlan) return;
    if (confirm('Bạn có chắc chắn muốn xóa bài học này khỏi phân phối chương trình?')) {
      const updatedItems = currentPlan.items
        .filter((it) => it.id !== itemId)
        .map((it, idx) => ({ ...it, orderNumber: idx + 1 }));

      setPpctPlans((prev) =>
        prev.map((p) => (p.id === currentPlan.id ? { ...p, items: updatedItems } : p))
      );
      showToast('Đã xóa bài học khỏi kế hoạch dạy học!');
    }
  };

  // Delete current selected plan (e.g. PPCT Toán 8)
  const handleDeleteCurrentPlan = () => {
    if (!currentPlan) return;
    const confirmMsg = `Xác nhận xóa tệp/kế hoạch PPCT môn ${currentPlan.subject} - Lớp ${currentPlan.grade} (${currentPlan.items.length} bài học)?\n\n(Lưu ý: Thao tác này chỉ xóa riêng môn ${currentPlan.subject} Lớp ${currentPlan.grade}, không ảnh hưởng đến bất kỳ môn học nào khác).`;
    if (window.confirm(confirmMsg)) {
      const updatedPlans = ppctPlans.filter((p) => p.id !== currentPlan.id);
      setPpctPlans(updatedPlans);
      showToast(`Đã xóa riêng PPCT môn ${currentPlan.subject} - Lớp ${currentPlan.grade}`);
    }
  };

  // Delete a specific plan by ID (granular deletion for any individual subject and grade, e.g. Toán 8)
  const handleDeletePlanById = (planId: string) => {
    const target = ppctPlans.find((p) => p.id === planId);
    if (!target) return;
    if (
      window.confirm(
        `Xác nhận xóa tệp/kế hoạch PPCT môn ${target.subject} - Lớp ${target.grade} (${target.items.length} bài học)?\n\n(Chỉ xóa riêng môn ${target.subject} Lớp ${target.grade}, toàn bộ kế hoạch của các môn khác vẫn được bảo toàn nguyên vẹn).`
      )
    ) {
      const updatedPlans = ppctPlans.filter((p) => p.id !== planId);
      setPpctPlans(updatedPlans);
      showToast(`Đã xóa riêng PPCT môn ${target.subject} - Lớp ${target.grade}`);
    }
  };

  // Reset to default standard PPCT plans (All subjects & grades)
  const handleResetDefaultPlans = () => {
    if (window.confirm('Khôi phục lại toàn bộ danh mục Phân phối chương trình mẫu chuẩn theo quy định GDPT 2018 của trường THCS Đồng Phú?')) {
      setPpctPlans(FULL_STANDARD_PPCT_PLANS);
      setSelectedGrade(9);
      setSelectedSubject('Toán');
      showToast('Đã nạp đầy đủ danh mục PPCT chuẩn tất cả các môn!');
      setShowManageModal(false);
    }
  };

  const handleAddNewItem = () => {
    if (!currentPlan) return;

    const newItem: PPCTItem = {
      id: `item-${Date.now()}`,
      orderNumber: currentPlan.items.length + 1,
      chapter: editChapter.trim() || (distinctChapters[0] || 'CHƯƠNG TIẾP THEO'),
      lessonTitle: editTitle.trim() || 'Bài học mới',
      periodCount: Number(editPeriods) || 1,
      timeFrame: editTimeFrame.trim() || 'Tuần ...',
      equipment: editEquipment.trim() || 'Thước thẳng, SGK',
      notes: editNotes.trim() || 'Phòng học',
    };

    setPpctPlans((prev) =>
      prev.map((p) =>
        p.id === currentPlan.id ? { ...p, items: [...p.items, newItem] } : p
      )
    );

    setIsAddingNew(false);
    setEditTitle('');
    setEditPeriods(1);
    setEditTimeFrame('');
    setEditEquipment('');
    setEditNotes('');
    showToast('Đã thêm bài học mới vào kế hoạch dạy học!');
  };

  // Export current PPCT plan to Excel
  const handleExportPPCTExcel = () => {
    if (!currentPlan) return;
    const wb = XLSX.utils.book_new();

    const data: any[][] = [
      [`TRƯỜNG THCS ĐỒNG PHÚ`],
      [`PHÂN PHỐI CHƯƠNG TRÌNH THCS MÔN ${currentPlan.subject.toUpperCase()} - LỚP ${currentPlan.grade}`],
      [`NĂM HỌC: ${currentPlan.schoolYear}`],
      [`Cả năm: 35 tuần | Học kì I: ${currentPlan.term1Periods} tiết | Học kì II: ${currentPlan.term2Periods} tiết`],
      [''],
      ['TT', 'Tên chủ đề / Bài học', 'Số tiết', 'Thời điểm thực hiện', 'Thiết bị dạy học', 'Liệt kê các YCCĐ / Năng lực số / Ghi chú'],
    ];

    let currentChap = '';
    currentPlan.items.forEach((it) => {
      if (it.chapter && it.chapter !== currentChap) {
        currentChap = it.chapter;
        data.push(['', currentChap, '', '', '', '']);
      }
      data.push([
        it.orderNumber,
        it.lessonTitle,
        it.periodCount,
        it.timeFrame,
        it.equipment,
        it.notes,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 45 },
      { wch: 10 },
      { wch: 15 },
      { wch: 30 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, `PPCT_${currentPlan.subject}_${currentPlan.grade}`);
    XLSX.writeFile(wb, `PPCT_${currentPlan.subject}_Lop${currentPlan.grade}_THCS_Dong_Phu.xlsx`);
  };

  // Quick jump directly to chapter header in DOM
  const handleJumpToChapter = (chapterTitle: string) => {
    if (chapterTitle === 'ALL') {
      setSelectedChapterFilter('ALL');
      return;
    }
    setSelectedChapterFilter(chapterTitle);
    showToast(`Đã lọc hiển thị bài học thuộc: ${chapterTitle.slice(0, 45)}...`, 'info');
  };

  // Fast Filtered Items computation
  const filteredItems = useMemo(() => {
    if (!currentPlan) return [];
    return currentPlan.items.filter((it) => {
      // 1. Text Search Filter (Lesson title, Chapter, Time, Equipment, Notes)
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchTitle = it.lessonTitle.toLowerCase().includes(q);
        const matchChapter = it.chapter ? it.chapter.toLowerCase().includes(q) : false;
        const matchTime = it.timeFrame.toLowerCase().includes(q);
        const matchEquip = it.equipment ? it.equipment.toLowerCase().includes(q) : false;
        const matchNotes = it.notes ? it.notes.toLowerCase().includes(q) : false;

        if (!matchTitle && !matchChapter && !matchTime && !matchEquip && !matchNotes) {
          return false;
        }
      }

      // 2. Chapter Filter
      if (selectedChapterFilter !== 'ALL') {
        if ((it.chapter || '').trim() !== selectedChapterFilter.trim()) {
          return false;
        }
      }

      // 3. Semester Filter
      if (selectedSemesterFilter === 'HK1') {
        const weekNums = it.timeFrame.match(/\d+/g);
        if (weekNums && weekNums.length > 0) {
          const maxW = Math.max(...weekNums.map(Number));
          if (maxW > 18) return false;
        } else if (it.orderNumber > (currentPlan.term1Periods || 72)) {
          return false;
        }
      } else if (selectedSemesterFilter === 'HK2') {
        const weekNums = it.timeFrame.match(/\d+/g);
        if (weekNums && weekNums.length > 0) {
          const minW = Math.min(...weekNums.map(Number));
          if (minW <= 18 && weekNums.length === 1) return false;
        }
      }

      return true;
    });
  }, [currentPlan, searchFilter, selectedChapterFilter, selectedSemesterFilter]);

  const hasActiveFilters = Boolean(
    searchFilter.trim() || selectedChapterFilter !== 'ALL' || selectedSemesterFilter !== 'ALL'
  );

  const handleClearAllFilters = () => {
    setSearchFilter('');
    setSelectedChapterFilter('ALL');
    setSelectedSemesterFilter('ALL');
  };

  const QUICK_SEARCH_TAGS = ['Kiểm tra', 'Ôn tập', 'Thực hành', 'Giữa kì', 'Cuối kì', 'Phòng máy', 'Năng lực số'];

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header Info and Actions */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Modul 2
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                KẾ HOẠCH DẠY HỌC (PHÂN PHỐI CHƯƠNG TRÌNH)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Quản lý tiến độ bài học, số tiết, thiết bị dạy học và yêu cầu cần đạt theo chuẩn GDPT 2018 cho tất cả các môn THCS
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Return to Home Button */}
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-sm font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Trở về Trang chủ (Phiếu Báo Giảng Tự Động)"
              >
                <Home className="w-4 h-4 text-emerald-700" />
                <span>Trở về Trang chủ</span>
              </button>
            )}

            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Tải lên PPCT (Excel, Word, PDF)</span>
            </button>

            {/* Manage & Delete PPCT Files Button */}
            <button
              onClick={() => setShowManageModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
              title="Xem danh sách và xóa các tệp PPCT đã đưa lên"
            >
              <Layers className="w-4 h-4 text-emerald-300" />
              <span>Quản lý / Xóa PPCT ({ppctPlans.length})</span>
            </button>

            {currentPlan && (
              <button
                onClick={handleExportPPCTExcel}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Xuất Excel PPCT</span>
              </button>
            )}

            {currentPlan && (
              <button
                onClick={() => setIsAddingNew(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-sm font-bold border border-blue-200 transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-700" />
                <span>Thêm bài học</span>
              </button>
            )}
          </div>
        </div>

        {/* SEPARATED SELECTORS: Khối Lớp riêng & Môn Học riêng */}
        <div className="mt-5 pt-4 border-t border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* 1. SEPARATE GRADE SELECTOR */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                  Khối Lớp:
                </label>
                <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-300">
                  {GRADES_LIST.map((gr) => (
                    <button
                      key={gr}
                      onClick={() => setSelectedGrade(gr)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        selectedGrade === gr
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Khối {gr}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. SEPARATE SUBJECT SELECTOR */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-700" />
                  Môn Học:
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs max-w-[280px]"
                >
                  {allAvailableSubjects.map((sub) => {
                    const hasPlan = ppctPlans.some(
                      (p) =>
                        p.grade === selectedGrade &&
                        (normalizeStr(p.subject) === normalizeStr(sub) ||
                          normalizeStr(p.subject).includes(normalizeStr(sub)))
                    );
                    return (
                      <option key={sub} value={sub}>
                        {sub} {hasPlan ? '✓' : '(chưa nạp)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Status Badge or Delete Plan Button */}
              {currentPlan ? (
                <button
                  onClick={handleDeleteCurrentPlan}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                  title="Xóa kế hoạch PPCT môn và khối lớp này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa PPCT môn này</span>
                </button>
              ) : (
                <button
                  onClick={handleInitializeStandardPlan}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors"
                  title="Nạp ngay kế hoạch phân phối chương trình chuẩn môn này"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nạp PPCT Môn {selectedSubject} - Lớp {selectedGrade}</span>
                </button>
              )}
            </div>

            {/* QUICK SEARCH & FILTER BAR */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-80">
                <Search className="w-4 h-4 text-emerald-700 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Tìm nhanh tên bài học, chương, tuần..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-200 transition-all font-medium text-slate-800 shadow-2xs"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200"
                    title="Xóa từ khóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ADVANCED FAST FILTERING BAR (Chương, Học kỳ, Keyword Tags) */}
          {currentPlan && (
            <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Fast Chapter Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-emerald-700" />
                    Lọc theo Chương:
                  </label>
                  <select
                    value={selectedChapterFilter}
                    onChange={(e) => setSelectedChapterFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 max-w-[260px] truncate shadow-2xs"
                  >
                    <option value="ALL">-- Tất cả {distinctChapters.length} chương / chủ đề --</option>
                    {distinctChapters.map((chap, i) => (
                      <option key={i} value={chap}>
                        {chap}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Fast Semester Filter */}
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-700">Học kì:</span>
                  <div className="flex p-0.5 bg-white rounded-lg border border-slate-300 shadow-2xs">
                    <button
                      onClick={() => setSelectedSemesterFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        selectedSemesterFilter === 'ALL'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cả năm
                    </button>
                    <button
                      onClick={() => setSelectedSemesterFilter('HK1')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        selectedSemesterFilter === 'HK1'
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      HK1 (T1-18)
                    </button>
                    <button
                      onClick={() => setSelectedSemesterFilter('HK2')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        selectedSemesterFilter === 'HK2'
                          ? 'bg-blue-700 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      HK2 (T19-35)
                    </button>
                  </div>
                </div>

                {/* 3. Quick Tag Chips */}
                <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">Tìm nhanh:</span>
                  {QUICK_SEARCH_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchFilter(tag)}
                      className={`px-2 py-0.5 text-[11px] rounded-full border transition-all ${
                        searchFilter.toLowerCase() === tag.toLowerCase()
                          ? 'bg-emerald-700 text-white border-emerald-800 font-bold'
                          : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Match Counter & Reset Action */}
              <div className="flex items-center justify-between md:justify-end gap-2.5">
                <span className="text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium shadow-2xs">
                  Hiển thị: <strong className="text-emerald-800">{filteredItems.length}</strong> / {currentPlan.items.length} bài học
                </span>

                {hasActiveFilters && (
                  <button
                    onClick={handleClearAllFilters}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    title="Xóa toàn bộ bộ lọc và từ khóa tìm kiếm"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa bộ lọc</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Summary Banner */}
        {currentPlan ? (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="font-bold text-slate-800 text-sm">
              PHÂN PHỐI CHƯƠNG TRÌNH MÔN {currentPlan.subject.toUpperCase()} - LỚP {currentPlan.grade}
              <span className="ml-2 font-normal text-slate-600">({SCHOOL_INFO.name})</span>
            </div>
            <div className="flex flex-wrap gap-4 text-slate-700">
              <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                Cả năm: <strong>35 tuần = {currentPlan.totalPeriods} tiết</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                Học kì I: <strong>18 tuần = {currentPlan.term1Periods} tiết</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                Học kì II: <strong>17 tuần = {currentPlan.term2Periods} tiết</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-900">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">Môn {selectedSubject} - Lớp {selectedGrade} hiện chưa được kích hoạt trong danh sách PPCT đang dùng.</p>
                <p className="text-amber-700 text-[11px] mt-0.5">Bấm nút "Nạp PPCT" bên cạnh hoặc tải tệp PPCT (Word, Excel, PDF) lên để sử dụng.</p>
              </div>
            </div>
            <button
              onClick={handleInitializeStandardPlan}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shrink-0 shadow-xs"
            >
              Nạp ngay PPCT chuẩn
            </button>
          </div>
        )}
      </div>

      {/* Modal: Manage & Delete All PPCT Plans */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Quản Lý Từng Tệp Kế Hoạch PPCT Môn Học</h3>
                  <p className="text-xs text-slate-500">Xem và xóa riêng lẻ từng môn học (ví dụ PPCT môn Toán 8)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onGoHome && (
                  <button
                    onClick={() => {
                      setShowManageModal(false);
                      onGoHome();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Đóng và trở về Trang chủ"
                  >
                    <Home className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Trang chủ</span>
                  </button>
                )}
                <button
                  onClick={() => setShowManageModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Protective notice & Search bar */}
            <div className="space-y-2">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Quy định an toàn dữ liệu: </span>
                  <span>
                    Không cho phép xóa toàn bộ file PPCT của tất cả các môn cùng lúc nhằm bảo vệ dữ liệu giảng dạy toàn trường. Thầy/Cô có thể xóa hoặc nạp đè từng tệp môn học riêng lẻ bên dưới (ví dụ: PPCT môn Toán 8).
                  </span>
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manageSearchTerm}
                  onChange={(e) => setManageSearchTerm(e.target.value)}
                  placeholder="Tìm môn học cần xóa hoặc xem (ví dụ: Toán 8, Văn 9, KHTN...)"
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                {manageSearchTerm && (
                  <button
                    onClick={() => setManageSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {ppctPlans.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Chưa có kế hoạch PPCT nào</p>
                  <p className="text-xs text-slate-400 mt-1">Hãy tải tệp PPCT hoặc khôi phục dữ liệu mẫu chuẩn.</p>
                </div>
              ) : (
                ppctPlans
                  .filter((p) => {
                    if (!manageSearchTerm.trim()) return true;
                    const term = manageSearchTerm.trim().toLowerCase();
                    return (
                      p.subject.toLowerCase().includes(term) ||
                      `lớp ${p.grade}`.includes(term) ||
                      `khối ${p.grade}`.includes(term) ||
                      `${p.subject} ${p.grade}`.toLowerCase().includes(term) ||
                      `${p.subject} lớp ${p.grade}`.toLowerCase().includes(term)
                    );
                  })
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800">
                            Môn {plan.subject} - Lớp {plan.grade}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Khối {plan.grade}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tổng {plan.items.length} bài học • {plan.totalPeriods} tiết cả năm (HK1: {plan.term1Periods}t, HK2: {plan.term2Periods}t) • Năm học {plan.schoolYear}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedGrade(plan.grade);
                            setSelectedSubject(plan.subject);
                            setShowManageModal(false);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg cursor-pointer"
                        >
                          Xem bài học
                        </button>
                        <button
                          onClick={() => handleDeletePlanById(plan.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                          title={`Xóa riêng PPCT môn ${plan.subject} Lớp ${plan.grade}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa tệp môn này</span>
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetDefaultPlans}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục PPCT chuẩn GDPT 2018</span>
                </button>
              </div>

              <button
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Item Modal / Form */}
      {isAddingNew && (
        <div className="bg-white rounded-xl p-5 border-2 border-blue-400 shadow-md animate-in fade-in">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Thêm bài học mới vào môn {currentPlan?.subject} - Lớp {currentPlan?.grade}
            </h3>
            <button
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕ Hủy
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="md:col-span-3">
              <label className="font-semibold text-slate-700 block mb-1">Chương / Chủ đề:</label>
              <input
                type="text"
                value={editChapter}
                onChange={(e) => setEditChapter(e.target.value)}
                placeholder="VD: CHƯƠNG I. PHƯƠNG TRÌNH VÀ HỆ HAI PHƯƠNG TRÌNH..."
                className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase"
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Tên chủ đề / Bài học (*):</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="VD: Bài 1: Khái niệm phương trình và hệ hai phương trình..."
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Số tiết:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={editPeriods}
                onChange={(e) => setEditPeriods(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Thời điểm thực hiện:</label>
              <input
                type="text"
                value={editTimeFrame}
                onChange={(e) => setEditTimeFrame(e.target.value)}
                placeholder="VD: Tuần 1, Tuần 1,2..."
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Thiết bị dạy học:</label>
              <input
                type="text"
                value={editEquipment}
                onChange={(e) => setEditEquipment(e.target.value)}
                placeholder="VD: Thước thẳng, máy chiếu, tranh ảnh..."
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ghi chú / Năng lực số / Phòng học:</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="VD: YCCĐ năng lực số, Phòng máy 1..."
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleAddNewItem}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Lưu bài học
            </button>
          </div>
        </div>
      )}

      {/* Main PPCT Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {!currentPlan ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Chưa có dữ liệu PPCT cho Môn {selectedSubject} - Lớp {selectedGrade}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Bạn có thể nạp ngay kế hoạch mẫu chuẩn của Bộ Giáo dục hoặc tải tệp PPCT từ máy tính.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleInitializeStandardPlan}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 shadow-xs"
              >
                Nạp PPCT Môn {selectedSubject} Lớp {selectedGrade}
              </button>
              <button
                onClick={onOpenUploadModal}
                className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200"
              >
                Tải lên tệp PPCT
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-3 border-r border-slate-200 w-12 text-center">TT</th>
                  <th className="p-3 border-r border-slate-200 min-w-[240px]">
                    Tên chủ đề / Bài học (1)
                  </th>
                  <th className="p-3 border-r border-slate-200 w-16 text-center">
                    Số tiết (2)
                  </th>
                  <th className="p-3 border-r border-slate-200 w-28 text-center">
                    Thời điểm (3)
                  </th>
                  <th className="p-3 border-r border-slate-200 min-w-[180px]">
                    Thiết bị dạy học (4)
                  </th>
                  <th className="p-3 border-r border-slate-200 min-w-[220px]">
                    Liệt kê các YCCĐ / Năng lực số / Ghi chú (5)
                  </th>
                  <th className="p-3 w-20 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Không tìm thấy bài học nào phù hợp với bộ lọc tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => {
                    const isEditing = editingItemId === item.id;
                    const showChapterHeader =
                      item.chapter &&
                      (index === 0 || filteredItems[index - 1]?.chapter !== item.chapter);

                    return (
                      <React.Fragment key={item.id}>
                        {/* Chapter Section Divider */}
                        {showChapterHeader && (
                          <tr className="bg-emerald-50/70 border-y border-emerald-200">
                            <td
                              colSpan={7}
                              className="p-2.5 font-bold text-emerald-950 uppercase tracking-wide text-xs pl-4"
                            >
                              📂 <HighlightText text={item.chapter} query={searchFilter} />
                            </td>
                          </tr>
                        )}

                        <tr className="hover:bg-slate-50/80 transition-colors">
                          {/* Order Number */}
                          <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-200">
                            {item.orderNumber}
                          </td>

                          {/* Lesson Title */}
                          <td className="p-3 border-r border-slate-200 font-medium text-slate-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full p-1 border border-slate-300 rounded text-xs"
                              />
                            ) : (
                              <HighlightText text={item.lessonTitle} query={searchFilter} />
                            )}
                          </td>

                          {/* Period Count */}
                          <td className="p-3 text-center font-bold text-emerald-700 border-r border-slate-200">
                            {isEditing ? (
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={editPeriods}
                                onChange={(e) => setEditPeriods(Number(e.target.value))}
                                className="w-12 p-1 border border-slate-300 rounded text-xs text-center font-bold"
                              />
                            ) : (
                              item.periodCount
                            )}
                          </td>

                          {/* Time Frame */}
                          <td className="p-3 text-center border-r border-slate-200 text-slate-600 font-medium">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editTimeFrame}
                                onChange={(e) => setEditTimeFrame(e.target.value)}
                                className="w-full p-1 border border-slate-300 rounded text-xs text-center"
                              />
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                                <HighlightText text={item.timeFrame} query={searchFilter} />
                              </span>
                            )}
                          </td>

                          {/* Equipment */}
                          <td className="p-3 border-r border-slate-200 text-slate-600">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editEquipment}
                                onChange={(e) => setEditEquipment(e.target.value)}
                                className="w-full p-1 border border-slate-300 rounded text-xs"
                              />
                            ) : item.equipment ? (
                              <HighlightText text={item.equipment} query={searchFilter} />
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* Notes */}
                          <td className="p-3 border-r border-slate-200 text-slate-600 text-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full p-1 border border-slate-300 rounded text-xs"
                              />
                            ) : item.notes ? (
                              <HighlightText text={item.notes} query={searchFilter} />
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  title="Lưu"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingItemId(null)}
                                  className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                                  title="Hủy"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Chỉnh sửa bài học"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Xóa bài học"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

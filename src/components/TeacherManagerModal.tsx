import React, { useState } from 'react';
import { Users, Upload, Download, Plus, Trash2, Edit2, Check, X, Search, GraduationCap, School, FileText, FileSpreadsheet, RotateCcw, AlertTriangle, Save, Home } from 'lucide-react';
import { Teacher } from '../types';
import { exportTeacherListToExcel } from '../utils/excelExporter';
import { exportTeacherListToPdf } from '../utils/pdfExport';
import { SCHOOL_INFO, TEACHERS_LIST } from '../data/mockData';

interface TeacherManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  selectedTeacherShortName: string;
  setSelectedTeacherShortName: (shortName: string) => void;
  onOpenUploadTeacherModal: () => void;
  onSaveTeachers?: () => void;
  onGoHome?: () => void;
}

export const TeacherManagerModal: React.FC<TeacherManagerModalProps> = ({
  isOpen,
  onClose,
  teachers,
  setTeachers,
  selectedTeacherShortName,
  setSelectedTeacherShortName,
  onOpenUploadTeacherModal,
  onSaveTeachers,
  onGoHome,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [savedRecently, setSavedRecently] = useState(false);

  // Form states for adding / editing
  const [editName, setEditName] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDept, setNewDept] = useState('Tổ Tự Nhiên (Toán - Tin - KHTN)');
  const [newEmail, setNewEmail] = useState('');

  // Confirmation modal for clearing all teachers
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  if (!isOpen) return null;

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartEdit = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setEditName(t.name);
    setEditShortName(t.shortName);
    setEditSubject(t.subject);
    setEditDept(t.department);
    setEditEmail(t.email || '');
  };

  const handleSaveEdit = (teacherId: string) => {
    if (!editName.trim()) return;
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? {
              ...t,
              name: editName.trim(),
              shortName: editShortName.trim() || editName.trim().split(' ').pop() || '',
              subject: editSubject.trim(),
              department: editDept.trim(),
              email: editEmail.trim() || undefined,
            }
          : t
      )
    );
    setEditingTeacherId(null);
  };

  const handleDeleteTeacher = (teacherId: string, shortName: string) => {
    const remaining = teachers.filter((t) => t.id !== teacherId);
    setTeachers(remaining);
    if (selectedTeacherShortName === shortName) {
      if (remaining.length > 0) {
        setSelectedTeacherShortName(remaining[0].shortName);
      } else {
        setSelectedTeacherShortName('');
      }
    }
  };

  // Clear all teachers
  const handleConfirmClearAll = () => {
    setTeachers([]);
    setSelectedTeacherShortName('');
    setIsConfirmClearOpen(false);
  };

  // Restore sample teachers
  const handleRestoreSample = () => {
    setTeachers(TEACHERS_LIST);
    if (TEACHERS_LIST.length > 0) {
      setSelectedTeacherShortName(TEACHERS_LIST[0].shortName);
    }
    setIsConfirmClearOpen(false);
  };

  const handleAddNewTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const calcShortName = newShortName.trim() || newName.trim().split(' ').pop() || 'GV';
    const newTeacher: Teacher = {
      id: `teacher-${Date.now()}`,
      name: newName.trim(),
      shortName: calcShortName,
      subject: newSubject.trim() || 'Toán',
      department: newDept.trim() || 'Tổ Tự Nhiên',
      email: newEmail.trim() || undefined,
    };

    setTeachers((prev) => [...prev, newTeacher]);
    setSelectedTeacherShortName(newTeacher.shortName);
    setIsAddingNew(false);
    setNewName('');
    setNewShortName('');
    setNewSubject('');
    setNewEmail('');
  };

  const handleExportExcel = () => {
    exportTeacherListToExcel(teachers, SCHOOL_INFO.name);
  };

  const handleExportPdf = () => {
    exportTeacherListToPdf(teachers, SCHOOL_INFO.name, SCHOOL_INFO.campus, SCHOOL_INFO.schoolYear);
  };

  const handleSaveTeachersClick = () => {
    if (onSaveTeachers) {
      onSaveTeachers();
    } else {
      try {
        localStorage.setItem('baogiang_teachers_v2', JSON.stringify(teachers));
      } catch (e) {
        console.warn('Error saving teachers', e);
      }
    }
    setSavedRecently(true);
    setTimeout(() => setSavedRecently(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-white/10 border border-white/20 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold truncate">Quản Lý Danh Sách Giáo Viên</h3>
              <p className="text-[11px] sm:text-xs text-blue-200 truncate">
                {SCHOOL_INFO.name} • Tổng số: {teachers.length} cán bộ giáo viên
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Return to Home button */}
            {onGoHome && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoHome();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95 cursor-pointer border border-white/20"
                title="Đóng bảng và trở về Trang chủ (Phiếu Báo Giảng)"
              >
                <Home className="w-3.5 h-3.5 text-amber-300" />
                <span>Trang chủ</span>
              </button>
            )}

            {/* Header Save Button for instant access */}
            <button
              onClick={handleSaveTeachersClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 ${
                savedRecently
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
              title="Lưu danh sách giáo viên này vào bộ nhớ hệ thống"
            >
              {savedRecently ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã lưu ✓</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu danh sách</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm theo họ tên, ký hiệu TKB, môn dạy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Upload Button (Word, Excel, PDF) */}
            <button
              onClick={() => {
                onClose();
                onOpenUploadTeacherModal();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
              title="Tải tệp Word, Excel, PDF danh sách giáo viên lên hệ thống"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>Tải file lên (Word, Excel, PDF)</span>
            </button>

            {/* Save Teacher List Button */}
            <button
              onClick={handleSaveTeachersClick}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 ${
                savedRecently
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
              title="Lưu danh sách giáo viên này vào bộ nhớ hệ thống"
            >
              {savedRecently ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Đã lưu ✓</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-200" />
                  <span>Lưu danh sách ({teachers.length})</span>
                </>
              )}
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              disabled={teachers.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-xs transition-all"
              title="Tải danh sách giáo viên về file Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Xuất Excel</span>
            </button>

            {/* Export PDF */}
            <button
              id="btn-export-teacher-pdf"
              onClick={handleExportPdf}
              disabled={teachers.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="In hoặc Xuất danh sách phân công chuyên môn ra file PDF chuẩn A4"
            >
              <FileText className="w-4 h-4 text-rose-200" />
              <span>Xuất PDF / In</span>
            </button>

            {/* Add New Teacher toggle */}
            <button
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm giáo viên</span>
            </button>

            {/* Nút Xóa danh sách giáo viên */}
            {teachers.length > 0 ? (
              <button
                onClick={() => setIsConfirmClearOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                title="Xóa toàn bộ danh sách giáo viên hiện tại để nhập lại hoặc tải tệp mới"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa danh sách ({teachers.length})</span>
              </button>
            ) : (
              <button
                onClick={handleRestoreSample}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-all"
                title="Khôi phục lại danh sách giáo viên mẫu ban đầu (THCS Đồng Phú)"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Khôi phục DS mẫu</span>
              </button>
            )}
          </div>
        </div>

        {/* Add Teacher Form */}
        {isAddingNew && (
          <form
            onSubmit={handleAddNewTeacher}
            className="p-4 bg-blue-50/70 border-b border-blue-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 shrink-0 animate-in slide-in-from-top-3"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Họ và tên (*):</label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn Nam"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newShortName) {
                    const last = e.target.value.trim().split(' ').pop();
                    if (last) setNewShortName(last);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Ký hiệu TKB (Tên gọi) (*):</label>
              <input
                type="text"
                required
                placeholder="VD: Nam"
                value={newShortName}
                onChange={(e) => setNewShortName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Môn dạy / Phân công:</label>
              <input
                type="text"
                placeholder="VD: Toán 6, Toán 7"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tổ chuyên môn:</label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800"
              >
                <option value="Tổ Tự Nhiên (Toán - Tin - KHTN)">Tổ Tự Nhiên</option>
                <option value="Tổ Xã Hội (Văn - Sử - Địa - GDCD)">Tổ Xã Hội</option>
                <option value="Tổ Ngoại Ngữ">Tổ Ngoại Ngữ</option>
                <option value="Tổ Nghệ Thuật - Năng Khiếu">Tổ Nghệ Thuật - Năng Khiếu</option>
                <option value="Ban Giám Hiệu">Ban Giám Hiệu</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Lưu giáo viên
              </button>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium"
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        {/* Teacher Table */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
          <table className="w-full text-xs text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-center sticky top-0 z-10 shadow-2xs">
                <th className="p-2.5 border border-slate-200 w-10">STT</th>
                <th className="p-2.5 border border-slate-200 min-w-[160px] text-left">Họ và tên</th>
                <th className="p-2.5 border border-slate-200 w-28">Ký hiệu TKB</th>
                <th className="p-2.5 border border-slate-200 min-w-[140px] text-left">Môn giảng dạy</th>
                <th className="p-2.5 border border-slate-200 min-w-[160px] text-left">Tổ chuyên môn</th>
                <th className="p-2.5 border border-slate-200 w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center bg-slate-50/50">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Danh sách giáo viên hiện đang trống</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Thầy/Cô đã xóa danh sách giáo viên. Thầy/Cô có thể tải lên tệp danh sách mới (Word .doc/.docx, Excel .xlsx, PDF), thêm giáo viên thủ công hoặc khôi phục danh sách mẫu bất kỳ lúc nào.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => {
                            onClose();
                            onOpenUploadTeacherModal();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-300" />
                          <span>Tải file lên (Word, Excel, PDF)</span>
                        </button>
                        <button
                          onClick={() => setIsAddingNew(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm thủ công</span>
                        </button>
                        <button
                          onClick={handleRestoreSample}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Khôi phục DS mẫu</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Không tìm thấy giáo viên nào khớp với từ khóa "{searchTerm}". Vui lòng thử từ khóa khác.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => {
                  const isEditing = editingTeacherId === teacher.id;
                  const isSelected = selectedTeacherShortName === teacher.shortName;

                  return (
                    <tr
                      key={teacher.id}
                      className={`${
                        isSelected
                          ? 'bg-blue-50/80 font-medium'
                          : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50/50'
                      } hover:bg-blue-50/40 transition-colors`}
                    >
                      {/* STT */}
                      <td className="p-2 text-center text-slate-500 border border-slate-200 font-mono">
                        {idx + 1}
                      </td>

                      {/* Full Name */}
                      <td className="p-2 border border-slate-200">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-1 border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{teacher.name}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-600 text-white font-semibold">
                                Đang chọn
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Short Name (Ký hiệu TKB) */}
                      <td className="p-2 text-center border border-slate-200">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editShortName}
                            onChange={(e) => setEditShortName(e.target.value)}
                            className="w-full p-1 border border-slate-300 rounded text-xs text-center font-bold text-blue-900"
                          />
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold font-mono">
                            {teacher.shortName}
                          </span>
                        )}
                      </td>

                      {/* Subject */}
                      <td className="p-2 border border-slate-200">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="w-full p-1 border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          <span className="text-slate-700">{teacher.subject}</span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="p-2 border border-slate-200">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDept}
                            onChange={(e) => setEditDept(e.target.value)}
                            className="w-full p-1 border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          <span className="text-slate-600 text-[11px]">{teacher.department}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-1.5 text-center border border-slate-200">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(teacher.id)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                              title="Lưu thay đổi"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingTeacherId(null)}
                              className="p-1 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedTeacherShortName(teacher.shortName);
                              }}
                              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 hover:bg-blue-100 text-blue-700'
                              }`}
                              title="Chọn giáo viên này để xem TKB và Phiếu báo giảng"
                            >
                              {isSelected ? 'Đang chọn' : 'Chọn'}
                            </button>

                            <button
                              onClick={() => handleStartEdit(teacher)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteTeacher(teacher.id, teacher.shortName)}
                              className="p-1 text-rose-600 hover:bg-rose-100 rounded"
                              title="Xóa giáo viên này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hệ thống quản lý {teachers.length} giáo viên</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveTeachersClick}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 ${
                savedRecently
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {savedRecently ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Đã lưu thành công ✓</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-200" />
                  <span>Lưu danh sách giáo viên</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Hoàn tất & Đóng
            </button>
          </div>
        </div>

        {/* Modal Xác nhận Xóa Danh Sách Giáo Viên */}
        {isConfirmClearOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Xác nhận xóa danh sách giáo viên?
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Thầy/Cô đang yêu cầu xóa toàn bộ danh sách gồm <strong className="text-rose-600">{teachers.length} giáo viên</strong>.
                  Sau khi xóa, Thầy/Cô có thể tải lên tệp mới (Word, Excel, PDF) hoặc thêm thủ công. Thầy/Cô cũng có thể khôi phục lại danh sách mẫu bất cứ lúc nào.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmClearOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleRestoreSample}
                  className="w-full sm:w-auto px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold transition-colors"
                >
                  Khôi phục DS mẫu
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Xác nhận xóa sạch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Users,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  School,
  FileSpreadsheet,
  RotateCcw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Teacher } from '../types';
import { exportTeacherListToExcel, downloadSampleTeacherListExcel } from '../utils/excelExporter';
import { TEACHERS_LIST } from '../data/mockData';

interface TeacherListModuleProps {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  selectedTeacherShortName: string;
  setSelectedTeacherShortName: (shortName: string) => void;
  onOpenUploadModal: () => void;
  onGoToTimetable?: () => void;
}

export const TeacherListModule: React.FC<TeacherListModuleProps> = ({
  teachers,
  setTeachers,
  selectedTeacherShortName,
  setSelectedTeacherShortName,
  onOpenUploadModal,
  onGoToTimetable,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Form states for adding / editing (Essential fields only: Name, ShortName, Subject, Department)
  const [editName, setEditName] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDept, setEditDept] = useState('');

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDept, setNewDept] = useState('Tổ Tự Nhiên');

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

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
  };

  const handleSaveEdit = (teacherId: string) => {
    if (!editName.trim()) return;
    const finalShortName = editShortName.trim() || editName.trim().split(' ').pop() || '';
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? {
              ...t,
              name: editName.trim(),
              shortName: finalShortName,
              subject: editSubject.trim(),
              department: editDept.trim(),
            }
          : t
      )
    );
    setEditingTeacherId(null);
    showToast(`Đã cập nhật giáo viên "${editName.trim()}"`);
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
    showToast('Đã xóa giáo viên khỏi danh sách');
  };

  const handleAddNewTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const shortNameValue = newShortName.trim() || newName.trim().split(' ').pop() || '';
    const newTeacher: Teacher = {
      id: `t_${Date.now()}`,
      name: newName.trim(),
      shortName: shortNameValue,
      subject: newSubject.trim() || 'Chưa phân công',
      department: newDept.trim() || 'Tổ Tự Nhiên',
    };

    setTeachers((prev) => [...prev, newTeacher]);
    if (!selectedTeacherShortName) {
      setSelectedTeacherShortName(newTeacher.shortName);
    }

    setNewName('');
    setNewShortName('');
    setNewSubject('');
    setIsAddingNew(false);
    showToast(`Đã thêm giáo viên "${newTeacher.name}"`);
  };

  const handleRestoreDefault = () => {
    setTeachers(TEACHERS_LIST);
    if (TEACHERS_LIST.length > 0) {
      setSelectedTeacherShortName(TEACHERS_LIST[0].shortName);
    }
    showToast('Đã nạp 34 giáo viên chuẩn trường THCS Đồng Phú');
  };

  const handleClearAll = () => {
    if (window.confirm('Thầy/Cô có chắc chắn muốn xóa toàn bộ danh sách giáo viên hiện tại không?')) {
      setTeachers([]);
      setSelectedTeacherShortName('');
      showToast('Đã làm trống danh sách giáo viên');
    }
  };

  return (
    <div id="module-teacher-list" className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Module Header & High-level actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Modul Đưa Danh Sách Giáo Viên
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý hồ sơ cán bộ giáo viên, ký hiệu TKB để tự động ghép nối Thời khóa biểu & Lịch báo giảng
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-upload-teachers-top"
            onClick={onOpenUploadModal}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Tải tệp danh sách (Excel, Word, PDF)</span>
          </button>

          <button
            onClick={downloadSampleTeacherListExcel}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
            title="Tải tệp Excel mẫu danh sách giáo viên chuẩn"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tải file Excel mẫu</span>
          </button>

          <button
            onClick={handleRestoreDefault}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            title="Nạp nhanh 34 giáo viên mẫu trường THCS Đồng Phú"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span>Nạp DS mẫu (34 GV)</span>
          </button>

          <button
            onClick={() => exportTeacherListToExcel(teachers)}
            disabled={teachers.length === 0}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Xuất danh sách ra file Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Quick Add Teacher Form */}
      {isAddingNew && (
        <form
          onSubmit={handleAddNewTeacher}
          className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-700" />
              Thêm mới cán bộ giáo viên
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Thị Thắm"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newShortName) {
                    setNewShortName(e.target.value.trim().split(' ').pop() || '');
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ký hiệu TKB <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Thắm"
                value={newShortName}
                onChange={(e) => setNewShortName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Môn giảng dạy
              </label>
              <input
                type="text"
                placeholder="VD: Toán"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tổ chuyên môn
              </label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="Tổ Tự Nhiên">Tổ Tự Nhiên</option>
                <option value="Tổ Xã Hội">Tổ Xã Hội</option>
                <option value="Tổ Ngoại Ngữ - Nghệ Thuật">Tổ Ngoại Ngữ - Nghệ Thuật</option>
                <option value="Tổ Hành Chính - Khác">Tổ Hành Chính - Khác</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-1.5 text-xs font-bold rounded-lg shadow-xs"
            >
              Lưu giáo viên
            </button>
          </div>
        </form>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, ký hiệu, môn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-600 font-semibold">
              Tổng số: <strong className="text-blue-700 font-bold">{filteredTeachers.length}</strong> giáo viên
            </span>

            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-1 bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm giáo viên</span>
            </button>

            {teachers.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
                title="Xóa toàn bộ giáo viên"
              >
                Xóa tất cả
              </button>
            )}
          </div>
        </div>

        {/* Teacher Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Họ và tên giáo viên</th>
                <th className="py-3 px-4 w-32 text-center">Ký hiệu TKB</th>
                <th className="py-3 px-4">Môn giảng dạy</th>
                <th className="py-3 px-4">Tổ chuyên môn</th>
                <th className="py-3 px-4 w-28 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-700">Chưa có dữ liệu giáo viên</p>
                      <p className="text-xs text-slate-500">
                        Thầy/Cô vui lòng tải tệp danh sách giáo viên (Excel, Word, PDF) hoặc nhấn nút "Nạp DS mẫu (34 GV)" để bắt đầu.
                      </p>
                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          onClick={onOpenUploadModal}
                          className="bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-800"
                        >
                          Tải tệp danh sách ngay
                        </button>
                        <button
                          onClick={handleRestoreDefault}
                          className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200"
                        >
                          Nạp 34 GV mẫu
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => {
                  const isEditing = editingTeacherId === t.id;
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        selectedTeacherShortName === t.shortName ? 'bg-blue-50/60 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center text-slate-400 text-xs">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-white border border-blue-400 rounded px-2 py-1 text-sm focus:outline-hidden"
                          />
                        ) : (
                          <span>{t.name}</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editShortName}
                            onChange={(e) => setEditShortName(e.target.value)}
                            className="w-24 mx-auto bg-white border border-blue-400 rounded px-2 py-1 text-sm font-bold text-center focus:outline-hidden"
                          />
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-xs">
                            {t.shortName}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="w-full bg-white border border-blue-400 rounded px-2 py-1 text-sm focus:outline-hidden"
                          />
                        ) : (
                          <span>{t.subject || 'Chưa xếp môn'}</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 text-xs">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDept}
                            onChange={(e) => setEditDept(e.target.value)}
                            className="w-full bg-white border border-blue-400 rounded px-2 py-1 text-xs focus:outline-hidden"
                          />
                        ) : (
                          <span>{t.department}</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(t.id)}
                              className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              title="Lưu thay đổi"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingTeacherId(null)}
                              className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleStartEdit(t)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeacher(t.id, t.shortName)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Xóa giáo viên"
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

        {/* Footer info bar */}
        {teachers.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              💡 <em>Ký hiệu TKB</em> phải trùng khớp với tên giáo viên trong bảng Thời khóa biểu để hệ thống tự động gán lịch dạy.
            </span>
            {onGoToTimetable && (
              <button
                onClick={onGoToTimetable}
                className="text-blue-700 font-bold hover:underline cursor-pointer"
              >
                Chuyển sang "Modul Tải thời khóa biểu" →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

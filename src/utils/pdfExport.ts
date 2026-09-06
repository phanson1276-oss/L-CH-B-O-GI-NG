import { LessonReportRow, WeeklyReportConfig, TimetableData, Teacher, TimetableSlot } from '../types';
import { computeReportRowSpans } from './generator';

/**
 * Universal print/save window opener.
 * Falls back to an invisible iframe if popups are blocked.
 */
export function openHtmlPrintWindow(printableHtml: string, title: string = 'In ấn / Xuất PDF') {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();
  } else {
    // Fallback: create invisible iframe in current window
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (doc) {
      doc.open();
      doc.write(printableHtml);
      doc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printFrame), 2500);
      }, 500);
    }
  }
}

/**
 * Export Weekly Lesson Report (Phiếu báo giảng) to PDF / Print Window
 */
export function exportLessonReportToPdf(rows: LessonReportRow[], config: WeeklyReportConfig) {
  const rowSpans = computeReportRowSpans(rows);

  const tableRowsHtml = rows
    .map((r, idx) => {
      const span = rowSpans[idx] || { dayRowSpan: 1, sessionRowSpan: 1 };
      const dayCell =
        span.dayRowSpan > 0
          ? `<td rowspan="${span.dayRowSpan}" style="text-align: center; font-weight: bold; border: 1px solid #1e293b; padding: 6px 4px; vertical-align: middle; background-color: #f8fafc;">${r.dayName}</td>
      <td rowspan="${span.dayRowSpan}" style="text-align: center; border: 1px solid #1e293b; padding: 6px 4px; vertical-align: middle; background-color: #f8fafc;">${r.dateString}</td>`
          : '';
      const sessionCell =
        span.sessionRowSpan > 0
          ? `<td rowspan="${span.sessionRowSpan}" style="text-align: center; border: 1px solid #1e293b; padding: 6px 4px; vertical-align: middle; background-color: #f8fafc; font-weight: 500;">${
              r.session === 'morning' ? 'Sáng' : 'Chiều'
            }</td>`
          : '';

      return `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#fcfcfd'};">
      ${dayCell}
      ${sessionCell}
      <td style="text-align: center; font-weight: bold; border: 1px solid #1e293b; padding: 6px 4px;">${r.periodTKB}</td>
      <td style="text-align: center; border: 1px solid #1e293b; padding: 6px 4px;">${r.subject}</td>
      <td style="text-align: center; font-weight: bold; border: 1px solid #1e293b; padding: 6px 4px;">${r.className}</td>
      <td style="text-align: center; font-weight: bold; border: 1px solid #1e293b; padding: 6px 4px;">${r.ppctPeriodNumber}</td>
      <td style="text-align: left; border: 1px solid #1e293b; padding: 6px 8px; font-weight: 500;">${r.lessonName}</td>
      <td style="text-align: left; border: 1px solid #1e293b; padding: 6px 8px;">${r.equipment || ''}</td>
      <td style="text-align: left; border: 1px solid #1e293b; padding: 6px 8px;">${r.notes || ''}</td>
    </tr>
  `;
    })
    .join('');

  const printableHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Phiếu Báo Giảng - Tuần ${config.weekNumber} - ${config.teacherName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 15px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .header-table td {
      border: none;
      vertical-align: top;
      padding: 0;
    }
    .school-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
    }
    .school-sub {
      font-size: 11pt;
      font-weight: bold;
      margin: 2px 0 0 0;
      text-decoration: underline;
    }
    .nation-title {
      font-size: 11.5pt;
      font-weight: bold;
      margin: 0;
    }
    .motto {
      font-size: 11pt;
      font-weight: bold;
      margin: 2px 0 0 0;
      text-decoration: underline;
    }
    .main-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 14px;
      margin-bottom: 3px;
      letter-spacing: 0.5px;
    }
    .subtitle {
      text-align: center;
      font-size: 11pt;
      font-style: italic;
      margin-bottom: 10px;
    }
    .info-bar {
      margin-bottom: 12px;
      font-size: 11pt;
      padding: 6px 10px;
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }
    .data-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: bold;
      text-align: center;
      border: 1px solid #1e293b;
      padding: 7px 4px;
      font-size: 11pt;
    }
    .signature-container {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .signature-container td {
      border: none;
      vertical-align: top;
      text-align: center;
      padding: 0 10px;
    }
    .sig-title {
      font-weight: bold;
      font-size: 11pt;
      text-transform: uppercase;
    }
    .sig-note {
      font-style: italic;
      font-size: 10pt;
      margin-top: 2px;
    }
    .sig-space {
      height: 65px;
    }
    .sig-name {
      font-weight: bold;
      font-size: 11pt;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; padding: 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 13px; color: #1e40af; font-weight: bold;">
      📄 Chế độ chuẩn bị in / Xuất PDF Phiếu báo giảng Tuần ${config.weekNumber} (${config.teacherName})
    </span>
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
      🖨️ In hoặc Lưu file PDF (Ctrl + P)
    </button>
  </div>

  <table class="header-table">
    <tr>
      <td style="width: 45%; text-align: center;">
        <p class="school-title">UBND PHƯỜNG ĐỒNG HỚI</p>
        <p class="school-sub">${config.schoolName}</p>
      </td>
      <td style="width: 55%; text-align: center;">
        <p class="nation-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
        <p class="motto">Độc lập - Tự do - Hạnh phúc</p>
      </td>
    </tr>
  </table>

  <div class="main-title">LỊCH BÁO GIẢNG - TUẦN ${config.weekNumber}</div>
  <div class="subtitle">(Thực hiện từ ngày ${config.startDate} đến ngày ${config.endDate})</div>

  <div class="info-bar">
    <b>Họ và tên giáo viên:</b> ${config.teacherName} &nbsp;&nbsp;•&nbsp;&nbsp; 
    <b>Tổ chuyên môn:</b> ${config.department} &nbsp;&nbsp;•&nbsp;&nbsp; 
    <b>Môn dạy:</b> ${config.subject} &nbsp;&nbsp;•&nbsp;&nbsp; 
    <b>Năm học:</b> ${config.schoolYear}
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 6%;">Thứ</th>
        <th style="width: 8%;">Ngày</th>
        <th style="width: 5%;">Buổi</th>
        <th style="width: 5%;">Tiết TKB</th>
        <th style="width: 8%;">Môn</th>
        <th style="width: 6%;">Lớp</th>
        <th style="width: 7%;">Tiết PPCT</th>
        <th style="width: 27%;">Tên bài dạy</th>
        <th style="width: 15%;">Thiết bị dạy học</th>
        <th style="width: 13%;">Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <table class="signature-container">
    <tr>
      <td style="width: 33%;">
        <div class="sig-title">DUYỆT CỦA BGH</div>
        <div class="sig-note">(Ký và đóng dấu)</div>
        <div class="sig-space"></div>
      </td>
      <td style="width: 33%;">
        <div class="sig-title">TỔ TRƯỞNG CHUYÊN MÔN</div>
        <div class="sig-note">(Ký và ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </td>
      <td style="width: 34%;">
        <div class="sig-note">Đồng Hới, ngày ... tháng ... năm 202...</div>
        <div class="sig-title" style="margin-top: 2px;">GIÁO VIÊN GIẢNG DẠY</div>
        <div class="sig-note">(Ký và ghi rõ họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-name">${config.teacherName}</div>
      </td>
    </tr>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
  `;

  openHtmlPrintWindow(printableHtml, `Phieu-Bao-Giang-Tuan-${config.weekNumber}-${config.teacherName}`);
}

export interface TimetablePdfOptions {
  schoolName?: string;
  campus?: string;
  schoolYear?: string;
  effectiveDate?: string;
  effectiveFromWeek?: number;
  classes?: string[];
  filterTeacher?: string; // Tên TKB của giáo viên (VD: T.Sơn, C.Thắm)
  filterTeacherName?: string; // Họ tên đầy đủ GV
  filterClass?: string;   // Lớp (VD: 9⁸-A1)
}

/**
 * Export Timetable (Thời khóa biểu) to PDF / Print Window
 * Supports:
 * - Master Matrix Timetable (Landscape A4, full classes of the school)
 * - Individual Teacher Timetable (Portrait/Landscape A4)
 * - Class Timetable (Portrait/Landscape A4)
 */
export function exportTimetableToPdf(
  timetable: TimetableData,
  options: TimetablePdfOptions = {}
) {
  const schoolName = options.schoolName || timetable.schoolName || 'TRƯỜNG THCS ĐỒNG PHÚ';
  const campus = options.campus || 'PHÂN HIỆU HẢI THÀNH';
  const schoolYear = options.schoolYear || timetable.schoolYear || '2026 - 2027';
  const effectiveDate = options.effectiveDate || timetable.effectiveDate || '07/09/2026';
  const effectiveWeek = options.effectiveFromWeek || timetable.effectiveFromWeek || 1;

  const dayNames: { [key: number]: string } = {
    2: 'Thứ Hai',
    3: 'Thứ Ba',
    4: 'Thứ Tư',
    5: 'Thứ Năm',
    6: 'Thứ Sáu',
    7: 'Thứ Bảy',
  };

  // Determine list of classes
  const allClasses = options.classes && options.classes.length > 0
    ? options.classes
    : Array.from(new Set(timetable.slots.map((s) => s.className))).sort();

  // 1. TEACHER PERSONAL TIMETABLE
  if (options.filterTeacher) {
    const teacherShort = options.filterTeacher;
    const teacherFullName = options.filterTeacherName || teacherShort;
    const teacherSlots = timetable.slots.filter(
      (s) => s.teacherShortName.trim().toLowerCase() === teacherShort.trim().toLowerCase()
    );

    // Build teacher schedule matrix (Thứ 2 - Thứ 6 x Tiết 1 - 5)
    let teacherRowsHtml = '';
    [2, 3, 4, 5, 6].forEach((day) => {
      ['morning', 'afternoon'].forEach((session) => {
        const sessionLabel = session === 'morning' ? 'Sáng' : 'Chiều';
        const periods = session === 'morning' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
        
        periods.forEach((p, pIdx) => {
          const slot = teacherSlots.find(
            (s) => s.dayOfWeek === day && s.session === session && s.period === p
          );

          const dayCell =
            session === 'morning' && pIdx === 0
              ? `<td rowspan="9" style="text-align: center; font-weight: bold; border: 1px solid #1e293b; vertical-align: middle; background: #f8fafc; font-size: 11pt;">${dayNames[day]}</td>`
              : '';

          const sessionCell =
            pIdx === 0
              ? `<td rowspan="${periods.length}" style="text-align: center; font-weight: bold; border: 1px solid #1e293b; vertical-align: middle; background: #f1f5f9; font-size: 10pt;">${sessionLabel}</td>`
              : '';

          const content = slot
            ? `<b style="color: #1e3a8a;">${slot.subject}</b> - Lớp: <b>${slot.className}</b>`
            : '<span style="color: #94a3b8;">-</span>';

          teacherRowsHtml += `
            <tr>
              ${dayCell}
              ${sessionCell}
              <td style="text-align: center; font-weight: bold; border: 1px solid #1e293b; padding: 6px 4px;">Tiết ${p}</td>
              <td style="text-align: center; border: 1px solid #1e293b; padding: 6px 10px;">${content}</td>
            </tr>
          `;
        });
      });
    });

    const printableHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Thời khóa biểu cá nhân - ${teacherFullName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #0f172a; margin: 0; padding: 10px; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .header-table td { border: none; vertical-align: top; }
    .main-title { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 14px 0 2px 0; }
    .sub-title { text-align: center; font-size: 11pt; font-style: italic; margin-bottom: 12px; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .data-table th { background: #f1f5f9; border: 1px solid #1e293b; padding: 8px 6px; font-size: 11pt; font-weight: bold; }
    .sig-table { width: 100%; border-collapse: collapse; margin-top: 25px; page-break-inside: avoid; }
    .sig-table td { border: none; vertical-align: top; text-align: center; width: 50%; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; padding: 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 13px; color: #1e40af; font-weight: bold;">
      📄 In / Xuất PDF Thời khóa biểu cá nhân: ${teacherFullName} (${teacherSlots.length} tiết/tuần)
    </span>
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
      🖨️ In hoặc Lưu file PDF (Ctrl + P)
    </button>
  </div>

  <table class="header-table">
    <tr>
      <td style="width: 45%; text-align: center;">
        <div style="font-weight: bold; text-transform: uppercase;">UBND PHƯỜNG ĐỒNG HỚI</div>
        <div style="font-weight: bold; text-decoration: underline;">${schoolName.toUpperCase()}</div>
        ${campus ? `<div style="font-size: 10pt; font-weight: bold; color: #047857;">${campus.toUpperCase()}</div>` : ''}
      </td>
      <td style="width: 55%; text-align: center;">
        <div style="font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
      </td>
    </tr>
  </table>

  <div class="main-title">THỜI KHÓA BIỂU CÁ NHÂN</div>
  <div class="sub-title">Áp dụng từ Tuần ${effectiveWeek} (Ngày ${effectiveDate}) • Năm học: ${schoolYear}</div>

  <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; margin-bottom: 12px; font-size: 11pt;">
    <b>Giáo viên:</b> ${teacherFullName} &nbsp;&nbsp;•&nbsp;&nbsp;
    <b>Ký hiệu trên TKB:</b> <span style="color: #1d4ed8; font-weight: bold;">${teacherShort}</span> &nbsp;&nbsp;•&nbsp;&nbsp;
    <b>Tổng số tiết giảng dạy:</b> <b>${teacherSlots.length}</b> tiết/tuần
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 18%;">Thứ</th>
        <th style="width: 14%;">Buổi</th>
        <th style="width: 14%;">Tiết</th>
        <th>Môn giảng dạy & Lớp</th>
      </tr>
    </thead>
    <tbody>
      ${teacherRowsHtml}
    </tbody>
  </table>

  <table class="sig-table">
    <tr>
      <td>
        <div style="font-weight: bold; text-transform: uppercase;">DUYỆT CỦA BAN GIÁM HIỆU</div>
        <div style="font-style: italic; font-size: 10pt; margin-top: 2px;">(Ký và đóng dấu)</div>
        <div style="height: 65px;"></div>
      </td>
      <td>
        <div style="font-style: italic; font-size: 10pt;">Đồng Hới, ngày ... tháng ... năm 202...</div>
        <div style="font-weight: bold; text-transform: uppercase; margin-top: 2px;">GIÁO VIÊN</div>
        <div style="font-style: italic; font-size: 10pt;">(Ký và ghi rõ họ tên)</div>
        <div style="height: 65px;"></div>
        <div style="font-weight: bold;">${teacherFullName}</div>
      </td>
    </tr>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
    `;

    openHtmlPrintWindow(printableHtml, `TKB-${teacherShort}`);
    return;
  }

  // 2. MASTER MATRIX TIMETABLE (ALL CLASSES) - LANDSCAPE A4
  const classHeadersHtml = allClasses
    .map((c) => `<th style="border: 1px solid #1e293b; padding: 6px 3px; font-size: 10pt; background: #e2e8f0; text-align: center;">${c}</th>`)
    .join('');

  let matrixRowsHtml = '';

  [2, 3, 4, 5, 6].forEach((day) => {
    ['morning', 'afternoon'].forEach((session) => {
      const sessionLabel = session === 'morning' ? 'Sáng' : 'Chiều';
      const periods = session === 'morning' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];

      periods.forEach((p, pIdx) => {
        const dayCell =
          session === 'morning' && pIdx === 0
            ? `<td rowspan="9" style="text-align: center; font-weight: bold; border: 1px solid #1e293b; vertical-align: middle; background: #f8fafc; font-size: 11pt;">${dayNames[day]}</td>`
            : '';

        const sessionCell =
          pIdx === 0
            ? `<td rowspan="${periods.length}" style="text-align: center; font-weight: bold; border: 1px solid #1e293b; vertical-align: middle; background: #f1f5f9; font-size: 9.5pt;">${sessionLabel}</td>`
            : '';

        // Class columns
        const classCells = allClasses
          .map((cName) => {
            const slot = timetable.slots.find(
              (s) => s.dayOfWeek === day && s.session === session && s.period === p && s.className === cName
            );

            if (!slot) {
              return `<td style="border: 1px solid #1e293b; text-align: center; color: #cbd5e1; font-size: 9pt;">-</td>`;
            }

            return `
              <td style="border: 1px solid #1e293b; text-align: center; padding: 4px 2px; line-height: 1.2;">
                <div style="font-weight: bold; font-size: 9.5pt; color: #0f172a;">${slot.subject}</div>
                <div style="font-size: 8.5pt; color: #1d4ed8; font-weight: 600;">(${slot.teacherShortName})</div>
              </td>
            `;
          })
          .join('');

        matrixRowsHtml += `
          <tr style="background-color: ${pIdx % 2 === 0 ? '#ffffff' : '#fcfcfd'};">
            ${dayCell}
            ${sessionCell}
            <td style="text-align: center; font-weight: bold; border: 1px solid #1e293b; padding: 4px; font-size: 10pt; background: #f8fafc;">${p}</td>
            ${classCells}
          </tr>
        `;
      });
    });
  });

  const printableHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Thời khóa biểu toàn trường - ${schoolName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 10pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 10px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .header-table td {
      border: none;
      vertical-align: top;
      padding: 0;
    }
    .main-title {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 6px;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .subtitle {
      text-align: center;
      font-size: 10.5pt;
      font-style: italic;
      margin-bottom: 8px;
    }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .matrix-table th {
      background-color: #e2e8f0;
      font-weight: bold;
      border: 1px solid #1e293b;
      padding: 5px 2px;
      text-align: center;
    }
    .signature-container {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      page-break-inside: avoid;
    }
    .signature-container td {
      border: none;
      vertical-align: top;
      text-align: center;
      padding: 0 10px;
    }
    .sig-title {
      font-weight: bold;
      font-size: 10.5pt;
      text-transform: uppercase;
    }
    .sig-note {
      font-style: italic;
      font-size: 9.5pt;
      margin-top: 2px;
    }
    .sig-space {
      height: 55px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px; padding: 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 13px; color: #1e40af; font-weight: bold;">
      📄 In / Xuất PDF Thời khóa biểu toàn trường (${allClasses.length} lớp • ${timetable.slots.length} tiết)
    </span>
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
      🖨️ In hoặc Lưu file PDF (Ctrl + P)
    </button>
  </div>

  <table class="header-table">
    <tr>
      <td style="width: 45%; text-align: center;">
        <div style="font-weight: bold; text-transform: uppercase; font-size: 10.5pt;">UBND PHƯỜNG ĐỒNG HỚI</div>
        <div style="font-weight: bold; text-decoration: underline; font-size: 10.5pt;">${schoolName.toUpperCase()}</div>
        ${campus ? `<div style="font-size: 9.5pt; font-weight: bold; color: #047857;">${campus.toUpperCase()}</div>` : ''}
      </td>
      <td style="width: 55%; text-align: center;">
        <div style="font-weight: bold; font-size: 11pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: bold; text-decoration: underline; font-size: 10.5pt;">Độc lập - Tự do - Hạnh phúc</div>
      </td>
    </tr>
  </table>

  <div class="main-title">THỜI KHÓA BIỂU TOÀN PHÂN HIỆU</div>
  <div class="subtitle">(Áp dụng từ Tuần ${effectiveWeek} - Bắt đầu từ ngày ${effectiveDate} • Năm học: ${schoolYear})</div>

  <table class="matrix-table">
    <thead>
      <tr>
        <th style="width: 6.5%;">Thứ</th>
        <th style="width: 5%;">Buổi</th>
        <th style="width: 4%;">Tiết</th>
        ${classHeadersHtml}
      </tr>
    </thead>
    <tbody>
      ${matrixRowsHtml}
    </tbody>
  </table>

  <table class="signature-container">
    <tr>
      <td style="width: 40%;">
        <div class="sig-title">DUYỆT CỦA BAN GIÁM HIỆU</div>
        <div class="sig-note">(Ký và đóng dấu)</div>
        <div class="sig-space"></div>
      </td>
      <td style="width: 20%;"></td>
      <td style="width: 40%;">
        <div class="sig-note">Đồng Hới, ngày ... tháng ... năm 202...</div>
        <div class="sig-title" style="margin-top: 2px;">NGƯỜI LẬP THỜI KHÓA BIỂU</div>
        <div class="sig-note">(Ký và ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </td>
    </tr>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
  `;

  openHtmlPrintWindow(printableHtml, `TKB-${schoolName}-Tuan-${effectiveWeek}`);
}

/**
 * Export Teacher List (Danh sách giáo viên phân công chuyên môn) to PDF / Print Window
 */
export function exportTeacherListToPdf(
  teachers: Teacher[],
  schoolName = 'TRƯỜNG THCS ĐỒNG PHÚ',
  campus = 'PHÂN HIỆU HẢI THÀNH',
  schoolYear = '2026 - 2027'
) {
  const tableRowsHtml = teachers
    .map((t, idx) => {
      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align: center; border: 1px solid #1e293b; padding: 6px 4px; font-weight: bold;">${idx + 1}</td>
          <td style="text-align: left; border: 1px solid #1e293b; padding: 6px 8px; font-weight: bold; color: #0f172a;">${t.name}</td>
          <td style="text-align: center; border: 1px solid #1e293b; padding: 6px 6px; font-weight: bold; color: #1d4ed8; background: #eff6ff;">${t.shortName}</td>
          <td style="text-align: left; border: 1px solid #1e293b; padding: 6px 8px; font-weight: 500;">${t.subject}</td>
          <td style="text-align: left; border: 1px solid #1e293b; padding: 6px 8px;">${t.department}</td>
          <td style="text-align: center; border: 1px solid #1e293b; padding: 6px 4px; font-weight: bold;">${t.totalPeriods || '-'}</td>
          <td style="text-align: center; border: 1px solid #1e293b; padding: 6px 6px; font-weight: 600; color: #047857;">${t.homeroom || '-'}</td>
          <td style="text-align: left; border: 1px solid #1e293b; padding: 6px 8px; font-size: 10pt; color: #475569;">${t.role || ''}</td>
        </tr>
      `;
    })
    .join('');

  const printableHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Danh sách giáo viên - ${schoolName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 15px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .header-table td {
      border: none;
      vertical-align: top;
      padding: 0;
    }
    .main-title {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 14px;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .subtitle {
      text-align: center;
      font-size: 11pt;
      font-style: italic;
      margin-bottom: 12px;
    }
    .summary-box {
      padding: 6px 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      margin-bottom: 12px;
      font-size: 10.5pt;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .data-table th {
      background-color: #f1f5f9;
      font-weight: bold;
      border: 1px solid #1e293b;
      padding: 7px 4px;
      text-align: center;
      font-size: 10.5pt;
    }
    .sig-container {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .sig-container td {
      border: none;
      vertical-align: top;
      text-align: center;
      width: 50%;
    }
    .sig-title {
      font-weight: bold;
      font-size: 11pt;
      text-transform: uppercase;
    }
    .sig-note {
      font-style: italic;
      font-size: 10pt;
      margin-top: 2px;
    }
    .sig-space {
      height: 65px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; padding: 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 13px; color: #1e40af; font-weight: bold;">
      📄 In / Xuất PDF Danh sách phân công chuyên môn (${teachers.length} Thầy/Cô)
    </span>
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
      🖨️ In hoặc Lưu file PDF (Ctrl + P)
    </button>
  </div>

  <table class="header-table">
    <tr>
      <td style="width: 45%; text-align: center;">
        <div style="font-weight: bold; text-transform: uppercase;">UBND PHƯỜNG ĐỒNG HỚI</div>
        <div style="font-weight: bold; text-decoration: underline;">${schoolName.toUpperCase()}</div>
        ${campus ? `<div style="font-size: 10pt; font-weight: bold; color: #047857;">${campus.toUpperCase()}</div>` : ''}
      </td>
      <td style="width: 55%; text-align: center;">
        <div style="font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
      </td>
    </tr>
  </table>

  <div class="main-title">DANH SÁCH PHÂN CÔNG CHUYÊN MÔN GIÁO VIÊN</div>
  <div class="subtitle">Năm học: ${schoolYear} • ${campus || schoolName}</div>

  <div class="summary-box">
    <b>Tổng số cán bộ, giáo viên:</b> ${teachers.length} Thầy/Cô &nbsp;&nbsp;•&nbsp;&nbsp;
    <b>Phân hiệu:</b> ${campus || 'Cơ sở chính'} &nbsp;&nbsp;•&nbsp;&nbsp;
    <b>Thời điểm lập:</b> Tháng 9/${schoolYear.slice(0, 4)}
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 5%;">STT</th>
        <th style="width: 22%;">Họ và tên giáo viên</th>
        <th style="width: 11%;">Tên TKB</th>
        <th style="width: 18%;">Môn giảng dạy</th>
        <th style="width: 17%;">Tổ chuyên môn</th>
        <th style="width: 8%;">Số tiết</th>
        <th style="width: 9%;">Chủ nhiệm</th>
        <th style="width: 10%;">Chức vụ</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <table class="sig-container">
    <tr>
      <td>
        <div class="sig-title">HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG</div>
        <div class="sig-note">(Ký và đóng dấu)</div>
        <div class="sig-space"></div>
      </td>
      <td>
        <div class="sig-note">Đồng Hới, ngày ... tháng ... năm 202...</div>
        <div class="sig-title" style="margin-top: 2px;">TỔ TRƯỞNG CHUYÊN MÔN</div>
        <div class="sig-note">(Ký và ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </td>
    </tr>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
  `;

  openHtmlPrintWindow(printableHtml, `Danh-sach-giao-vien-${campus || schoolName}`);
}

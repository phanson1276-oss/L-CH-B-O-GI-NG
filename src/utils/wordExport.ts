import { LessonReportRow, WeeklyReportConfig } from '../types';
import { computeReportRowSpans } from './generator';

export function exportLessonReportToWord(rows: LessonReportRow[], config: WeeklyReportConfig) {
  const rowSpans = computeReportRowSpans(rows);

  const tableRowsHtml = rows
    .map(
      (r, idx) => {
        const span = rowSpans[idx] || { dayRowSpan: 1, sessionRowSpan: 1 };
        const dayCell =
          span.dayRowSpan > 0
            ? `<td rowspan="${span.dayRowSpan}" style="text-align: center; border: 1px solid #000; padding: 6px; font-weight: bold; vertical-align: middle;">${r.dayName}</td>
      <td rowspan="${span.dayRowSpan}" style="text-align: center; border: 1px solid #000; padding: 6px; vertical-align: middle;">${r.dateString}</td>`
            : '';
        const sessionCell =
          span.sessionRowSpan > 0
            ? `<td rowspan="${span.sessionRowSpan}" style="text-align: center; border: 1px solid #000; padding: 6px; vertical-align: middle; font-weight: bold;">${r.session === 'morning' ? 'Sáng' : 'Chiều'}</td>`
            : '';

        return `
    <tr>
      ${dayCell}
      ${sessionCell}
      <td style="text-align: center; border: 1px solid #000; padding: 6px; font-weight: bold;">${r.periodTKB}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 6px;">${r.subject}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 6px; font-weight: bold;">${r.className}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 6px; font-weight: bold;">${r.ppctPeriodNumber}</td>
      <td style="text-align: left; border: 1px solid #000; padding: 6px;">${r.lessonName}</td>
      <td style="text-align: left; border: 1px solid #000; padding: 6px;">${r.equipment || ''}</td>
      <td style="text-align: left; border: 1px solid #000; padding: 6px;">${r.notes || ''}</td>
    </tr>
  `;
      }
    )
    .join('');

  const wordHtml = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' 
        xmlns:w='urn:schemas-microsoft-com:office:word' 
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Phiếu Báo Giảng - Tuần ${config.weekNumber}</title>
    <style>
      @page {
        size: landscape;
        margin: 1.5cm 1.5cm 1.5cm 1.5cm;
      }
      body {
        font-family: "Times New Roman", Times, serif;
        font-size: 13pt;
        line-height: 1.3;
        color: #000;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }
      th {
        border: 1px solid #000;
        background-color: #f2f2f2;
        padding: 8px 4px;
        text-align: center;
        font-weight: bold;
        font-size: 11pt;
      }
      td {
        border: 1px solid #000;
        padding: 6px 4px;
        font-size: 11pt;
      }
      .header-table {
        width: 100%;
        border: none;
        margin-bottom: 20px;
      }
      .header-table td {
        border: none;
        padding: 2px;
      }
      .title {
        text-align: center;
        font-size: 16pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-top: 10px;
        margin-bottom: 4px;
      }
      .subtitle {
        text-align: center;
        font-size: 12pt;
        font-style: italic;
        margin-bottom: 6px;
      }
      .info-line {
        text-align: center;
        font-size: 12pt;
        margin-bottom: 15px;
      }
      .signature-table {
        width: 100%;
        border: none;
        margin-top: 30px;
      }
      .signature-table td {
        border: none;
        text-align: center;
        vertical-align: top;
        font-size: 12pt;
      }
    </style>
  </head>
  <body>
    <table class="header-table">
      <tr>
        <td style="width: 45%; text-align: center;">
          <p style="margin: 0; font-weight: bold; font-size: 11pt;">UBND PHƯỜNG ĐỒNG HỚI</p>
          <p style="margin: 0; font-weight: bold; font-size: 11pt; text-decoration: underline;">TRƯỜNG THCS ĐỒNG PHÚ</p>
        </td>
        <td style="width: 55%; text-align: center;">
          <p style="margin: 0; font-weight: bold; font-size: 11pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p style="margin: 0; font-weight: bold; font-size: 11pt; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</p>
        </td>
      </tr>
    </table>

    <div class="title">LỊCH BÁO GIẢNG - TUẦN ${config.weekNumber}</div>
    <div class="subtitle">(Thực hiện từ ngày ${config.startDate} đến ngày ${config.endDate})</div>
    <div class="info-line">
      <b>Họ và tên giáo viên:</b> ${config.teacherName} &nbsp;&nbsp;|&nbsp;&nbsp; 
      <b>Tổ chuyên môn:</b> ${config.department} &nbsp;&nbsp;|&nbsp;&nbsp;
      <b>Năm học:</b> ${config.schoolYear}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 6%;">Ngày thứ</th>
          <th style="width: 8%;">Ngày</th>
          <th style="width: 6%;">Buổi</th>
          <th style="width: 6%;">Tiết theo TKB</th>
          <th style="width: 9%;">Môn</th>
          <th style="width: 6%;">Lớp</th>
          <th style="width: 7%;">Tiết thứ theo PPCT</th>
          <th style="width: 26%;">Tên bài dạy</th>
          <th style="width: 14%;">Thiết bị dạy học</th>
          <th style="width: 12%;">Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <table class="signature-table">
      <tr>
        <td style="width: 33%;">
          <b>DUYỆT CỦA BGH</b><br>
          <i>(Ký và đóng dấu)</i><br><br><br><br>
        </td>
        <td style="width: 33%;">
          <b>TỔ TRƯỞNG CHUYÊN MÔN</b><br>
          <i>(Ký và ghi rõ họ tên)</i><br><br><br><br>
        </td>
        <td style="width: 34%;">
          <i>Đồng Hới, ngày ... tháng ... năm 202...</i><br>
          <b>GIÁO VIÊN GIẢNG DẠY</b><br>
          <i>(Ký và ghi rõ họ tên)</i><br><br><br><br>
          <b>${config.teacherName}</b>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const blob = new Blob(['\ufeff', wordHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Phieu_Bao_Giang_Tuan_${config.weekNumber}_${config.teacherShortName}_THCS_Dong_Phu.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

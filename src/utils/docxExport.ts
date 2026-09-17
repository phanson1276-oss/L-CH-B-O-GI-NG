import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  PageOrientation,
  convertMillimetersToTwip,
  VerticalMergeType,
  ISectionOptions,
} from 'docx';
import { LessonReportRow, WeeklyReportConfig, TimetableData, PPCTPlan, Teacher, TimetableVersion } from '../types';
import { computeReportRowSpans, generateWeeklyReport, sortReportRows, formatDayDateParts } from './generator';
import { getAcademicWeekDates } from './academicCalendar';

// Thin solid black border for standard Vietnamese administrative tables
const cellBorder = {
  style: BorderStyle.SINGLE,
  size: 4, // 0.5pt
  color: '000000',
};

const tableBorders = {
  top: cellBorder,
  bottom: cellBorder,
  left: cellBorder,
  right: cellBorder,
};

const noBorder = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'FFFFFF',
};

const transparentBorders = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
};

// Standard column widths summing exactly to 10546 DXA (~186 mm, fitting 210mm A4 portrait with 12mm margins)
const COL_WIDTHS = {
  dayDate: 1550,      // ~27.3 mm (14.7%) - Thứ ngày (Thứ 2 – 14/9)
  session: 750,       // ~13.2 mm (7.1%) - Buổi (Sáng / Chiều)
  periodTKB: 850,     // ~15.0 mm (8.1%) - Tiết theo TKB
  subject: 1050,      // ~18.5 mm (10.0%) - Môn
  className: 800,     // ~14.1 mm (7.6%) - Lớp
  ppctPeriod: 1100,   // ~19.4 mm (10.4%) - Tiết theo PPCT
  lessonName: 3246,   // ~57.2 mm (30.8%) - Tên bài dạy
  notes: 1200,        // ~21.2 mm (11.4%) - Ghi chú
};

// Create a section for a single teacher's lesson report that fits neatly on an A4 portrait page
export function buildTeacherDocxSection(
  rows: LessonReportRow[],
  config: WeeklyReportConfig,
  campusName?: string
): ISectionOptions {
  const rowSpans = computeReportRowSpans(rows);

  // 1. National header & School header table (invisible borders)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: transparentBorders,
    rows: [
      new TableRow({
        children: [
          // Left: School info
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            borders: transparentBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 220, before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: 'UBND PHƯỜNG ĐỒNG HỚI',
                    bold: true,
                    size: 20, // 10pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 220, before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: (config.schoolName || 'TRƯỜNG THCS ĐỒNG PHÚ').toUpperCase(),
                    bold: true,
                    underline: {},
                    size: 20, // 10pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              ...(campusName
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { line: 220, before: 0, after: 0 },
                      children: [
                        new TextRun({
                          text: campusName.toUpperCase(),
                          bold: true,
                          size: 18, // 9pt
                          font: 'Times New Roman',
                          color: '047857',
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
          // Right: National motto
          new TableCell({
            width: { size: 6046, type: WidthType.DXA },
            borders: transparentBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 220, before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                    bold: true,
                    size: 20, // 10pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 220, before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: 'Độc lập - Tự do - Hạnh phúc',
                    bold: true,
                    underline: {},
                    size: 21, // 10.5pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // 2. Title & Metadata
  const titleParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 100, after: 30 },
      children: [
        new TextRun({
          text: `LỊCH BÁO GIẢNG - TUẦN ${config.weekNumber}`,
          bold: true,
          size: 26, // 13pt
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 220, before: 0, after: 40 },
      children: [
        new TextRun({
          text: `(Thực hiện từ ngày ${config.startDate} đến ngày ${config.endDate})`,
          italics: true,
          size: 19, // 9.5pt
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 220, before: 0, after: 100 },
      children: [
        new TextRun({
          text: `Họ và tên GV: `,
          bold: true,
          size: 19, // 9.5pt
          font: 'Times New Roman',
        }),
        new TextRun({
          text: `${config.teacherName}    |    `,
          size: 19,
          font: 'Times New Roman',
        }),
        new TextRun({
          text: `Tổ chuyên môn: `,
          bold: true,
          size: 19,
          font: 'Times New Roman',
        }),
        new TextRun({
          text: `${config.department}    |    `,
          size: 19,
          font: 'Times New Roman',
        }),
        new TextRun({
          text: `Năm học: `,
          bold: true,
          size: 19,
          font: 'Times New Roman',
        }),
        new TextRun({
          text: `${config.schoolYear}`,
          size: 19,
          font: 'Times New Roman',
        }),
      ],
    }),
  ];

  // 3. Table Header
  const cellMargins = { top: 40, bottom: 40, left: 60, right: 60 };

  const headerCells = [
    { text: 'Thứ ngày', width: COL_WIDTHS.dayDate },
    { text: 'Buổi', width: COL_WIDTHS.session },
    { text: 'Tiết theo TKB', width: COL_WIDTHS.periodTKB },
    { text: 'Môn', width: COL_WIDTHS.subject },
    { text: 'Lớp', width: COL_WIDTHS.className },
    { text: 'Tiết theo PPCT', width: COL_WIDTHS.ppctPeriod },
    { text: 'Tên bài dạy', width: COL_WIDTHS.lessonName },
    { text: 'Ghi chú', width: COL_WIDTHS.notes },
  ].map(
    (col) =>
      new TableCell({
        width: { size: col.width, type: WidthType.DXA },
        borders: tableBorders,
        shading: { fill: 'EFEFEF' },
        margins: cellMargins,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 200, before: 0, after: 0 },
            children: [
              new TextRun({
                text: col.text,
                bold: true,
                size: 18, // 9pt
                font: 'Times New Roman',
              }),
            ],
          }),
        ],
      })
  );

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headerCells,
  });

  // 4. Data Rows
  const tableDataRows: TableRow[] = [];

  if (rows.length === 0) {
    tableDataRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 8,
            borders: tableBorders,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Không có tiết dạy nào được xếp lịch trong tuần này.',
                    italics: true,
                    size: 18,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  } else {
    const sortedRows = sortReportRows(rows);
    const spans = computeReportRowSpans(sortedRows);

    sortedRows.forEach((r, idx) => {
      const span = spans[idx] || { dayRowSpan: 1, sessionRowSpan: 1 };
      const { dayLabel, dateLabel } = r.dayLabel && r.dateLabel
        ? { dayLabel: r.dayLabel, dateLabel: r.dateLabel }
        : formatDayDateParts(r.dayOfWeek, r.dateString, r.dayDateDisplay);
      const rowChildren: TableCell[] = [];

      // Col 1: Thứ ngày (Bố trí: Thứ ở hàng trên, ngày nằm ở hàng dưới)
      if (span.dayRowSpan > 0) {
        rowChildren.push(
          new TableCell({
            rowSpan: span.dayRowSpan,
            width: { size: COL_WIDTHS.dayDate, type: WidthType.DXA },
            borders: tableBorders,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 200, before: 0, after: dateLabel ? 20 : 0 },
                children: [
                  new TextRun({
                    text: dayLabel,
                    bold: true,
                    size: 17,
                    font: 'Times New Roman',
                  }),
                ],
              }),
              ...(dateLabel
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { line: 200, before: 20, after: 0 },
                      children: [
                        new TextRun({
                          text: dateLabel,
                          size: 16,
                          font: 'Times New Roman',
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          })
        );
      }

      // Col 2: Buổi (Gộp ô khi cùng Thứ ngày + cùng Buổi)
      if (span.sessionRowSpan > 0) {
        rowChildren.push(
          new TableCell({
            rowSpan: span.sessionRowSpan,
            width: { size: COL_WIDTHS.session, type: WidthType.DXA },
            borders: tableBorders,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 200, before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: r.session === 'morning' ? 'Sáng' : 'Chiều',
                    size: 17,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          })
        );
      }

      // Col 3: Tiết theo TKB (Hiển thị riêng từng tiết)
      rowChildren.push(
        new TableCell({
          width: { size: COL_WIDTHS.periodTKB, type: WidthType.DXA },
          borders: tableBorders,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 200, before: 0, after: 0 },
              children: [
                new TextRun({
                  text: String(r.periodTKB),
                  bold: true,
                  size: 18,
                  font: 'Times New Roman',
                }),
              ],
            }),
          ],
        })
      );

      // Col 4: Môn (Hiển thị riêng từng tiết)
      rowChildren.push(
        new TableCell({
          width: { size: COL_WIDTHS.subject, type: WidthType.DXA },
          borders: tableBorders,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 200, before: 0, after: 0 },
              children: [
                new TextRun({
                  text: r.subject,
                  size: 17,
                  font: 'Times New Roman',
                }),
              ],
            }),
          ],
        })
      );

      // Col 5: Lớp (Hiển thị riêng từng tiết)
      rowChildren.push(
        new TableCell({
          width: { size: COL_WIDTHS.className, type: WidthType.DXA },
          borders: tableBorders,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 200, before: 0, after: 0 },
              children: [
                new TextRun({
                  text: r.className,
                  bold: true,
                  size: 18,
                  font: 'Times New Roman',
                }),
              ],
            }),
          ],
        })
      );

      // Col 6: Tiết thứ theo PPCT (Hiển thị riêng từng tiết)
      rowChildren.push(
        new TableCell({
          width: { size: COL_WIDTHS.ppctPeriod, type: WidthType.DXA },
          borders: tableBorders,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 200, before: 0, after: 0 },
              children: [
                new TextRun({
                  text: String(r.ppctPeriodNumber),
                  bold: true,
                  size: 18,
                  font: 'Times New Roman',
                }),
              ],
            }),
          ],
        })
      );

      // Col 7: Tên bài dạy (Hiển thị riêng từng tiết)
      rowChildren.push(
        new TableCell({
          width: { size: COL_WIDTHS.lessonName, type: WidthType.DXA },
          borders: tableBorders,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { line: 210, before: 0, after: 0 },
              children: [
                new TextRun({
                  text: r.lessonName,
                  size: 17,
                  font: 'Times New Roman',
                }),
              ],
            }),
          ],
        })
      );

      // Col 8: Ghi chú (Hiển thị riêng từng tiết)
      rowChildren.push(
        new TableCell({
          width: { size: COL_WIDTHS.notes, type: WidthType.DXA },
          borders: tableBorders,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { line: 200, before: 0, after: 0 },
              children: [
                new TextRun({
                  text: r.notes || '',
                  size: 16,
                  font: 'Times New Roman',
                }),
              ],
            }),
          ],
        })
      );

      tableDataRows.push(
        new TableRow({
          cantSplit: true,
          children: rowChildren,
        })
      );
    });
  }

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [headerRow, ...tableDataRows],
  });

  // 5. Official Signatures Table (compact to guarantee A4 portrait fit)
  const currentYear = new Date().getFullYear();
  const dateParts = config.startDate.split('/');
  const dayStr = dateParts[0] || '...';
  const monthStr = dateParts[1] || '...';

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: transparentBorders,
    rows: [
      new TableRow({
        children: [
          // Duyệt của BGH
          new TableCell({
            width: { size: 3500, type: WidthType.DXA },
            borders: transparentBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 220, before: 120, after: 20 },
                children: [
                  new TextRun({
                    text: 'DUYỆT CỦA BGH',
                    bold: true,
                    size: 19, // 9.5pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 200, before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: '(Ký và đóng dấu)',
                    italics: true,
                    size: 17, // 8.5pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              // Empty space for stamp/signature
              new Paragraph({ spacing: { before: 500, after: 0 }, children: [] }),
            ],
          }),

          // Tổ trưởng chuyên môn
          new TableCell({
            width: { size: 3500, type: WidthType.DXA },
            borders: transparentBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 220, before: 120, after: 20 },
                children: [
                  new TextRun({
                    text: 'TỔ TRƯỞNG CHUYÊN MÔN',
                    bold: true,
                    size: 19, // 9.5pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 200, before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: '(Ký và ghi rõ họ tên)',
                    italics: true,
                    size: 17, // 8.5pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({ spacing: { before: 500, after: 0 }, children: [] }),
            ],
          }),

          // Giáo viên giảng dạy
          new TableCell({
            width: { size: 3546, type: WidthType.DXA },
            borders: transparentBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 200, before: 100, after: 20 },
                children: [
                  new TextRun({
                    text: `Đồng Hới, ngày ${dayStr} tháng ${monthStr} năm ${currentYear}`,
                    italics: true,
                    size: 17, // 8.5pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 220, before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: 'GIÁO VIÊN GIẢNG DẠY',
                    bold: true,
                    size: 19, // 9.5pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 200, before: 0, after: 400 },
                children: [
                  new TextRun({
                    text: '(Ký và ghi rõ họ tên)',
                    italics: true,
                    size: 17, // 8.5pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 200, before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: config.teacherName,
                    bold: true,
                    size: 19, // 9.5pt
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return {
    properties: {
      page: {
        size: {
          width: convertMillimetersToTwip(210),   // 21cm standard A4
          height: convertMillimetersToTwip(297),  // 29.7cm standard A4
          orientation: PageOrientation.PORTRAIT,
        },
        margin: {
          top: convertMillimetersToTwip(10),     // 10 mm
          bottom: convertMillimetersToTwip(10),  // 10 mm
          left: convertMillimetersToTwip(12),    // 12 mm
          right: convertMillimetersToTwip(12),   // 12 mm
        },
      },
    },
    children: [
      headerTable,
      ...titleParagraphs,
      mainTable,
      signatureTable,
    ],
  };
}

/**
 * Xuất phiếu báo giảng của 01 giáo viên ra file Word (.docx) chuẩn khổ giấy A4 dọc.
 */
export async function exportLessonReportToDocx(
  rows: LessonReportRow[],
  config: WeeklyReportConfig,
  campusName?: string
): Promise<void> {
  const section = buildTeacherDocxSection(rows, config, campusName);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 18,
          },
          paragraph: {
            spacing: {
              line: 220,
              before: 0,
              after: 0,
            },
          },
        },
      },
    },
    sections: [section],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Phieu_Bao_Giang_Tuan_${config.weekNumber}_${config.teacherShortName}_THCS_Dong_Phu.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Xuất toàn bộ phiếu báo giảng của TẤT CẢ giáo viên có lịch dạy trong tuần ra tệp Word (.docx) duy nhất.
 * Mỗi giáo viên là 1 trang A4 dọc độc lập, ngăn nắp, sẵn sàng nộp BGH hoặc in ấn hàng loạt.
 */
export async function exportAllTeachersReportsToDocx(
  timetable: TimetableData,
  ppctPlans: PPCTPlan[],
  teachers: Teacher[],
  weekNumber: number,
  schoolInfo: { name: string; schoolYear: string; campus?: string; district?: string }
): Promise<number> {
  const weekInfo = getAcademicWeekDates(weekNumber);
  const startDateStr = weekInfo.startDateStr;
  const endDateStr = weekInfo.endDateStr;

  // Filter teachers with lessons or process all teachers
  const sections: ISectionOptions[] = [];
  let teachersWithLessonsCount = 0;

  for (const teacher of teachers) {
    const config: WeeklyReportConfig = {
      weekNumber,
      startDate: startDateStr,
      endDate: endDateStr,
      teacherName: teacher.name,
      teacherShortName: teacher.shortName,
      subject: teacher.subject,
      department: teacher.department,
      schoolName: schoolInfo.name,
      schoolYear: schoolInfo.schoolYear,
    };

    const rows = generateWeeklyReport(
      teacher.shortName,
      config,
      timetable,
      ppctPlans
    );

    // Only include teachers who have teaching assignments in this week
    if (rows && rows.length > 0) {
      teachersWithLessonsCount++;
      const section = buildTeacherDocxSection(rows, config, schoolInfo.campus);
      sections.push(section);
    }
  }

  // If no teacher had rows (e.g. empty timetable), export at least the first teacher
  if (sections.length === 0 && teachers.length > 0) {
    const firstTeacher = teachers[0];
    const config: WeeklyReportConfig = {
      weekNumber,
      startDate: startDateStr,
      endDate: endDateStr,
      teacherName: firstTeacher.name,
      teacherShortName: firstTeacher.shortName,
      subject: firstTeacher.subject,
      department: firstTeacher.department,
      schoolName: schoolInfo.name,
      schoolYear: schoolInfo.schoolYear,
    };
    sections.push(buildTeacherDocxSection([], config, schoolInfo.campus));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 18,
          },
          paragraph: {
            spacing: {
              line: 220,
              before: 0,
              after: 0,
            },
          },
        },
      },
    },
    sections,
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Phieu_Bao_Giang_Toan_Truong_Tuan_${weekNumber}_THCS_Dong_Phu.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return teachersWithLessonsCount;
}

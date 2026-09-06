import * as pdfjsLib from 'pdfjs-dist';
import {
  parseTimetableGrid,
  parseTextTimetable,
  extractTeachersFromGrid,
  parseTextTeacherList,
  parsePPCTGrid,
  parseTextPPCT,
  normalizeClassName,
  parseDayOfWeek,
  parsePeriodNumber,
  parseTimetableCell,
  TimetableParseReport,
} from './excelExporter';
import { Teacher, TimetableSlot, PPCTItem } from '../types';

// Configure worker for browser environment
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
  } catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export interface PdfPositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfExtractedData {
  text: string;
  grid: string[][];
  alignedGrid: string[][];
  positionedItems: PdfPositionedItem[];
  numPages: number;
  hasText: boolean;
}

/**
 * Extract structured text and table grids from a PDF file using pdfjs-dist.
 * Provides both raw line-grouped grid and coordinate-aligned column grid.
 */
export async function extractTextAndGridFromPdf(file: File): Promise<PdfExtractedData> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const rawRows: string[][] = [];
  const textLines: string[] = [];
  const allAlignedRows: string[][] = [];
  const allPositionedItems: PdfPositionedItem[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    if (!items || items.length === 0) continue;

    const pageItems: PdfPositionedItem[] = [];
    for (const it of items) {
      if (typeof it.str === 'string') {
        const cleanStr = it.str.replace(/\u0000/g, '').trim();
        if (cleanStr.length > 0) {
          const x = it.transform ? it.transform[4] : 0;
          const y = it.transform ? it.transform[5] : 0;
          const width = it.width || 0;
          const height = it.height || (it.transform ? Math.abs(it.transform[3]) : 10);
          pageItems.push({ str: cleanStr, x, y, width, height });
          allPositionedItems.push({ str: cleanStr, x, y, width, height });
        }
      }
    }

    if (pageItems.length === 0) continue;

    // 1. Build Coordinate-Aligned Grid for this page
    const pageAlignedGrid = buildAlignedTableGrid(pageItems);
    if (pageAlignedGrid.length > 0) {
      allAlignedRows.push(...pageAlignedGrid);
    }

    // 2. Build Line-Grouped Raw Grid & Text
    // In PDF, Y goes from bottom (0) to top. Sort Y descending (top to bottom)
    pageItems.sort((a, b) => b.y - a.y || a.x - b.x);

    const lineGroups: PdfPositionedItem[][] = [];
    let currentLine: PdfPositionedItem[] = [];
    let currentY = pageItems[0].y;

    for (const item of pageItems) {
      // Tolerance: items on same visual line
      if (Math.abs(item.y - currentY) <= Math.max(6, item.height * 0.6)) {
        currentLine.push(item);
      } else {
        if (currentLine.length > 0) {
          lineGroups.push(currentLine);
        }
        currentLine = [item];
        currentY = item.y;
      }
    }
    if (currentLine.length > 0) {
      lineGroups.push(currentLine);
    }

    for (const line of lineGroups) {
      line.sort((a, b) => a.x - b.x);

      const cells: string[] = [];
      let currentCellText = '';
      let lastRightX = -1;

      for (let i = 0; i < line.length; i++) {
        const item = line[i];
        const trimmed = item.str;

        if (lastRightX === -1) {
          currentCellText = trimmed;
        } else {
          const gap = item.x - lastRightX;
          if (gap > 12) {
            if (currentCellText.trim()) {
              cells.push(currentCellText.trim());
            }
            currentCellText = trimmed;
          } else {
            if (currentCellText.endsWith(' ') || trimmed.startsWith(' ')) {
              currentCellText += trimmed;
            } else {
              currentCellText += (currentCellText ? ' ' : '') + trimmed;
            }
          }
        }
        lastRightX = item.x + item.width;
      }

      if (currentCellText.trim()) {
        cells.push(currentCellText.trim());
      }

      if (cells.length > 0) {
        rawRows.push(cells);
        textLines.push(cells.join('\t'));
      }
    }
  }

  return {
    text: textLines.join('\n'),
    grid: rawRows,
    alignedGrid: allAlignedRows,
    positionedItems: allPositionedItems,
    numPages,
    hasText: allPositionedItems.length > 0,
  };
}

/**
 * Coordinate Alignment Engine:
 * Analyzes X positions of columns to group text items into a true 2D matrix,
 * keeping empty periods empty and preserving column indices.
 */
function buildAlignedTableGrid(items: PdfPositionedItem[]): string[][] {
  if (items.length < 5) return [];

  // 1. Detect Class Header Columns or General Column Centroids
  // Find items that resemble class names
  const classCandidates: Array<{ className: string; item: PdfPositionedItem }> = [];
  for (const it of items) {
    const norm = normalizeClassName(it.str);
    if (norm) {
      classCandidates.push({ className: norm, item: it });
    }
  }

  interface ColumnDef {
    midX: number;
    left: number;
    right: number;
    label?: string;
  }

  let columns: ColumnDef[] = [];

  // Group candidate classes by Y coordinate with sliding tolerance (not fixed 15px buckets)
  const sortedCandidates = [...classCandidates].sort((a, b) => b.item.y - a.item.y);
  const headerGroups: Array<Array<{ className: string; item: PdfPositionedItem }>> = [];

  for (const cand of sortedCandidates) {
    let placed = false;
    for (const group of headerGroups) {
      if (Math.abs(group[0].item.y - cand.item.y) <= 18) {
        if (!group.some((g) => g.className === cand.className || Math.abs(g.item.x - cand.item.x) < 15)) {
          group.push(cand);
        }
        placed = true;
        break;
      }
    }
    if (!placed) {
      headerGroups.push([cand]);
    }
  }

  let bestHeaderList: Array<{ className: string; item: PdfPositionedItem }> = [];
  for (const group of headerGroups) {
    if (group.length > bestHeaderList.length) {
      bestHeaderList = group;
    }
  }

  if (bestHeaderList.length >= 2) {
    // We found a clean class header row!
    bestHeaderList.sort((a, b) => a.item.x - b.item.x);

    // Look for items to the left of the first class (e.g. Thứ, Tiết)
    const minClassX = bestHeaderList[0].item.x;
    const headerY = bestHeaderList[0].item.y;

    const leftHeaderItems = items
      .filter((it) => it.x < minClassX - 5 && Math.abs(it.y - headerY) < 35)
      .sort((a, b) => a.x - b.x);

    // Build ordered column definitions
    const colItems: Array<{ midX: number; width: number; label: string }> = [];

    for (const lh of leftHeaderItems) {
      colItems.push({
        midX: lh.x + lh.width / 2,
        width: Math.max(lh.width, 25),
        label: lh.str,
      });
    }

    for (const ch of bestHeaderList) {
      colItems.push({
        midX: ch.item.x + ch.item.width / 2,
        width: Math.max(ch.item.width, 35),
        label: ch.className,
      });
    }

    // Determine column boundaries
    colItems.sort((a, b) => a.midX - b.midX);
    columns = colItems.map((c, idx) => {
      const left = idx === 0 ? c.midX - 35 : (colItems[idx - 1].midX + c.midX) / 2;
      const right = idx === colItems.length - 1 ? c.midX + 45 : (c.midX + colItems[idx + 1].midX) / 2;
      return { midX: c.midX, left, right, label: c.label };
    });
  } else {
    // Fallback Column Detection: X Clustering across all items
    const xs = items.map((it) => it.x + it.width / 2).sort((a, b) => a - b);
    const clusters: number[][] = [];
    for (const x of xs) {
      if (clusters.length === 0) {
        clusters.push([x]);
      } else {
        const last = clusters[clusters.length - 1];
        const avg = last.reduce((s, v) => s + v, 0) / last.length;
        if (Math.abs(x - avg) < 26) {
          last.push(x);
        } else {
          clusters.push([x]);
        }
      }
    }

    // Keep significant clusters (with >= 2 items)
    const validClusters = clusters.filter((c) => c.length >= 2);
    if (validClusters.length >= 3) {
      const colMids = validClusters.map((c) => c.reduce((s, v) => s + v, 0) / c.length).sort((a, b) => a - b);
      columns = colMids.map((mid, idx) => {
        const left = idx === 0 ? mid - 25 : (colMids[idx - 1] + mid) / 2;
        const right = idx === colMids.length - 1 ? mid + 35 : (mid + colMids[idx + 1]) / 2;
        return { midX: mid, left, right };
      });
    }
  }

  if (columns.length < 2) return [];

  // Group items by Y coordinate into table rows with adaptive vertical band (18px)
  const sortedItems = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rowBands: PdfPositionedItem[][] = [];
  let currentRow: PdfPositionedItem[] = [];
  let currentY = sortedItems[0]?.y ?? 0;

  for (const it of sortedItems) {
    // Row height tolerance: 18px to reliably bundle multiline subject + teacher in same cell
    if (Math.abs(it.y - currentY) <= 18) {
      currentRow.push(it);
    } else {
      if (currentRow.length > 0) {
        rowBands.push(currentRow);
      }
      currentRow = [it];
      currentY = it.y;
    }
  }
  if (currentRow.length > 0) {
    rowBands.push(currentRow);
  }

  // Populate 2D rectangular grid
  const grid: string[][] = [];

  for (const band of rowBands) {
    const rowCells = new Array(columns.length).fill('');

    for (const it of band) {
      const midX = it.x + it.width / 2;
      let bestColIdx = -1;
      let minDistance = Infinity;

      for (let c = 0; c < columns.length; c++) {
        const col = columns[c];
        if (midX >= col.left && midX <= col.right) {
          bestColIdx = c;
          break;
        }
        const dist = Math.abs(midX - col.midX);
        if (dist < minDistance) {
          minDistance = dist;
          bestColIdx = c;
        }
      }

      if (bestColIdx !== -1) {
        if (!rowCells[bestColIdx]) {
          rowCells[bestColIdx] = it.str;
        } else {
          rowCells[bestColIdx] += '\n' + it.str;
        }
      }
    }

    if (rowCells.some((c) => Boolean(c.trim()))) {
      grid.push(rowCells);
    }
  }

  return grid;
}

/**
 * Direct Geometric Matrix Extractor:
 * Bypasses string grids and uses exact PDF item coordinates to map Day, Period, and Class
 * directly into TimetableSlots.
 */
function extractDirectSlotsFromPdfItems(items: PdfPositionedItem[]): TimetableSlot[] {
  if (items.length < 10) return [];

  // 1. Identify Class Columns
  const classCandidates: Array<{ className: string; midX: number; width: number; y: number }> = [];
  for (const it of items) {
    const norm = normalizeClassName(it.str);
    if (norm) {
      classCandidates.push({
        className: norm,
        midX: it.x + it.width / 2,
        width: Math.max(it.width, 30),
        y: it.y,
      });
    }
  }

  if (classCandidates.length < 2) return [];

  // Group candidate classes by Y coordinate with 18px sliding window
  const sortedClasses = [...classCandidates].sort((a, b) => b.y - a.y);
  const classGroups: Array<typeof classCandidates> = [];

  for (const cc of sortedClasses) {
    let placed = false;
    for (const grp of classGroups) {
      if (Math.abs(grp[0].y - cc.y) <= 18) {
        if (!grp.some((g) => g.className === cc.className || Math.abs(g.midX - cc.midX) < 20)) {
          grp.push(cc);
        }
        placed = true;
        break;
      }
    }
    if (!placed) {
      classGroups.push([cc]);
    }
  }

  let bestClasses: typeof classCandidates = [];
  for (const grp of classGroups) {
    if (grp.length > bestClasses.length) {
      bestClasses = grp;
    }
  }

  if (bestClasses.length < 2) return [];

  bestClasses.sort((a, b) => a.midX - b.midX);

  const colIntervals = bestClasses.map((c, i) => {
    const left = i === 0 ? c.midX - 35 : (bestClasses[i - 1].midX + c.midX) / 2;
    const right = i === bestClasses.length - 1 ? c.midX + 45 : (c.midX + bestClasses[i + 1].midX) / 2;
    return { className: c.className, left, right, midX: c.midX };
  });

  const minClassX = colIntervals[0].left;

  // 2. Identify Day of Week items & Period items on the left side
  const leftItems = items.filter((it) => it.x + it.width / 2 < minClassX + 15);

  const dayItems: Array<{ day: number; y: number }> = [];
  const periodItems: Array<{ period: number; y: number }> = [];

  for (const it of leftItems) {
    const d = parseDayOfWeek(it.str, true);
    if (d && d >= 2 && d <= 8) {
      dayItems.push({ day: d, y: it.y });
    }
    const p = parsePeriodNumber(it.str);
    if (p && p >= 1 && p <= 10) {
      periodItems.push({ period: p, y: it.y });
    }
  }

  if (periodItems.length < 2) {
    // If no explicit period labels on left, estimate periods based on Y clusters below header
    const headerY = bestClasses[0].y;
    const bodyItems = items.filter((it) => it.y < headerY - 15);
    const bodyYs = bodyItems.map((it) => it.y).sort((a, b) => b - a);
    const yBands: number[][] = [];
    for (const y of bodyYs) {
      if (yBands.length === 0) yBands.push([y]);
      else {
        const last = yBands[yBands.length - 1];
        const avg = last.reduce((s, v) => s + v, 0) / last.length;
        if (Math.abs(y - avg) < 22) last.push(y);
        else yBands.push([y]);
      }
    }
    const validYBands = yBands.filter((b) => b.length >= 2);
    validYBands.forEach((b, idx) => {
      const avgY = b.reduce((s, v) => s + v, 0) / b.length;
      periodItems.push({ period: (idx % 5) + 1, y: avgY });
    });
  }

  if (periodItems.length < 2) return [];

  // Sort Day & Period by Y descending (top to bottom)
  dayItems.sort((a, b) => b.y - a.y);
  periodItems.sort((a, b) => b.y - a.y);

  // Group period items into row intervals and assign Day of Week
  const periodRows: Array<{ day: number; period: number; topY: number; bottomY: number; centerY: number }> = [];

  let currentDay = 2;
  for (let i = 0; i < periodItems.length; i++) {
    const cur = periodItems[i];

    if (dayItems.length > 0) {
      for (const d of dayItems) {
        if (d.y >= cur.y - 25) {
          currentDay = d.day;
        } else {
          break;
        }
      }
    } else {
      currentDay = 2 + Math.floor(i / 5);
      if (currentDay > 7) currentDay = 7;
    }

    const topY = i === 0 ? cur.y + 18 : (periodItems[i - 1].y + cur.y) / 2;
    const bottomY = i === periodItems.length - 1 ? cur.y - 18 : (cur.y + periodItems[i + 1].y) / 2;

    periodRows.push({
      day: currentDay,
      period: cur.period,
      topY,
      bottomY,
      centerY: cur.y,
    });
  }

  // 3. Match cells inside [X_col] x [Y_period]
  const slots: TimetableSlot[] = [];

  for (const row of periodRows) {
    for (const col of colIntervals) {
      // Find all items falling inside this cell
      const cellItems = items
        .filter(
          (it) =>
            it.x + it.width / 2 >= col.left &&
            it.x + it.width / 2 <= col.right &&
            it.y <= row.topY &&
            it.y >= row.bottomY
        )
        .sort((a, b) => b.y - a.y || a.x - b.x);

      if (cellItems.length === 0) continue;

      const cellText = cellItems.map((it) => it.str).join('\n');
      const parsed = parseTimetableCell(cellText);

      if (parsed && parsed.subject) {
        slots.push({
          dayOfWeek: row.day,
          session: row.period <= 5 ? 'morning' : 'afternoon',
          period: row.period,
          className: col.className,
          subject: parsed.subject,
          teacherShortName: parsed.teacher,
        });
      }
    }
  }

  return slots;
}

/**
 * Parses block formatted timetables (e.g. per-class text blocks)
 */
function parseBlockTimetable(text: string): TimetableParseReport {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const slots: TimetableSlot[] = [];
  let currentClass = '';
  let currentDay = 2;

  for (const line of lines) {
    // Check Class heading (e.g. "LỚP 6⁷-A3", "Lớp: 9⁸-A1", "6-A3")
    const norm = normalizeClassName(line);
    if (norm) {
      currentClass = norm;
      continue;
    }
    const classMatch = line.match(/(?:lớp|lop|khối|khoi)\s*[:.]?\s*([a-zA-Z0-9\.\/\-_⁰¹²³⁴⁵⁶⁷⁸⁹]+)/i);
    if (classMatch) {
      const c = normalizeClassName(classMatch[1]);
      if (c) {
        currentClass = c;
        continue;
      }
    }

    // Check Day heading
    const d = parseDayOfWeek(line);
    if (d && d >= 2 && d <= 8) {
      currentDay = d;
      continue;
    }

    // Check Period item (e.g. "Tiết 1: Toán (Thắm)", "1. Văn", "Tiết 2 - GDTC")
    const periodMatch = line.match(/^(?:tiết|tiet|t\.?)?\s*(\d+)[\s*:\.\-\–]\s*(.+)$/i);
    if (periodMatch && currentClass) {
      const pNum = parseInt(periodMatch[1], 10);
      if (pNum >= 1 && pNum <= 10) {
        const content = periodMatch[2].trim();
        const parsed = parseTimetableCell(content);
        if (parsed && parsed.subject) {
          slots.push({
            dayOfWeek: currentDay,
            session: pNum <= 5 ? 'morning' : 'afternoon',
            period: pNum,
            className: currentClass,
            subject: parsed.subject,
            teacherShortName: parsed.teacher,
          });
        }
      }
    }
  }

  const validSlots = slots.filter(
    (s) => s.dayOfWeek >= 2 && s.dayOfWeek <= 7 && s.period >= 1 && s.period <= 10 && Boolean(s.className) && Boolean(s.subject)
  );

  if (validSlots.length >= 3) {
    const classes = Array.from(new Set(validSlots.map((s) => s.className))).sort();
    const teachers = Array.from(new Set(validSlots.map((s) => s.teacherShortName).filter((t) => Boolean(t))));
    return {
      success: true,
      slots: validSlots,
      classes,
      teachers,
      totalSlots: validSlots.length,
      sheetName: 'PDF Block Schedule',
      layoutType: 'class_matrix',
      warnings: [],
    };
  }

  return {
    success: false,
    slots: [],
    classes: [],
    teachers: [],
    totalSlots: 0,
    sheetName: 'PDF Block Schedule',
    layoutType: 'unknown',
    warnings: [],
  };
}

/**
 * Parse Timetable from an uploaded PDF file (.pdf) with multi-tiered resolution:
 * 1. Direct Geometric Matrix Extractor
 * 2. Coordinate-Aligned Table Grid
 * 3. Line-Grouped Table Grid
 * 4. Block Schedule Parser
 * 5. Structured Plain Text Parser
 */
export async function parsePdfTimetableFile(file: File): Promise<TimetableParseReport> {
  try {
    const extracted = await extractTextAndGridFromPdf(file);

    // Check if the PDF has NO text layer (scanned image)
    if (!extracted.hasText) {
      return {
        success: false,
        slots: [],
        classes: [],
        teachers: [],
        totalSlots: 0,
        sheetName: 'PDF Scan',
        layoutType: 'unknown',
        errorMessage:
          '⚠️ Tệp PDF này không có lớp chữ số (ảnh chụp / scan hoặc file ảnh). Để hệ thống nhận diện tự động, Thầy/Cô vui lòng xuất tệp PDF có văn bản từ Word/Excel, hoặc chuyển sang tab "Dán bảng / danh sách văn bản" để dán nội dung Thời khóa biểu.',
        warnings: [],
      };
    }

    // Tier 1: Direct Geometric Matrix Extraction
    if (extracted.positionedItems.length >= 10) {
      const directSlots = extractDirectSlotsFromPdfItems(extracted.positionedItems);
      if (directSlots.length >= 5) {
        const classes = Array.from(new Set(directSlots.map((s) => s.className))).sort();
        const teachers = Array.from(new Set(directSlots.map((s) => s.teacherShortName).filter((t) => Boolean(t))));
        return {
          success: true,
          slots: directSlots,
          classes,
          teachers,
          totalSlots: directSlots.length,
          sheetName: 'PDF Matrix',
          layoutType: 'class_matrix',
          warnings: [],
        };
      }
    }

    // Tier 2: Coordinate-Aligned Table Grid
    if (extracted.alignedGrid.length >= 3) {
      const alignedReport = parseTimetableGrid(extracted.alignedGrid, 'PDF Aligned Table');
      if (alignedReport.success && alignedReport.slots.length >= 3) {
        return alignedReport;
      }
    }

    // Tier 3: Line-Grouped Table Grid
    if (extracted.grid.length >= 3) {
      const gridReport = parseTimetableGrid(extracted.grid, 'PDF Table');
      if (gridReport.success && gridReport.slots.length >= 3) {
        return gridReport;
      }
    }

    // Tier 4: Block Schedule Parser
    if (extracted.text.trim().length > 0) {
      const blockReport = parseBlockTimetable(extracted.text);
      if (blockReport.success && blockReport.slots.length >= 3) {
        return blockReport;
      }
    }

    // Tier 5: Structured Plain Text Parser
    if (extracted.text.trim().length > 0) {
      const textReport = parseTextTimetable(extracted.text);
      if (textReport.success && textReport.slots.length >= 3) {
        return textReport;
      }
    }

    return {
      success: false,
      slots: [],
      classes: [],
      teachers: [],
      totalSlots: 0,
      sheetName: 'PDF Document',
      layoutType: 'unknown',
      errorMessage:
        '⚠️ Không tìm thấy bảng Thời khóa biểu hợp lệ trong tệp PDF. Tệp có thể là ảnh quét (scan) hoặc định dạng bảng chưa chuẩn. Thầy/Cô vui lòng chuyển sang tab "Dán bảng / danh sách văn bản" để dán nội dung trực tiếp, hoặc tải tệp Excel (.xlsx)/Word (.docx).',
      warnings: [],
    };
  } catch (err: any) {
    return {
      success: false,
      slots: [],
      classes: [],
      teachers: [],
      totalSlots: 0,
      sheetName: 'PDF Document',
      layoutType: 'unknown',
      errorMessage: `Lỗi đọc tệp PDF: ${err.message || 'Không thể trích xuất văn bản từ PDF.'}`,
      warnings: [],
    };
  }
}

/**
 * Parse Teacher List from an uploaded PDF file (.pdf)
 */
export async function parsePdfTeacherListFile(file: File): Promise<Teacher[]> {
  try {
    const extracted = await extractTextAndGridFromPdf(file);

    // Tier 1: Coordinate-Aligned Table Grid
    if (extracted.alignedGrid.length > 0) {
      const teachers = extractTeachersFromGrid(extracted.alignedGrid);
      if (teachers.length > 0) return teachers;
    }

    // Tier 2: Line-Grouped Table Grid
    if (extracted.grid.length > 0) {
      const teachers = extractTeachersFromGrid(extracted.grid);
      if (teachers.length > 0) return teachers;
    }

    // Tier 3: Text line extraction
    if (extracted.text.trim().length > 0) {
      const teachers = parseTextTeacherList(extracted.text);
      if (teachers.length > 0) return teachers;
    }

    return [];
  } catch (err) {
    console.error('Lỗi khi đọc file PDF danh sách giáo viên:', err);
    return [];
  }
}

/**
 * Parse PPCT (Kế hoạch dạy học) from an uploaded PDF file (.pdf)
 */
export async function parsePdfPPCTFile(file: File): Promise<PPCTItem[]> {
  try {
    const extracted = await extractTextAndGridFromPdf(file);

    // Tier 1: Coordinate-Aligned Table Grid
    if (extracted.alignedGrid.length > 0) {
      const items = parsePPCTGrid(extracted.alignedGrid);
      if (items.length > 0) return items;
    }

    // Tier 2: Line-Grouped Table Grid
    if (extracted.grid.length > 0) {
      const items = parsePPCTGrid(extracted.grid);
      if (items.length > 0) return items;
    }

    // Tier 3: Text line extraction
    if (extracted.text.trim().length > 0) {
      const items = parseTextPPCT(extracted.text);
      if (items.length > 0) return items;
    }

    return [];
  } catch (err) {
    console.error('Lỗi khi đọc file PDF PPCT:', err);
    return [];
  }
}


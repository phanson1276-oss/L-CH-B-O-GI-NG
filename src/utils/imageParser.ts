import { createWorker } from 'tesseract.js';
import { TimetableSlot, PPCTItem, Teacher } from '../types';
import {
  parseTextTimetable,
  parseTextTeacherList,
  parseTextPPCT,
  TimetableParseReport,
} from './excelExporter';

export interface ImageParseResult {
  text: string;
  targetType: 'tkb' | 'ppct' | 'teacher';
  slots?: TimetableSlot[];
  tkbReport?: TimetableParseReport;
  ppctItems?: PPCTItem[];
  teachers?: Teacher[];
  success: boolean;
  message: string;
}

/**
 * Perform client-side OCR on an uploaded image file (.png, .jpg, .jpeg, .webp)
 * and extract structured data based on the target type.
 */
export async function parseImageFile(
  file: File,
  targetType: 'tkb' | 'ppct' | 'teacher',
  onProgress?: (percent: number, statusText: string) => void
): Promise<ImageParseResult> {
  let worker: any = null;

  try {
    if (onProgress) onProgress(10, 'Đang khởi tạo bộ máy nhận diện quang học (OCR)...');

    worker = await createWorker('vie+eng');

    if (onProgress) onProgress(35, 'Đang quét ảnh và nhận dạng ký tự tiếng Việt...');

    const ret = await worker.recognize(file);
    const rawText = ret?.data?.text || '';

    if (onProgress) onProgress(85, 'Đang bóc tách và định dạng dữ liệu bảng...');

    await worker.terminate();
    worker = null;

    if (!rawText.trim()) {
      return {
        text: '',
        targetType,
        success: false,
        message: 'Không tìm thấy ký tự hoặc chữ viết rõ ràng trong hình ảnh. Thầy/Cô vui lòng tải ảnh có độ nét và tương phản cao hơn.',
      };
    }

    if (targetType === 'teacher') {
      const teachers = parseTextTeacherList(rawText);
      return {
        text: rawText,
        targetType,
        teachers,
        success: teachers.length > 0,
        message:
          teachers.length > 0
            ? `Đã nhận diện thành công ${teachers.length} giáo viên từ hình ảnh!`
            : 'Đã đọc văn bản từ ảnh nhưng chưa phát hiện cấu trúc bảng giáo viên. Thầy/Cô có thể kiểm tra nội dung ở tab "Dán văn bản".',
      };
    } else if (targetType === 'tkb') {
      const tkbReport = parseTextTimetable(rawText);
      return {
        text: rawText,
        targetType,
        slots: tkbReport.slots,
        tkbReport,
        success: tkbReport.success && tkbReport.slots.length > 0,
        message:
          tkbReport.slots.length > 0
            ? `Đã nhận diện được ${tkbReport.slots.length} tiết TKB cho ${tkbReport.classes.length} lớp từ ảnh!`
            : 'Đã nhận diện văn bản từ ảnh TKB. Thầy/Cô vui lòng xem trước bảng đối chiếu bên dưới trước khi áp dụng.',
      };
    } else {
      // PPCT
      const ppctItems = parseTextPPCT(rawText);
      return {
        text: rawText,
        targetType,
        ppctItems,
        success: ppctItems.length > 0,
        message:
          ppctItems.length > 0
            ? `Đã trích xuất thành công ${ppctItems.length} bài học PPCT từ hình ảnh!`
            : 'Đã đọc văn bản từ ảnh PPCT. Thầy/Cô có thể xem lại bài học hoặc chỉnh sửa ở tab Dán văn bản.',
      };
    }
  } catch (err: any) {
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        // ignore cleanup error
      }
    }
    console.error('Lỗi nhận diện ảnh OCR:', err);
    return {
      text: '',
      targetType,
      success: false,
      message: `Không thể hoàn tất nhận diện ảnh: ${err.message || 'Lỗi xử lý hình ảnh'}. Thầy/Cô có thể sao chép văn bản vào tab "Dán văn bản" để nạp trực tiếp.`,
    };
  }
}

# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG ĐỌC CV CẢI TIẾN

## 🚀 CẢI TIẾN MỚI

Hệ thống CV đã được cập nhật để đọc và phân tích CV thực tế thay vì tạo dữ liệu mẫu.

### ✅ Các tính năng mới:

1. **Đọc CV từ file thực tế**: Không còn tạo dữ liệu mẫu
2. **Hỗ trợ OCR**: Đọc văn bản từ file ảnh (JPG, PNG)
3. **Trích xuất PDF**: Đọc nội dung từ file PDF
4. **Phân tích AI**: Sử dụng Gemini AI để phân tích chính xác
5. **Fallback thông minh**: Nếu không đọc được tự động, sẽ yêu cầu nhập thủ công

## 📋 CÁCH SỬ DỤNG

### 1. Tải CV lên hệ thống
- **File được hỗ trợ**: PDF, DOC, DOCX, JPG, PNG
- **Kích thước tối đa**: 10MB
- **Khuyến nghị**: Sử dụng file PDF hoặc DOCX để có kết quả tốt nhất

### 2. Quy trình xử lý
1. **File văn bản** (PDF, DOC, DOCX):
   - Hệ thống tự động đọc nội dung
   - Nếu không đọc được, sẽ yêu cầu nhập thủ công

2. **File ảnh** (JPG, PNG):
   - Sử dụng OCR để trích xuất văn bản
   - Nếu OCR thất bại, yêu cầu nhập thủ công
   - **Lưu ý**: Ảnh phải rõ nét và chữ dễ đọc

### 3. Thông tin được trích xuất
- **Thông tin cá nhân**: Họ tên, email, số điện thoại
- **Học vấn**: Bằng cấp, trường học, thời gian
- **Kinh nghiệm**: Vị trí, công ty, thời gian làm việc
- **Kỹ năng**: Các kỹ năng chuyên môn
- **Điểm đánh giá**: AI chấm điểm từ 0-100

## 🔧 XỬ LÝ SỰ CỐ

### Nếu không đọc được CV:
1. **Kiểm tra định dạng file**: Đảm bảo là PDF, DOC, DOCX, JPG, PNG
2. **Kiểm tra kích thước**: Phải < 10MB
3. **File ảnh**: Đảm bảo ảnh rõ nét, không bị mờ
4. **Nhập thủ công**: Khi được yêu cầu, hãy copy-paste nội dung CV

### Nếu thông tin không chính xác:
1. **Kiểm tra lại file CV**: Đảm bảo thông tin trong CV đúng định dạng
2. **Sử dụng file khác**: Thử với file PDF thay vì ảnh
3. **Nhập thủ công**: Nhập chính xác nội dung CV khi được yêu cầu

## 📈 MẸO SỬ DỤNG HIỆU QUẢ

### Để có kết quả tốt nhất:
1. **Sử dụng file PDF** với văn bản có thể select được
2. **CV có cấu trúc rõ ràng** với các mục được phân chia rõ
3. **Thông tin đầy đủ**: Bao gồm email, số điện thoại, kinh nghiệm
4. **Font chữ rõ ràng** (nếu là file ảnh)

### Định dạng CV khuyến nghị:
```
HỌ TÊN
Vị trí ứng tuyển

THÔNG TIN CÁ NHÂN:
Email: email@example.com
Điện thoại: 0123456789

HỌC VẤN:
- Bằng cấp - Trường học (Năm bắt đầu - Năm kết thúc)

KINH NGHIỆM:
- Vị trí - Công ty (Năm bắt đầu - Năm kết thúc)

KỸ NĂNG:
- Kỹ năng 1, Kỹ năng 2, Kỹ năng 3
```

## 🎯 ĐIỂM CHẤM AI

Hệ thống AI sẽ chấm điểm CV dựa trên:
- **Rõ ràng và chuyên nghiệp** (25 điểm)
- **Kinh nghiệm liên quan** (30 điểm)
- **Kỹ năng phù hợp** (25 điểm)
- **Học vấn** (20 điểm)

### Phân loại điểm:
- **90-100**: Xuất sắc (🔥)
- **80-89**: Tốt (⭐)
- **70-79**: Trung bình (👍)
- **< 70**: Cần cải thiện (📝)

## 🐛 BÁO LỖI

Nếu gặp lỗi, hãy kiểm tra:
1. **Console của trình duyệt** (F12) để xem lỗi chi tiết
2. **Kết nối internet** cho API calls
3. **API Key** Gemini có hoạt động không

---

*Cập nhật: Tháng 6/2025 - Phiên bản 2.0 với khả năng đọc CV thực tế*

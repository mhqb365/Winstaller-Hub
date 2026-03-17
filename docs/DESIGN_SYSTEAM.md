# DESIGN SYSTEM & UI/UX TOKENS - Winstaller Hub

> **Agent Protocol**: Mọi Agent khi sửa đổi hoặc thêm mới giao diện `WPF/XAML` trong dự án Winstaller-Hub PHẢI tuân thủ nghiêm ngặt chuẩn mực thiết kế này. Tuyệt đối không hard-code giao diện cũ của Windows (vuông vức, viền cứng).
> 
> **Concept Chính**: **Soft Pill & Liquid Glass** (Premium UI/UX 2026).

---

## 🎨 1. Hệ thống Màu sắc (Color Tokens)

Toàn bộ Brush đã được khai báo tập trung tại `App.xaml` (`<Application.Resources>`). **KHÔNG HARD CODE** mã màu Hex (như `#FFFFFF`) trực tiếp vào các `View`, bắt buộc sử dụng `{DynamicResource [Tên_Brush]}`.

### 🌌 Nền & Khung (Backgrounds)
- **`ShellWindowBackgroundBrush`**: Màu nền gốc (`#0B0F19`).
- **`ShellBackgroundBrush`**: Nền Gradient dạng Liquid Glass chìm sâu (Xanh đậm -> Tím than) dùng làm phông nền chính cho cấu trúc App.
- **`SidebarBackgroundBrush`**: Nền mờ cho menu Sidebar (`#22000000`).
- **`AppCardBackgroundBrush`** / **`DashboardCardBackgroundBrush`**: Nền mờ của các thẻ (Card, Panel) có hiệu ứng kính mờ nịnh mắt.

### 📝 Kiểu chữ (Typography Brushes)
- **`AppTextPrimaryBrush`** (`#F8FAFC`): Chữ trắng sáng - dùng cho Tiêu đề (Headers) và Text nội dung chính.
- **`AppTextSecondaryBrush`** (`#CBD5E1`): Chữ xám sáng - dùng cho Phụ đề (Subtitles), Mô tả (Descriptions).
- **`AppTextMutedBrush`** (`#94A3B8`): Chữ làm mờ - dùng cho Text ghi chú, trạng thái phụ (Status, Notes).
- **`AccentBrush`** (`#60A5FA`): Xanh sáng chủ đạo - dùng làm điểm nhấn, Icon hoặc hiệu ứng trạng thái.

---

## 📐 2. Hệ thống Hình khốì (Shape & Geometry Tokens)

Hệ thống giao diện sử dụng ngôn ngữ **Soft Pill** (Viên thuốc mềm mại), đặc biệt nói không với các góc vuông (`CornerRadius="0"`) ở các Box hiển thị chính.

- **`CornerRadius="24"`**: Chế độ bo góc siêu mượt dành riêng cho các Thẻ lớn, Bảng thông tin (Cards, Metric Panels, Detail Panels).
- **`CornerRadius="16"`**: Bo góc vừa cho danh sách Item List (Trending, Search Results) và Sidebar Item.
- **`CornerRadius="12"`**: Bo góc nhỏ dành cho các List Item ở trong các thẻ bảng hoặc Button vừa.

---

## ☁️ 3. Hiệu ứng Chiều sâu (Shadows & Depth)

Tuyệt đối không sử dụng Drop Shadow viền cứng lộn xộn. Sử dụng thiết lập chuẩn sau:

### Card Shadow (Trôi nổi sang trọng)
Dành cho thẻ `CardStyle` hoặc Panel lớn:
```xml
<DropShadowEffect BlurRadius="40" 
                  ShadowDepth="12" 
                  Direction="270"
                  Opacity="0.15" 
                  Color="Black" />
```

### Inner Panel / Metric Shadow (Trôi nổi nhẹ)
Dành cho các thẻ nhỏ trên Dashboard:
```xml
<DropShadowEffect BlurRadius="40" 
                  ShadowDepth="8" 
                  Direction="270"
                  Opacity="0.15" 
                  Color="Black" />
```

---

## 🗂️ 4. Quy chuẩn cấu trúc Danh sách (Tables / ListViews)

Bảng (`ListView`) mặc định của WPF quá cứng nhắc. Khi tạo bảng mới phải tuân thủ:
1. Gắn thuộc tính `BorderThickness="0"` cho mọi thẻ `<ListView>`. Tuyệt đối không dùng khung chìm thô (`BorderThickness="1"` kèm `BorderBrush`).
2. Tự động mượn cấu trúc `ItemContainerStyle` tại Resource `App.xaml` để mỗi Row được cách điệu thành một "Soft Pill" (`Padding="12,14"`, `Margin="0,2"`, `CornerRadius="12"`) có hiệu ứng Hover.
3. Không làm nổi bật `GridViewColumnHeader` (Tiêu đề cột). Thiết lập hiện tại sử dụng nền trong suốt, tách nhau bằng một dải phân cách mỏng `#15FFFFFF` ngang dưới đáy.

---

## 📚 5. Quy chuẩn Tái sử dụng (Reusability Styles)

Các khối View phải kế thừa Style ở thư viện trung tâm:
- `<Border Style="{StaticResource CardStyle}">`: Biến một cục Border thành một khối Soft Pill nổi tiêu chuẩn ngay lập tức (padding, radius, shadow đã định nghĩa tại `App.xaml`).
- Lấy Icon từ `Segoe MDL2 Assets` hoặc `ui:SymbolIcon` của hệ thống **ModernWpf**.
- `<TextBlock Style="{StaticResource HeaderStyle}">`: Định dạng tiêu đề lớn đầu trang tự động. 
- `<TextBlock Style="{StaticResource InfoLabel}">` và `<TextBlock Style="{StaticResource InfoValue}">`: Dành cho các cặp thuộc tính Nhãn/Giá trị.

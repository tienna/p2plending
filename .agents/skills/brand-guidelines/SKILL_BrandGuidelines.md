---
name: brand-guidelines
description: Áp dụng hướng dẫn thương hiệu chính thức cho dự án "AI Agent Skills" - một landing page SaaS hiện đại dành cho AI Developer. Hỗ trợ cả Light Mode (Clean Tech) và Dark Mode (Premium Neural) với điểm nhấn xanh neon rực rỡ.
license: Chỉ sử dụng nội bộ
source: Trích xuất trực tiếp từ Stitch project "AI Agent Skills - Dark Mode" (ID: 3865792257432253822)
lastAnalyzed: 2026-02-25
---

# Hướng dẫn Thương hiệu — AI Agent Skills

## Tổng quan (Overview)

Thương hiệu "AI Agent Skills" theo đuổi phong cách **Clean Tech / Modern SaaS** — chuyên nghiệp, hiện đại và đậm chất công nghệ. 

- **Light Mode**: Trắng tinh khiết, minh bạch, ưu tiên whitespace.
- **Dark Mode**: Màu đen xanh sâu thẳm (`#080F0A`), sử dụng Glassmorphism và hiệu ứng Neon Glow để tạo chiều sâu và cảm giác "Neural Network" cao cấp.

**Từ khóa**: SaaS, AI, Developer Tools, Clean, Minimal, Tech, Dark Mode, Neon Green, Glassmorphism, Premium.

---

## 1. Bảng màu (Color Palette)

### Màu chính (Primary Colors)

| Vai trò | Tên | Hex | Sử dụng |
|---------|-----|-----|---------|
| **Primary Accent** | Neon Green | `#11D442` | Nút CTA chính, icon highlight, text nhấn mạnh, logo |
| **Dark BG** | Deep Green-Black | `#080F0A` | Nền chính toàn bộ trang Dark Mode |
| **Light BG** | Pure White | `#FFFFFF` | Nền chính toàn bộ trang Light Mode |
| **Slate-100** | Off-White | `#F1F5F9` | Heading trong Dark Mode |
| **Slate-400** | Muted Gray | `#94A3B8` | Body text / Paragraph trong Dark Mode |
| **Selection** | Neon Green | `#11D442` | Màu highlight khi bôi đen text |

### Hiệu ứng Glass & Borders (Dark Mode)
- **Glass BG**: `rgba(17, 212, 66, 0.03)` kết hợp `backdrop-filter: blur(12px)`.
- **Neon Border**: `1px solid rgba(17, 212, 66, 0.4)` với `box-shadow` nhẹ bên trong.
- **Standard Border**: `1px solid rgba(17, 212, 66, 0.1)`.

### Gradient đặc trưng
```css
/* Dark Mode Hero Heading */
background: linear-gradient(to bottom, #F1F5F9 0%, #94A3B8 100%);
-webkit-background-clip: text;
color: transparent;

/* Hero background glow */
background: rgba(17, 212, 66, 0.2);
filter: blur(120px);
```

---

## 2. Nghệ thuật chữ (Typography)

**Font chính thức:** `Space Grotesk` (Geometric Sans-Serif)

### Phân cấp Typography (Dark Mode)

| Cấp độ | Kích thước | Font Weight | Màu | Ghi chú |
|--------|-----------|-------------|-----|---------|
| **Hero Heading (H1)** | `56px - 72px` | `700` | Gradient (Slate 100-400) + Primary Green | "Unlock the Power of **AI Agent Skills**" |
| **Section Heading (H2)** | `32px - 48px` | `700` | `#F1F5F9` (Slate-100) | Leading chặt chẽ, tracking nhỏ |
| **Card Title (H4)** | `20px` | `700` | `#F1F5F9` | Tiêu đề trong các khối glass cards |
| **Body Text** | `16px - 18px` | `400` | `#94A3B8` (Slate-400) | Dễ đọc trên nền tối, dòng cao (`leading-relaxed`) |
| **Label / Badge** | `12px` | `700` | `#11D442` | In hoa, `tracking-widest` |

---

## 3. Hệ thống UI Components

### Nút bấm (Buttons)

#### Primary Button (High Contrast)
```css
background-color: #11D442;
color: #080F0A; /* Text đen trên nền xanh neon để contrast mạnh nhất */
border-radius: 8px;
font-weight: 700;
transition: all 0.2s ease;
box-shadow: 0 10px 15px -3px rgba(17, 212, 66, 0.2);

/* Hover */
hover: transform: scale(1.05);
```

#### Glass Button
```css
background: rgba(17, 212, 66, 0.03);
backdrop-filter: blur(12px);
border: 1px solid rgba(17, 212, 66, 0.2);
color: #F1F5F9;
```

### Cards - Glassmorphism UI
Toàn bộ hệ thống cards trong Dark Mode sử dụng hiệu ứng kính:
```css
.glass-card {
  background: rgba(17, 212, 66, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(17, 212, 66, 0.1);
  border-radius: 16px;
  padding: 32px;
}

.neon-border-card {
  border: 1px solid rgba(17, 212, 66, 0.4);
  box-shadow: 0 0 20px rgba(17, 212, 66, 0.15);
}
```

---

## 4. Xử lý Hình ảnh & Icons

- **Icons**: Sử dụng **Material Symbols Outlined**. Màu mặc định là `#11D442`. Đặt trong khung `size-14` với nền `primary/10`.
- **Dashboard Preview**: Luôn có một quầng sáng xanh (`primary/20` blur-3xl) nằm phía dưới để tạo hiệu ứng nổi.
- **Status Indicator**: Sử dụng hiệu ứng `animate-ping` màu xanh neon cho các trạng thái "Live" hoặc "New".

---

## 5. Layout & Spacing (Grid System)

- **Navbar**: 20 (80px) height, sticky, background translucent (`background-dark/80`).
- **Hero Section**: Căn giữa hoàn toàn (Centered layout) hoặc Split layout.
- **Max Width**: `max-width: 1280px (7xl)` cho nội dung chính.
- **Spacing Element**: Sử dụng gap 6 (24px) cho card grid và gap 16 (64px) cho các section con.

---

## 6. Tổng kết — Checklist thiết kế (Dark Mode)

- [ ] ✅ Nền: **`#080F0A`** (Deep Dark Green-Black)
- [ ] ✅ Text: **Slate-100** (Headings) và **Slate-400** (Body)
- [ ] ✅ Hiệu ứng: Sử dụng **Glassmorphism** và **Neon Borders**
- [ ] ✅ Hover: Elements nên có hiệu ứng **scale 1.05** hoặc **brighten border**
- [ ] ✅ Quầng sáng: Sử dụng `blur-[120px]` với `bg-primary/20` cho các điểm nhấn quan trọng
- [ ] ✅ Font: Toàn bộ là **Space Grotesk**
- [ ] ❌ KHÔNG dùng màu đen thuần `#000000`
- [ ] ❌ KHÔNG dùng màu trắng thuần `#FFFFFF` cho body text (gây mỏi mắt)
- [ ] ❌ KHÔNG dùng bóng đổ đen harsh (chỉ dùng shadow-primary/20)

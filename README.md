# 🚛 Neo Siam Logistics - Pallet Management System

ระบบจัดการพาเลทสำหรับ Neo Siam Logistics บริษัทขนส่งและโลจิสติกส์ ที่ช่วยในการติดตาม ควบคุม และบริหารจัดการพาเลทในเครือข่ายสาขาทั้งหมด

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6.svg)
![Analytics](https://img.shields.io/badge/Analytics-Power_BI_Inspired-purple.svg)

---

## 📋 สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [คุณสมบัติหลัก](#คุณสมบัติหลัก)
- [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
- [การติดตั้ง](#การติดตั้ง)
- [การใช้งาน](#การใช้งาน)
- [โครงสร้างโปรเจค](#โครงสร้างโปรเจค)
- [การพัฒนา](#การพัฒนา)
- [การ Deploy](#การ-deploy)
- [License](#license)

---

## ภาพรวมระบบ

ระบบ Pallet Management ถูกออกแบบมาเพื่อ:

- ติดตามสต็อกพาเลทแบบเรียลไทม์ในทุกสาขา
- บันทึกการรับ-จ่ายพาเลทระหว่างสาขาและคู่ค้า
- จัดการการซ่อมบำรุงและแปรสภาพพาเลท
- วิเคราะห์ข้อมูลและให้คำแนะนำผ่าน AI Assistant

### ผู้ใช้งาน

- **Admin**: จัดการทุกสาขา ดูภาพรวมทั้งระบบ
- **User**: เข้าถึงเฉพาะสาขาที่ได้รับมอบหมาย

---

## คุณสมบัติหลัก

### 📊 Dashboard

- แสดงสถิติสต็อกแบบเรียลไทม์
- กราฟแสดงภาพรวมพาเลทแต่ละประเภท
- แจ้งเตือนพาเลท Loscam Red เกินขีดจำกัด

### 📝 Movement (การรับ-จ่าย)

- บันทึกการรับพาเลทเข้า
- บันทึกการจ่ายพาเลทออก
- รองรับการโอนระหว่างสาขา
- ประวัติการเคลื่อนไหวทั้งหมด

### 🔧 DSS (Decision Support System)

- ระบบซ่อมบำรุงพาเลทแบบ Batch
- คำนวณ Yield อัตโนมัติ
- แปลงสภาพพาเลท Loscam เป็นพาเลทหมุนเวียน

### 🤖 Neo AI Assistant

- ตอบคำถามเกี่ยวกับสต็อก
- แนะนำการจัดการพาเลท
- ใช้ Google Gemini AI
- รองรับภาษาไทย

### 📊 Analytics Dashboard (NEW!)

- **Business Intelligence แบบ Power BI**
- Date Range Drill-down (วัน/สัปดาห์/เดือน/ไตรมาส/ปี)
- Cross-Filtering (Interactive + Global)
- Dark/Light Mode (Glassmorphism Design)
- Real-time Data Updates
- Professional Charts (Recharts)
  - Line/Area Chart - แนวโน้มการเคลื่อนไหว
  - Pie/Donut Chart - สถานะรายการ
  - Bar Charts - วิเคราะห์ตามสาขา/ประเภทพาเลท
- Animated KPI Cards (Framer Motion)
- Export Ready (PDF/Excel)
- Thai Locale Formatting (date-fns)

---

## เทคโนโลยีที่ใช้

### Frontend

- **React 19.2.3** - UI Framework
- **TypeScript 5.8.2** - Type-safe JavaScript
- **Vite 6.2.0** - Build Tool
- **Tailwind CSS** - Styling Framework
- **Lucide React** - Icon Library

### Analytics & Visualization

- **Recharts** - Professional Charts Library
- **Zustand** - Modern State Management
- **Framer Motion** - Animation Library
- **date-fns** - Date Utilities (Thai Locale)

### AI Integration

- **Google Gemini AI** - AI Assistant

### Tools & Utilities

- **ESNext** - Modern JavaScript
- **Context API** - State Management
- **LocalStorage** - Data Persistence (ชั่วคราว)

---

## การติดตั้ง

### ข้อกำหนดระบบ

- Node.js >= 18.0.0
- npm >= 9.0.0

### ขั้นตอนการติดตั้ง

1. **Clone โปรเจค**

```bash
git clone <repository-url>
cd neo-siam-logistics---pallet-management-system
```

1. **ติดตั้ง Dependencies**

```bash
npm install
```

1. **ตั้งค่า Environment Variables**

```bash
# สร้างไฟล์ .env.local
cp .env.example .env.local

# แก้ไขไฟล์ .env.local และใส่ API Key
# GEMINI_API_KEY=your_actual_api_key_here
```

1. **รันในโหมด Development**

```bash
npm run dev
```

1. **เปิดเบราว์เซอร์**

```text
http://localhost:3000
```

---

## การใช้งาน

### การ Login

ใช้ username ใดก็ได้จากรายการ และรหัสผ่าน: `1234`

**Accounts ทดสอบ:**

- Admin: `admin` (เข้าถึงทุกสาขา)
- Hub NKS: `user_nks`
- Sai 3: `user_sai3`
- Chiang Mai: `user_cm`
- และอื่นๆ

### การบันทึก Movement

1. เลือก Tab "Movement"
2. เลือกประเภท: รับเข้า หรือ จ่ายออก
3. เลือกจุดหมาย (สาขา/คู่ค้า)
4. เลือกประเภทพาเลท
5. ใส่จำนวน
6. กด "Register Movement"

### การใช้ AI Assistant

1. เลือก Tab "Neo AI"
2. พิมพ์คำถาม เช่น:
   - "สต็อกพาเลทแดงที่ Hub เหลือเท่าไหร่"
   - "แนะนำการจัดการพาเลท"
   - "ควรส่งคืนพาเลทเช่าเมื่อไหร่"

---

## โครงสร้างโปรเจค

```text
neo-siam-logistics---pallet-management-system/
├── components/
│   ├── common/           # Shared components
│   │   ├── BrandLogo.tsx
│   │   └── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx # Error handling
├── contexts/             # React Contexts
│   ├── AuthContext.tsx
│   └── StockContext.tsx
├── services/            # API Services
│   └── geminiService.ts
├── utils/               # Utility functions
│   └── helpers.ts
├── App.tsx              # Main application
├── index.tsx            # Entry point
├── index.html           # HTML template
├── index.css            # Global styles
├── types.ts             # TypeScript types
├── constants.ts         # App constants
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript config
├── package.json         # Dependencies
├── .env.example         # Environment template
├── .gitignore
├── README.md
└── SYSTEM_AUDIT_REPORT.md  # Detailed audit report
```

---

## การพัฒนา

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Coding Standards

- ใช้ TypeScript strict mode
- ตั้งชื่อไฟล์ PascalCase สำหรับ Components
- ตั้งชื่อไฟล์ camelCase สำหรับ utilities
- เขียน JSDoc comments สำหรับฟังก์ชันสำคัญ

### Git Workflow

```bash
# สร้าง feature branch
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "feat: your feature description"

# Push to repository
git push origin feature/your-feature-name
```

---

## การ Deploy

### Build Production

```bash
npm run build
```

ไฟล์ที่ build จะอยู่ในโฟลเดอร์ `dist/`

### Deploy Options

1. **Vercel** (แนะนำ)

```bash
npm install -g vercel
vercel deploy
```

1. **Netlify**

```bash
npm install -g netlify-cli
netlify deploy
```

1. **Static Hosting**

- Upload โฟลเดอร์ `dist/` ไปยัง hosting ที่ต้องการ

---

## 📊 Performance

- **Lighthouse Score:** 90+ (เป้าหมาย)
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Bundle Size:** ~500KB (gzip)

---

## 🔐 Security Notes

⚠️ **สำคัญ**:

- รหัสผ่าน hard-coded ใน source code เป็นเพียงการทดสอบเท่านั้น
- สำหรับ Production ต้องใช้ Backend Authentication พร้อม Password Hashing
- ย้าย API Key ไปฝั่ง Backend
- เพิ่ม HTTPS และ Security Headers

---

## 📝 TODO (Development Roadmap)

### Phase 1: Security & Stability ⚠️ URGENT

- [ ] Backend API Integration
- [ ] Real Database (Firebase/MongoDB)
- [ ] JWT Authentication
- [ ] Password Hashing
- [ ] Environment Security

### Phase 2: Code Quality

- [ ] Component Refactoring
- [ ] Unit Tests (Vitest)
- [ ] E2E Tests (Playwright)
- [ ] ESLint + Prettier Setup
- [ ] CI/CD Pipeline

### Phase 3: Features

- [ ] Export to Excel/PDF
- [ ] Advanced Filtering
- [ ] Multi-language (TH/EN)
- [ ] Dark Mode
- [ ] Email Notifications

### Phase 4: Performance

- [ ] Code Splitting
- [ ] Lazy Loading
- [ ] Image Optimization
- [ ] Caching Strategy

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch
3. Commit your Changes
4. Push to the Branch
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## 👥 Team

### Neo Siam Logistics Development Team

---

## 📞 Support

หากพบปัญหาหรือมีคำถาม:

- 📧 Email: <support@neosiam.co.th>
- 📱 Tel: 02-XXX-XXXX
- 🌐 Website: <www.neosiam.co.th>

---

## 🙏 Acknowledgments

- React Team
- Vite Team
- Google Gemini AI
- Tailwind CSS Team
- All Open Source Contributors

---

## ❤️ Made with Love

### Neo Siam Development Team

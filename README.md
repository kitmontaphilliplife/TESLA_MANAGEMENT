# Package Setting — Package Configuration (Working Prototype)

Full-stack prototype ของหน้าจอ **Package Configuration** (โมดูล Package Setting, โปรเจกต์ TESLA Management) ต่อยอดจาก Mockup + Finding ที่สำรวจจาก online.philliplife.com

ครอบคลุมเฉพาะหน้า **Package Configuration** (ยังไม่รวม Package List / Create / Approve — เป็น mockup แบบ static ใน Design Canvas ที่ส่งให้ก่อนหน้านี้)

**อัปเดต:** ปรับ schema ใหม่ให้รองรับ SET_PACKAGE journey เต็มรูปแบบ — 1 Product (จาก TESLA_MASTER) มี distribution channel ของตัวเอง ระบบจะ derive ว่าต้องกรอก content แบบ **TESLA-B (F2F)**, **TESLA-C (Online)** หรือทั้งคู่ ตาม channel ที่ผูกไว้ ไม่ใช่ให้ทีม Content เลือกเอง — รายละเอียดการจับคู่ channel ดูที่ "Channel grouping" ด้านล่าง

## Stack

- **Frontend:** React 18 + TypeScript + Vite (ไม่อิง stack ของ TESLA/iApply จริง — เลือก stack มาตรฐานสำหรับทำ Prototype)
- **Backend:** Node.js + Express + TypeScript (รันด้วย `tsx`, ไม่ต้อง build แยก)
- **Database:** SQLite (ไฟล์เดียว `server/data/app.db`, สร้างและ seed อัตโนมัติ)

## โครงสร้างโปรเจกต์

```
app/
├── server/        # Express API + SQLite
│   └── src/
│       ├── db.ts             # schema (products, channel_group_mapping, packages, package_channel_content, ...)
│       ├── channelGroups.ts  # F2F/ONLINE/UNMAPPED classification (data-driven, see below)
│       ├── seed.ts           # ข้อมูลตัวอย่าง 3 product จริงจาก TESLA_MASTER
│       ├── routes/packages.ts
│       └── index.ts
└── client/        # React + TypeScript (Vite)
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── types.ts
        └── components/
            ├── ProductInformationCard.tsx  # F2F only
            ├── ChannelTabs.tsx             # channel switcher + unmapped-channel warning
            └── ...
```

## Channel grouping (F2F vs Online)

Distribution channel (`plan_Channel_Code` จาก TESLA_MASTER) แต่ละตัวถูกจัดกลุ่มผ่านตาราง `channel_group_mapping` (ข้อมูล ไม่ใช่โค้ด — แก้ผ่าน DB ได้โดยไม่ต้อง redeploy):

| channel_Code | ชื่อ | กลุ่ม | สถานะ |
|---|---|---|---|
| CHN01 | Agent | **F2F** | ยืนยันแล้ว |
| CHN02 | Broker | F2F | สันนิษฐานจากกฎ "ไม่มีคำว่า Online" |
| CHN03 | Bancassurance | F2F | สันนิษฐาน |
| CHN04 | Direct Online | **ONLINE** | ยืนยันจากชื่อ |
| CHN05 | Direct Marketing | **UNMAPPED** | รอ Product/Master ยืนยัน |
| CHN06 | Work Site | F2F | สันนิษฐาน |
| CHN07 | Agent Online | **ONLINE** | ยืนยันจากชื่อ |
| CHN08 | Broker Online | **ONLINE** | ยืนยันจากชื่อ |
| CHN09 | Partnership | **UNMAPPED** | รอ Product/Master ยืนยัน |

Product ที่มี channel เป็น `UNMAPPED` ปนอยู่ ยังสร้าง Package ได้ตามปกติสำหรับ channel ที่จัดกลุ่มแล้ว แต่ระบบจะขึ้น banner เตือนไว้บนหน้า Content (ไม่บล็อกการทำงาน) จนกว่าจะ map ให้ครบ

## วิธีรัน (ครั้งแรก)

ต้องมี Node.js 22+ ในเครื่อง (ใช้ `node:sqlite` ในตัว ไม่ต้อง compile native module ใดๆ)

**ครั้งแรกเท่านั้น** — seed ฐานข้อมูล (ต้องรันแยกต่างหาก เพราะ seed จะล้างข้อมูลเดิมทุกครั้งที่รัน ไม่ควรรันอัตโนมัติทุกครั้งที่ dev):
```bash
cd server
npm install
npm run seed
```

**รันจริง — เปิดแค่ terminal เดียว** ที่ `client` (สั่ง `npm run dev` ที่นี่จะสตาร์ท server ให้อัตโนมัติด้วย `concurrently`):
```bash
cd client
npm install
npm run dev    # สตาร์ททั้ง server (4000) และ client (5173) พร้อมกัน
```

> ถ้าอยากรันแค่ client อย่างเดียว (server รันอยู่ต่างหากแล้ว) ใช้ `npm run dev:client-only` แทน

เปิดเบราว์เซอร์ที่ `http://localhost:5173` — หน้าแรกคือ **Package List** กด "+ Add Package" เพื่อสร้างใหม่จาก product ที่ยังไม่มี Package (เช่น ENN001, PA0231) หรือกด "Edit" ที่แถวไหนก็ได้เพื่อดู 3 สถานการณ์ channel ที่ seed ไว้จาก product จริงจาก TESLA_MASTER:

| Plan Code | Product | Channel ที่ผูกไว้ | ผลลัพธ์ |
|---|---|---|---|
| **ENN019** | Tax Fighter 10/10 | Direct Online | เห็นแค่ฟอร์ม **TESLA-C (Online)** — content ครบทุก section |
| **WLN001** | Happy Value 90/20 | Agent, Broker, Bancassurance, Work Site, Partnership* | เห็นแค่ฟอร์ม **TESLA-B (F2F)** พร้อม Product information |
| **ENN002** | Max Ten One 10/1 Xtra | Agent, Broker, Bancassurance, Direct Online, Direct Marketing*, Work Site, Agent Online, Broker Online | เห็น **ทั้ง TESLA-B และ TESLA-C** สลับได้ด้วย tab |

\* มี channel ที่ยัง `UNMAPPED` ปนอยู่ (Partnership / Direct Marketing) — จะเห็น banner เตือนสีเหลืองด้านบน

## Deploy ให้เป็น public URL (เช่น แชร์ให้ SA ดู UI)

โปรเจกต์นี้เป็น full-stack (Express API + SQLite) ไม่ใช่แค่ static site เลย deploy ยากกว่า React ล้วนๆ นิดหน่อย แต่ตอนนี้ปรับโค้ดให้ deploy เป็น **service เดียว** ได้แล้ว (server เสิร์ฟหน้าเว็บของ client ให้ในตัว ไม่ต้องแยก 2 service ไม่ต้องกังวลเรื่อง CORS)

**แนะนำ [Render.com](https://render.com)** (มี free tier, รองรับ Node service ที่รันได้ตลอด ไม่ใช่แค่ static):

1. **Push โค้ดขึ้น GitHub** (ต้องมี GitHub account — สมัครฟรีที่ github.com ถ้ายังไม่มี)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
   แล้วสร้าง repo ใหม่บน GitHub (ปุ่ม "New repository") แล้ว push ตามคำสั่งที่ GitHub บอก
2. **สมัคร Render** (ฟรี ใช้ login ด้วย GitHub ได้เลย) ที่ render.com
3. กด **New → Web Service** เลือก repo ที่เพิ่ง push ไป
4. ตั้งค่า:
   - **Build Command:** `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command:** `cd server && npm run start:demo`
   - **Instance Type:** Free
5. กด Create — รอ build เสร็จ (ไม่กี่นาที) จะได้ URL แบบ `https://ชื่อ-xxxx.onrender.com` ที่ **ใครเปิดก็เข้าได้** ส่งลิงก์นี้ให้ SA ได้เลย

**หมายเหตุสำคัญเรื่องข้อมูล:** free tier ของ Render ไม่มี persistent disk (พื้นที่เก็บข้อมูลจะรีเซ็ตทุกครั้งที่ service หลับ/รีสตาร์ท ซึ่งจะเกิดหลังไม่มีคนเข้าประมาณ 15 นาที) — ผมเลยตั้งให้ `npm run start:demo` **สั่ง seed ข้อมูลใหม่ทุกครั้งที่ service เริ่มทำงาน** อัตโนมัติ เพื่อให้ SA เปิดเข้ามาแล้วเห็นข้อมูลตัวอย่างครบเสมอ (แลกกับการที่ถ้า SA แก้ไขอะไรแล้วปล่อยทิ้งไว้นาน service หลับแล้วตื่นใหม่ ข้อมูลที่แก้จะหายกลับไปเป็นค่าเริ่มต้น — เหมาะกับการ "ดู UI/flow" มากกว่าการเก็บข้อมูลระยะยาว)

ถ้าอยากได้ข้อมูลที่ persist จริง (ไม่รีเซ็ต) ต้องอัปเกรดเป็น paid plan ของ Render แล้วผูก Persistent Disk เข้ากับ path ที่กำหนดผ่าน environment variable `DATA_DIR` (และ `UPLOADS_DIR` สำหรับไฟล์ PDF ที่อัปโหลด) — โค้ดรองรับไว้แล้ว บอกได้ถ้าต้องการให้ช่วยตั้งค่าส่วนนี้เพิ่ม

ติดขั้นตอนไหนบอกได้เลยครับ ช่วยไล่ error ให้ได้เหมือนตอนตั้งค่าเครื่องคุณ

> หมายเหตุ: Google Fonts (Inter / Noto Sans Thai) โหลดผ่านอินเทอร์เน็ตปกติ — ถ้าเครื่องมีอินเทอร์เน็ต ฟอนต์จะแสดงตามที่ออกแบบไว้ทันที

## ฟีเจอร์ที่ทำงานได้จริง (เชื่อมกับฐานข้อมูล ไม่ใช่ mock)

- เลือก Product แล้วระบบ derive channel (F2F/Online) ให้อัตโนมัติจาก `channel_group_mapping` — พร้อม tab สลับเมื่อ product รองรับทั้ง 2 channel
- แก้ไข Thumbnail / Banner แยกค่ากันต่อ channel (บันทึกอัตโนมัติ 0.5 วินาทีหลังพิมพ์)
- **Key Features แบบ Dynamic** — เพิ่ม/ลบ/แก้ไขแถวได้จริง ไม่จำกัดจำนวน, ฝั่ง Online มี Icon Asset + Contractual payout toggle เพิ่มจากฝั่ง F2F
- **Product information (F2F only)** — Product Type (Normal/Takaful) + 3 กลุ่มรายการที่เพิ่ม/ลบเองได้ (แบบประกัน / ความคุ้มครองเพิ่มเติม / จุดเด่น)
- **Key Advantages เปิด/ปิดได้ทั้ง Section (Online only)** — toggle จริง พร้อมแก้ไข Header และการ์ดทั้ง 4
- **Package recommend (Online only)** — ค้นหา Product จริงจาก TESLA_MASTER cache เพิ่ม/เอาออกได้
- **Document (T&C) แยกต่อ channel** — อัปโหลดไฟล์ PDF จริง (เก็บไฟล์ที่ `server/uploads/`) + แสดงข้อความ T&C จาก Legal/Compliance ตามหมวดสินค้าแบบ read-only
- Campaign panel — read-only แสดงแคมเปญที่ผูกกับ**ช่องทางที่กำลังดูอยู่** (ไม่ใช่ทั้ง Package ตามที่ยืนยัน)
- Unmapped-channel warning — เตือนเมื่อ product มี distribution channel ที่ยังไม่ถูกจัดกลุ่ม F2F/Online
- Approval History — audit trail อัตโนมัติทุกครั้งที่มีการแก้ไข
- ปุ่ม "บันทึกฉบับร่าง" / "ส่งขออนุมัติ" เปลี่ยนสถานะ Package จริง (ระดับ Package ไม่ใช่ระดับ channel)

## ขอบเขตที่ยังไม่ทำ (Out of scope รอบนี้)

- หน้า Package List / Create-Edit (ข้อมูลพื้นฐาน) / Approve Package — มีเป็น Static Mockup ใน Design Canvas ที่ส่งให้ก่อนหน้านี้ ยังไม่ได้เขียนโค้ดจริง
- SET_CAMPAIGN/PROMOTION แบบเต็ม (Coupon/Cashback/Discount/Gift แยก field ตามประเภท) — ตอนนี้ Campaign เป็น record เดียวแบบง่าย ผูกไว้ที่ channel เพื่อพิสูจน์โครงสร้างเท่านั้น
- SET_SELLER (Agent/Non-Agent) — ยังไม่เริ่ม
- ระบบ Authentication/Authorization, การอัปโหลดรูปภาพจริง (Thumbnail/Banner ยังเป็น placeholder)
- Workflow การอนุมัติหลายระดับ (ISS-001 ใน BRD ยังรอยืนยัน)
- การเชื่อมต่อ TESLA_MASTER แบบ real-time — ตอนนี้ `products` เป็น cache ที่ seed จาก JSON ตัวอย่างจริง 3 รายการ ไม่ได้ดึงสดจาก API
- Mapping ของ CHN05 (Direct Marketing) และ CHN09 (Partnership) ยังไม่ยืนยันจากทีม Product/Master — ดู "Channel grouping" ด้านบน

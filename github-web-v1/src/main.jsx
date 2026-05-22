import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  Presentation,
  Search,
  ClipboardCheck,
  UploadCloud,
  CheckCircle2,
  Gavel,
  ImagePlus,
  Lock,
  MapPin,
  Maximize2,
  Plus,
  X,
} from "lucide-react";
import "./styles.css";

const transferDateDisplay = "15/05/69";
const transferDateIso = "2026-05-15";
const presentationPdfEndpoint =
  String(import.meta.env.VITE_PRESENTATION_PDF_ENDPOINT || "/api/presentation-summary/pdf").trim() ||
  "/api/presentation-summary/pdf";

const filterFields = [
  { name: "debtorName", label: "ชื่อลูกหนี้", type: "text", placeholder: "ระบุชื่อลูกหนี้" },
  { name: "customerId", label: "รหัสลูกค้า", type: "text", placeholder: "ระบุรหัสลูกค้า" },
  { name: "portfolio", label: "พอร์ตโฟลิโอ", type: "select", placeholder: "ทั้งหมด", options: ["SCB43", "KTB21", "BAY12", "TTB09"] },
  { name: "division", label: "สายงาน", type: "select", placeholder: "ทั้งหมด", options: ["บริหารสินทรัพย์", "กฎหมายและบังคับคดี", "ปรับโครงสร้างหนี้"] },
  { name: "department", label: "ฝ่ายงาน", type: "select", placeholder: "ทั้งหมด", options: ["ฝ่ายวิเคราะห์หนี้", "ฝ่ายติดตามหนี้", "ฝ่ายบริหารคดี"] },
  { name: "team", label: "กลุ่มงาน", type: "select", placeholder: "ทั้งหมด", options: ["กลุ่มงานเหนือ", "กลุ่มงานกลาง", "กลุ่มงานตะวันออก"] },
  { name: "aoName", label: "ชื่อ AO", type: "text", placeholder: "ระบุชื่อ AO" },
];

const menuItems = [
  { key: "search", label: "ค้นหาลูกหนี้", icon: Search },
  { key: "pendingApproval", label: "รายการที่รออนุมัติ", icon: ClipboardCheck },
];

const seedDebtors = [
  {
    customerId: "C-100284",
    debtorName: "บริษัท นวธารา อินดัสทรี จำกัด",
    portfolio: "SCB43",
    division: "ปรับโครงสร้างหนี้",
    department: "ฝ่ายวิเคราะห์หนี้",
    team: "กลุ่มงานกลาง",
    aoName: "กิตติภพ",
    balance: 12845000,
    legalStatus: "อยู่ระหว่างฟ้องร้อง",
  },
  {
    customerId: "C-100391",
    debtorName: "ห้างหุ้นส่วนจำกัด พี.เค. ซัพพลาย",
    portfolio: "KTB21",
    division: "กฎหมายและบังคับคดี",
    department: "ฝ่ายบริหารคดี",
    team: "กลุ่มงานตะวันออก",
    aoName: "สุภาพร",
    balance: 3650200,
    legalStatus: "บังคับคดี",
  },
  {
    customerId: "C-100477",
    debtorName: "คุณวิชาญ แสงอรุณ",
    portfolio: "BAY12",
    division: "บริหารสินทรัพย์",
    department: "ฝ่ายติดตามหนี้",
    team: "กลุ่มงานเหนือ",
    aoName: "วรัญญา",
    balance: 875430.75,
    legalStatus: "รอไกล่เกลี่ย",
  },
  {
    customerId: "C-100512",
    debtorName: "บริษัท เอเชีย พร็อพเพอร์ตี้ พลัส จำกัด",
    portfolio: "SCB43",
    division: "ปรับโครงสร้างหนี้",
    department: "ฝ่ายวิเคราะห์หนี้",
    team: "กลุ่มงานกลาง",
    aoName: "ธนกร",
    balance: 21438000,
    legalStatus: "พิพากษาแล้ว",
  },
  {
    customerId: "C-100638",
    debtorName: "คุณศศิธร เมืองทอง",
    portfolio: "TTB09",
    division: "บริหารสินทรัพย์",
    department: "ฝ่ายติดตามหนี้",
    team: "กลุ่มงานเหนือ",
    aoName: "วรัญญา",
    balance: 1249900,
    legalStatus: "สืบทรัพย์",
  },
];

const legalStatusStyles = {
  "อยู่ระหว่างฟ้องร้อง": "border-yellow-200 bg-yellow-50 text-yellow-800",
  "บังคับคดี": "border-red-200 bg-red-50 text-red-700",
  "รอไกล่เกลี่ย": "border-sky-200 bg-sky-50 text-sky-700",
  "พิพากษาแล้ว": "border-green-200 bg-green-50 text-green-700",
  "สืบทรัพย์": "border-sky-200 bg-sky-50 text-sky-700",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function safeFilePart(value, fallback = "document") {
  return String(value || fallback)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadPresentationSummaryPdf(payload) {
  const response = await fetch(presentationPdfEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/pdf",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const errorText = await response.text();
    const errorMessage = contentType.includes("text/html")
      ? `API สำหรับสร้าง PDF ไม่พร้อมใช้งานที่ ${presentationPdfEndpoint}`
      : errorText;
    throw new Error(errorMessage || "สร้าง PDF ไม่สำเร็จ");
  }

  const blob = await response.blob();
  downloadBlob(
    blob,
    `ใบสรุปนำเสนอ-${safeFilePart(payload.clientCode)}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}

const debtTemplateOptions = [
  { type: "first", label: "ประนอมหนี้ครั้งแรก" },
  { type: "previous", label: "เคยประนอมหนี้แล้ว" },
  { type: "remaining", label: "ประนอมหนี้ส่วนที่เหลือจากการขายทอด แต่หลักประกันยังไม่ตัดชำระ" },
];

const mockDebtorNames = [
  "บริษัท รุ่งเรืองแมชชีนพาร์ท จำกัด",
  "บริษัท บ้านสวน โฮลดิ้ง จำกัด",
  "ห้างหุ้นส่วนจำกัด อรุณทรานสปอร์ต",
  "คุณณัฐชยา พูนผล",
  "บริษัท เอสที อาหารแช่แข็ง จำกัด",
  "บริษัท ไพรม์พลาสติก อินดัสทรี จำกัด",
  "คุณประทีป วัฒนกิจ",
  "บริษัท เวลล์ลิงค์ เซอร์วิส จำกัด",
  "ห้างหุ้นส่วนจำกัด ธนโชติวัสดุ",
  "บริษัท ศรีนคร โลจิสติกส์ จำกัด",
  "คุณอัญชลี ศิริมงคล",
  "บริษัท ชัยวัฒนา คอนสตรัคชั่น จำกัด",
  "บริษัท พีเอส เมทัลเวิร์ค จำกัด",
  "คุณสุรชัย ศรีทอง",
  "บริษัท ทรัพย์ทวี พร็อพเพอร์ตี้ จำกัด",
];

const mockPortfolios = ["SCB43", "KTB21", "BAY12", "TTB09"];
const mockDivisions = ["ปรับโครงสร้างหนี้", "กฎหมายและบังคับคดี", "บริหารสินทรัพย์"];
const mockDepartments = ["ฝ่ายวิเคราะห์หนี้", "ฝ่ายบริหารคดี", "ฝ่ายติดตามหนี้"];
const mockTeams = ["กลุ่มงานกลาง", "กลุ่มงานตะวันออก", "กลุ่มงานเหนือ"];
const mockAoNames = ["กิตติภพ", "สุภาพร", "วรัญญา", "ธนกร", "ปวีณา"];
const mockLegalStatuses = ["อยู่ระหว่างฟ้องร้อง", "บังคับคดี", "รอไกล่เกลี่ย", "พิพากษาแล้ว", "สืบทรัพย์"];

const debtors = [
  ...seedDebtors,
  ...mockDebtorNames.map((debtorName, index) => ({
    customerId: `C-${100700 + index * 17}`,
    debtorName,
    portfolio: mockPortfolios[index % mockPortfolios.length],
    division: mockDivisions[index % mockDivisions.length],
    department: mockDepartments[index % mockDepartments.length],
    team: mockTeams[index % mockTeams.length],
    aoName: mockAoNames[index % mockAoNames.length],
    balance: 980000 + index * 1375000 + (index % 3) * 245000,
    legalStatus: mockLegalStatuses[index % mockLegalStatuses.length],
  })),
];

const debtTemplateTitleMap = {
  first: "กรณีประนอมหนี้ครั้งแรก",
  previous: "กรณีเคยประนอมหนี้แล้ว",
  remaining: "กรณีประนอมหนี้ส่วนที่เหลือจากการขายทอดตลาด และหลักประกันขายทอดตลาดแล้วแต่ยังไม่ตัดชำระ",
};

function debtTemplateTypeFromLabel(label = "") {
  return debtTemplateOptions.find((option) => label.includes(option.label) || option.label.includes(label))?.type || "";
}

const emptyFilters = filterFields.reduce((filters, field) => {
  filters[field.name] = "";
  return filters;
}, {});

function FilterField({ field, value, onChange }) {
  const baseClass =
    "mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{field.label}</span>
      {field.type === "select" ? (
        <select className={baseClass} value={value} onChange={(event) => onChange(field.name, event.target.value)}>
          <option value="">{field.placeholder}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={baseClass}
          type="text"
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      )}
    </label>
  );
}

function DebtorInfoCard({ debtor }) {
  if (!debtor) {
    return (
      <div className="rounded-lg border border-dashed border-[#b9dcf4] bg-white p-8 text-center text-sm text-slate-500">
        กรุณาเลือกรายการลูกหนี้จากหน้าค้นหาก่อน
      </div>
    );
  }

  const details = [
    ["รหัสลูกค้า", debtor.customerId],
    ["ชื่อลูกหนี้", debtor.debtorName],
    ["พอร์ตโฟลิโอ", debtor.portfolio],
    ["ยอดหนี้คงเหลือ", formatCurrency(debtor.balance)],
    ["สถานะทางกฎหมาย", debtor.legalStatus],
    ["ชื่อ AO", debtor.aoName],
  ];

  return (
    <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm shadow-blue-100/60">
      <h2 className="text-lg font-semibold text-[#003a70]">ข้อมูลโดยรวมของลูกหนี้</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {details.map(([label, value]) => (
          <div key={label} className="rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPage({ title, description, debtor, onBack }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm shadow-blue-100/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#005fac]">Workflow Page</p>
          <h2 className="mt-1 text-2xl font-bold text-[#003a70]">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#b9dcf4] bg-white px-4 text-sm font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
          onClick={onBack}
        >
          <ChevronLeft size={16} />
          กลับไปค้นหา
        </button>
      </div>

      <DebtorInfoCard debtor={debtor} />

      <div className="rounded-lg border border-dashed border-[#b9dcf4] bg-[#f8fcff] p-8 text-center">
        <p className="text-sm font-semibold text-[#003a70]">พื้นที่สำหรับรายละเอียดเพิ่มเติม</p>
        <p className="mt-2 text-sm text-slate-500">โครงหน้านี้เตรียมไว้แล้ว สามารถเติมฟอร์ม ตาราง หรือเนื้อหาตามแต่ละหัวข้อภายหลังได้</p>
      </div>
    </section>
  );
}

function createLegacyPresentationData(debtor) {
  const debtorName = debtor?.debtorName ?? "บริษัท นวธารา อินดัสทรี จำกัด";
  const balance = debtor?.balance ?? 12845000;

  return {
    account_id: debtor?.customerId ?? "C-100284",
    tab1_executive_summary: {
      user_inputs: {
        agenda_text: "ขออนุมัติแนวทางบริหารหนี้และการจัดทำสไลด์นำเสนอสำหรับคณะกรรมการ",
        key_issues_text: "ลูกหนี้มีภาระหนี้คงเหลือสูงและอยู่ระหว่างติดตามผลการเจรจา ควรเร่งสรุปเงื่อนไขชำระหนี้ให้ชัดเจน",
      },
      bbs_drawn_data: {
        port_lot: debtor?.portfolio ?? "SCB43",
        transfer_date: transferDateIso,
        holding_period_years: 2.8,
        case_status: debtor?.legalStatus ?? "อยู่ระหว่างฟ้องร้อง",
        asset_trace_status: "พบทรัพย์หลักประกัน 2 รายการ",
      },
      historical_settlements_1_4: [
        { row_name: "ภาระหนี้ ณ วันรับโอน", principal: balance * 0.68, interest: balance * 0.2, total_debt: balance, case_expense_b: 120000, separate_expense: 85000, day_one_cost: balance * 0.52, yield: balance * 0.07, total_cost: balance * 0.59 },
        { row_name: "ยอดประนอมหนี้เดิม", principal: balance * 0.5, interest: balance * 0.12, total_debt: balance * 0.62, case_expense_b: 90000, separate_expense: 50000, day_one_cost: balance * 0.45, yield: balance * 0.05, total_cost: balance * 0.5 },
        { row_name: "ข้อเสนอครั้งนี้", principal: balance * 0.36, interest: balance * 0.08, total_debt: balance * 0.44, case_expense_b: 60000, separate_expense: 25000, day_one_cost: balance * 0.4, yield: balance * 0.04, total_cost: balance * 0.44 },
      ],
      management_opinion_3_3: "รับชำระตามข้อเสนอครั้งนี้ช่วยลดความเสี่ยงด้านระยะเวลาการบังคับคดี และมีอัตรา Recovery สูงกว่าต้นทุนรับโอนรวมค่าใช้จ่าย ควรนำเสนอเพื่อพิจารณาอนุมัติตามเงื่อนไขที่เจรจาได้",
    },
    tab2_debtor_details: {
      calculated_summary: {
        user_defined_capacity_baht: 25000,
      },
      debtors_list: [
        {
          debtor_id: "D-001",
          role: "ลูกหนี้หลัก",
          bbs_profile: {
            fullname: debtorName,
            age: 48,
            occupation: "ธุรกิจขนส่งและคลังสินค้า",
            registered_address: "99/12 ถนนตัวอย่าง เขตบางรัก กรุงเทพมหานคร",
          },
          user_inputs: {
            income_sources: [
              { label: "รายได้จากธุรกิจหลัก", amount: 120000 },
              { label: "ค่าเช่าทรัพย์สิน", amount: 25000 },
            ],
            expense_details: [
              { label: "ต้นทุนดำเนินธุรกิจ", amount: 65000 },
              { label: "ค่าใช้จ่ายครอบครัว", amount: 28000 },
            ],
            notes: "ควรติดตาม statement เพิ่มเติม และเน้นเงื่อนไขชำระเงินงวดแรก",
          },
        },
        {
          debtor_id: "G-001",
          role: "ผู้ค้ำประกัน",
          bbs_profile: {
            fullname: "นายตัวอย่าง ผู้ค้ำประกัน",
            age: 52,
            occupation: "พนักงานบริษัทเอกชน",
            registered_address: "88/8 ถนนหลักประกัน อำเภอเมือง จังหวัดนนทบุรี",
          },
          user_inputs: {
            income_sources: [{ label: "เงินเดือน", amount: 58000 }],
            expense_details: [{ label: "ค่าใช้จ่ายส่วนตัว", amount: 30000 }],
            notes: "มีความสามารถช่วยชำระบางส่วน",
          },
        },
      ],
    },
    tab3_legal_history: {
      milestones: [
        { stage: "ยื่นฟ้อง", date: "2024-02-14", case_no: "พ.123/2567", capital_amount: balance, details: "ฟ้องเรียกชำระหนี้ตามสัญญา", status: "Done" },
        { stage: "ศาลพิพากษา", date: "2024-09-18", case_no: "พ.456/2567", capital_amount: balance, details: "ศาลพิพากษาให้ชำระหนี้", status: "Done" },
        { stage: "สวมสิทธิ", date: "2025-01-22", case_no: "คำร้องสวมสิทธิ", capital_amount: balance, details: "อยู่ระหว่างติดตามคำสั่ง", status: "Pending" },
        { stage: "ขายทอดตลาด", date: "2026-06-30", case_no: "บค.789/2569", capital_amount: balance, details: "รอกำหนดวันขายทอดตลาด", status: "Pending" },
      ],
    },
    tab4_debt_restructuring: {
      current_proposal_user_input: {
        total_settlement_amount: 3900000,
        principal_portion: 3100000,
        interest_portion: 800000,
        interest_rate_percent: 3.5,
        installments: [
          { period: "งวดที่ 1-12", amount: 20000 },
          { period: "งวดที่ 13-36", amount: 25000 },
          { period: "งวดสุดท้าย", amount: 3100000 },
        ],
      },
      bbs_historical_negotiations: [
        { round: "รอบที่ 1", proposed_amount: 2800000, result: "ไม่อนุมัติ", reason: "ต่ำกว่ากรอบรับชำระ" },
        { round: "รอบที่ 2", proposed_amount: 3400000, result: "รอเจรจา", reason: "ลูกหนี้ขอผ่อนชำระเพิ่ม" },
      ],
    },
    tab5_collateral_portfolio: {
      total_portfolio_valuation: 6200000,
      collateral_items: [
        {
          id: "COL-01",
          title_deed_no: "12345",
          asset_type: "ที่ดินพร้อมสิ่งปลูกสร้าง",
          address: "ต.ลำลูกกา อ.ลำลูกกา จ.ปทุมธานี",
          legal_owner: debtorName,
          collateral_status: "อยู่ระหว่างบังคับคดี",
          mortgage_amount: 4200000,
          latest_appraisal_value: 4800000,
          google_map_coordinates: { lat: 13.9322, lng: 100.7491 },
          images: [{ url: "", is_cover: true }],
        },
        {
          id: "COL-02",
          title_deed_no: "98765",
          asset_type: "ห้องชุด",
          address: "เขตวัฒนา กรุงเทพมหานคร",
          legal_owner: "ผู้ค้ำประกัน",
          collateral_status: "รอตรวจสอบราคาประเมิน",
          mortgage_amount: 1300000,
          latest_appraisal_value: 1400000,
          google_map_coordinates: { lat: 13.7367, lng: 100.5610 },
          images: [{ url: "", is_cover: true }],
        },
      ],
    },
  };
}

function LegacySlideBuilderPage({ debtor, onBack }) {
  const [activeTab, setActiveTab] = useState("executive");
  const [presentationData, setPresentationData] = useState(() => createPresentationData(debtor));
  const [expandedPeople, setExpandedPeople] = useState(["D-001"]);
  const [debtorProfileEditing, setDebtorProfileEditing] = useState(false);
  const [selectedCollateralId, setSelectedCollateralId] = useState(presentationData.tab5_collateral_portfolio.collateral_items[0]?.id ?? "");
  const [lightboxImage, setLightboxImage] = useState(null);

  const tabs = [
    { key: "executive", label: "บทสรุปผู้บริหาร", icon: Presentation },
    { key: "debtor", label: "รายละเอียดลูกหนี้", icon: FileText },
    { key: "legal", label: "ประวัติคดีความ", icon: Gavel },
    { key: "restructure", label: "การปรับโครงสร้างหนี้", icon: ClipboardCheck },
    { key: "collateral", label: "รายละเอียดหลักประกัน", icon: MapPin },
  ];

  const money = (value) => formatCurrency(Number(value || 0));
  const compactMoney = (value) => `${money(value)} บาท`;
  const selectedCollateral = presentationData.tab5_collateral_portfolio.collateral_items.find((item) => item.id === selectedCollateralId)
    ?? presentationData.tab5_collateral_portfolio.collateral_items[0];
  const appraisalHistory = [
    { year: "2564", type: "วันปรก", value: 3800000 },
    { year: "2565", type: "ทบทวน", value: 4200000 },
    { year: "2567", type: "ทบทวน", value: 4550000 },
    { year: "ล่าสุด", type: "ปัจจุบัน", value: selectedCollateral?.latest_appraisal_value ?? 0 },
  ];
  const maxAppraisal = Math.max(...appraisalHistory.map((item) => item.value), 1);

  const updateExecutiveInput = (field, value) => {
    setPresentationData((current) => ({
      ...current,
      tab1_executive_summary: {
        ...current.tab1_executive_summary,
        user_inputs: { ...current.tab1_executive_summary.user_inputs, [field]: value },
      },
    }));
  };

  const updateCapacity = (value) => {
    setPresentationData((current) => ({
      ...current,
      tab2_debtor_details: {
        ...current.tab2_debtor_details,
        calculated_summary: {
          ...current.tab2_debtor_details.calculated_summary,
          user_defined_capacity_baht: Number(value) || 0,
        },
      },
    }));
  };

  const updatePersonLine = (personId, group, index, field, value) => {
    setPresentationData((current) => ({
      ...current,
      tab2_debtor_details: {
        ...current.tab2_debtor_details,
        debtors_list: current.tab2_debtor_details.debtors_list.map((person) => {
          if (person.debtor_id !== personId) return person;
          const nextLines = person.user_inputs[group].map((line, lineIndex) =>
            lineIndex === index ? { ...line, [field]: field === "amount" ? Number(value) || 0 : value } : line,
          );
          return { ...person, user_inputs: { ...person.user_inputs, [group]: nextLines } };
        }),
      },
    }));
  };

  const updatePersonProfile = (personId, field, value) => {
    setPresentationData((current) => ({
      ...current,
      tab2_debtor_details: {
        ...current.tab2_debtor_details,
        debtors_list: current.tab2_debtor_details.debtors_list.map((person) =>
          person.debtor_id === personId
            ? { ...person, bbs_profile: { ...person.bbs_profile, [field]: field === "age" ? Number(value) || 0 : value } }
            : person,
        ),
      },
    }));
  };

  const addPersonLine = (personId, group) => {
    setPresentationData((current) => ({
      ...current,
      tab2_debtor_details: {
        ...current.tab2_debtor_details,
        debtors_list: current.tab2_debtor_details.debtors_list.map((person) =>
          person.debtor_id === personId
            ? { ...person, user_inputs: { ...person.user_inputs, [group]: [...person.user_inputs[group], { label: "", amount: 0 }] } }
            : person,
        ),
      },
    }));
  };

  const removePersonLine = (personId, group, index) => {
    setPresentationData((current) => ({
      ...current,
      tab2_debtor_details: {
        ...current.tab2_debtor_details,
        debtors_list: current.tab2_debtor_details.debtors_list.map((person) =>
          person.debtor_id === personId
            ? { ...person, user_inputs: { ...person.user_inputs, [group]: person.user_inputs[group].filter((_, lineIndex) => lineIndex !== index) } }
            : person,
        ),
      },
    }));
  };

  const updatePersonNotes = (personId, value) => {
    setPresentationData((current) => ({
      ...current,
      tab2_debtor_details: {
        ...current.tab2_debtor_details,
        debtors_list: current.tab2_debtor_details.debtors_list.map((person) =>
          person.debtor_id === personId
            ? { ...person, user_inputs: { ...person.user_inputs, notes: value } }
            : person,
        ),
      },
    }));
  };

  const togglePersonNoteStyle = (personId, styleKey) => {
    setPresentationData((current) => ({
      ...current,
      tab2_debtor_details: {
        ...current.tab2_debtor_details,
        debtors_list: current.tab2_debtor_details.debtors_list.map((person) => {
          if (person.debtor_id !== personId) return person;
          const note_style = person.user_inputs.note_style ?? {};
          return {
            ...person,
            user_inputs: {
              ...person.user_inputs,
              note_style: { ...note_style, [styleKey]: !note_style[styleKey] },
            },
          };
        }),
      },
    }));
  };

  const updateProposal = (field, value) => {
    setPresentationData((current) => ({
      ...current,
      tab4_debt_restructuring: {
        ...current.tab4_debt_restructuring,
        current_proposal_user_input: {
          ...current.tab4_debt_restructuring.current_proposal_user_input,
          [field]: field === "interest_rate_percent" ? Number(value) || 0 : Number(value) || 0,
        },
      },
    }));
  };

  const updateInstallment = (index, field, value) => {
    setPresentationData((current) => ({
      ...current,
      tab4_debt_restructuring: {
        ...current.tab4_debt_restructuring,
        current_proposal_user_input: {
          ...current.tab4_debt_restructuring.current_proposal_user_input,
          installments: current.tab4_debt_restructuring.current_proposal_user_input.installments.map((row, rowIndex) =>
            rowIndex === index ? { ...row, [field]: field === "amount" ? Number(value) || 0 : value } : row,
          ),
        },
      },
    }));
  };

  const updateCollateral = (field, value) => {
    setPresentationData((current) => ({
      ...current,
      tab5_collateral_portfolio: {
        ...current.tab5_collateral_portfolio,
        collateral_items: current.tab5_collateral_portfolio.collateral_items.map((item) =>
          item.id === selectedCollateral?.id
            ? { ...item, [field]: field.includes("value") || field.includes("amount") ? Number(value) || 0 : value }
            : item,
        ),
      },
    }));
  };

  const updateCollateralCoordinate = (field, value) => {
    setPresentationData((current) => ({
      ...current,
      tab5_collateral_portfolio: {
        ...current.tab5_collateral_portfolio,
        collateral_items: current.tab5_collateral_portfolio.collateral_items.map((item) =>
          item.id === selectedCollateral?.id
            ? { ...item, google_map_coordinates: { ...item.google_map_coordinates, [field]: Number(value) || 0 } }
            : item,
        ),
      },
    }));
  };

  const addCollateral = () => {
    const nextIndex = presentationData.tab5_collateral_portfolio.collateral_items.length + 1;
    const nextItem = {
      id: `COL-${String(nextIndex).padStart(2, "0")}`,
      title_deed_no: "",
      asset_type: "หลักประกันใหม่",
      address: "",
      legal_owner: "",
      collateral_status: "เพิ่มโดยผู้ใช้",
      mortgage_amount: 0,
      latest_appraisal_value: 0,
      google_map_coordinates: { lat: 13.7563, lng: 100.5018 },
      images: [],
    };
    setPresentationData((current) => ({
      ...current,
      tab5_collateral_portfolio: {
        ...current.tab5_collateral_portfolio,
        collateral_items: [...current.tab5_collateral_portfolio.collateral_items, nextItem],
      },
    }));
    setSelectedCollateralId(nextItem.id);
  };

  const addCollateralImages = (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !selectedCollateral) return;
    const images = files.map((file, index) => ({
      url: URL.createObjectURL(file),
      is_cover: (selectedCollateral.images?.length ?? 0) === 0 && index === 0,
    }));
    setPresentationData((current) => ({
      ...current,
      tab5_collateral_portfolio: {
        ...current.tab5_collateral_portfolio,
        collateral_items: current.tab5_collateral_portfolio.collateral_items.map((item) =>
          item.id === selectedCollateral.id ? { ...item, images: [...(item.images ?? []), ...images] } : item,
        ),
      },
    }));
  };

  const removeCollateralImage = (collateralId, imageIndex) => {
    setPresentationData((current) => ({
      ...current,
      tab5_collateral_portfolio: {
        ...current.tab5_collateral_portfolio,
        collateral_items: current.tab5_collateral_portfolio.collateral_items.map((item) =>
          item.id === collateralId
            ? { ...item, images: (item.images ?? []).filter((_, index) => index !== imageIndex) }
            : item,
        ),
      },
    }));
  };

  const people = presentationData.tab2_debtor_details.debtors_list;
  const totalIncome = people.reduce((sum, person) => sum + person.user_inputs.income_sources.reduce((lineSum, line) => lineSum + Number(line.amount || 0), 0), 0);
  const totalExpense = people.reduce((sum, person) => sum + person.user_inputs.expense_details.reduce((lineSum, line) => lineSum + Number(line.amount || 0), 0), 0);
  const netIncome = totalIncome - totalExpense;
  const capacity = presentationData.tab2_debtor_details.calculated_summary.user_defined_capacity_baht;
  const paymentRatio = netIncome > 0 ? (capacity / netIncome) * 100 : 0;

  const renderImageTile = (image, index, className = "", collateralId = selectedCollateral?.id) => (
    <button
      key={`${collateralId || "collateral"}-${image.url || "placeholder"}-${index}`}
      type="button"
      className={`group relative min-h-28 overflow-hidden rounded-md border border-[#b9dcf4] bg-[#e8f4fb] ${className}`}
      onClick={() => setLightboxImage(image)}
    >
      {image.url ? (
        <img src={image.url} alt="Collateral" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full min-h-28 flex-col items-center justify-center text-[#005088]">
          <ImagePlus size={26} />
          <span className="mt-2 text-xs font-semibold">Collateral image</span>
        </div>
      )}
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-[#005088] opacity-0 shadow-sm transition group-hover:opacity-100">
        <Maximize2 size={12} />
        Expand
      </span>
      {image.url && collateralId && (
        <span
          role="button"
          tabIndex={0}
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-white/95 px-2 py-1 text-[11px] font-semibold text-red-600 opacity-0 shadow-sm transition group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            removeCollateralImage(collateralId, index);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              removeCollateralImage(collateralId, index);
            }
          }}
        >
          <X size={12} />
          ลบ
        </span>
      )}
    </button>
  );

  return (
    <main className="min-h-screen bg-[#edf6fb] text-slate-900 lg:flex">
      <aside className="border-b border-[#c8e3f7] bg-white shadow-sm lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-[#d7eaf8] px-5 py-6">
          <button
            type="button"
            className="mb-5 inline-flex h-10 items-center gap-2 rounded-md border border-[#b9dcf4] bg-white px-4 text-sm font-semibold text-[#005088] transition hover:bg-[#eef7ff]"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            กลับหน้ารายการอนุมัติ
          </button>
          <p className="text-sm font-semibold text-[#005088]">Executive Presentation Builder</p>
          <h1 className="mt-1 text-xl font-bold text-[#003a70]">สร้างสไลด์นำเสนอ</h1>
          <p className="mt-2 text-sm text-slate-500">{presentationData.account_id} • {debtor?.debtorName ?? presentationData.tab2_debtor_details.debtors_list[0]?.bbs_profile.fullname}</p>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible lg:p-4">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`flex min-h-12 shrink-0 items-center gap-3 rounded-md px-4 text-left text-sm font-semibold transition lg:w-full ${
                  active ? "bg-[#005088] text-white shadow-sm" : "text-slate-700 hover:bg-[#eef7ff] hover:text-[#005088]"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${active ? "bg-white text-[#005088]" : "bg-[#e6f3fc] text-[#005088]"}`}>
                  {index + 1}
                </span>
                <Icon size={17} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
        <header className="overflow-hidden rounded-lg border border-[#b9dcf4] bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-[#005088] via-[#0b6fa8] to-[#11caa0]" />
          <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#005088]">Presentation Screen View</p>
              <h2 className="mt-1 text-2xl font-bold text-[#003a70] sm:text-3xl">{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
              <p className="mt-1 text-sm text-slate-500">Interactive corporate presentation dashboard</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[
                ["Port Lot", presentationData.tab1_executive_summary.bbs_drawn_data.port_lot],
                ["Case", presentationData.tab1_executive_summary.bbs_drawn_data.case_status],
                ["Holding", `${presentationData.tab1_executive_summary.bbs_drawn_data.holding_period_years} ปี`],
                ["Portfolio", compactMoney(presentationData.tab5_collateral_portfolio.total_portfolio_valuation)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-[#d7eaf8] bg-[#f8fcff] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 font-bold text-[#005088]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {activeTab === "executive" && (
          <section className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-[#003a70]">วาระการนำเสนอ / ประเด็นสำคัญ</h2>
                <textarea
                  className="mt-4 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#005088] focus:ring-2 focus:ring-[#b9dcf4]"
                  value={presentationData.tab1_executive_summary.user_inputs.agenda_text}
                  onChange={(event) => updateExecutiveInput("agenda_text", event.target.value)}
                />
                <textarea
                  className="mt-3 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#005088] focus:ring-2 focus:ring-[#b9dcf4]"
                  value={presentationData.tab1_executive_summary.user_inputs.key_issues_text}
                  onChange={(event) => updateExecutiveInput("key_issues_text", event.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Port Lot", presentationData.tab1_executive_summary.bbs_drawn_data.port_lot],
                  ["Transfer Date", presentationData.tab1_executive_summary.bbs_drawn_data.transfer_date],
                  ["Holding Period", `${presentationData.tab1_executive_summary.bbs_drawn_data.holding_period_years} ปี`],
                  ["Case Status", presentationData.tab1_executive_summary.bbs_drawn_data.case_status],
                  ["Asset Trace", presentationData.tab1_executive_summary.bbs_drawn_data.asset_trace_status],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#c8e3f7] bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-2 text-lg font-bold text-[#005088]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#003a70]">สรุปผลการชำระหนี้เดิม Section 1.4</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full table-fixed border-collapse text-sm">
                  <thead className="bg-[#eef7ff] text-[#005088]">
                    <tr>
                      {["รายการ", "เงินต้น", "ดอกเบี้ย", "รวมภาระหนี้", "ค่าใช้จ่าย ข.", "ค่าใช้จ่ายต่างหาก", "Day One", "Yield", "รวมต้นทุน"].map((heading) => (
                        <th key={heading} className="border border-[#b9dcf4] px-3 py-2 text-left font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {presentationData.tab1_executive_summary.historical_settlements_1_4.map((row) => (
                      <tr key={row.row_name}>
                        <td className="border border-[#d7eaf8] px-3 py-2 font-semibold text-slate-800">{row.row_name}</td>
                        {[row.principal, row.interest, row.total_debt, row.case_expense_b, row.separate_expense, row.day_one_cost, row.yield, row.total_cost].map((value, index) => (
                          <td key={index} className="border border-[#d7eaf8] px-3 py-2 text-right tabular-nums">{money(value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-bold text-[#003a70]">Collateral thumbnails</h2>
                  <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#b9dcf4] bg-[#f8fcff] px-3 text-xs font-semibold text-[#005088] hover:bg-[#eef7ff]">
                    <UploadCloud size={15} />
                    Import รูปภาพ
                    <input type="file" multiple className="sr-only" onChange={addCollateralImages} />
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {presentationData.tab5_collateral_portfolio.collateral_items.flatMap((item) =>
                    (item.images?.length ? item.images : [{ url: "", is_cover: true }]).map((image, index) => renderImageTile(image, index, "", item.id)),
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-[#c8e3f7] bg-[#005088] p-6 text-white shadow-sm">
                <p className="text-sm font-semibold text-[#88f4dc]">ข้อมูลสรุปการบริหาร Section 3.3</p>
                <p className="mt-4 text-2xl font-semibold leading-relaxed">{presentationData.tab1_executive_summary.management_opinion_3_3}</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "debtor" && (
          <section className="space-y-5">
            <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#003a70]">ข้อมูลส่วนตัวลูกหนี้ / ผู้ค้ำประกัน</h2>
                  <p className="mt-1 text-sm text-slate-500">ข้อมูลตั้งต้นดึงจากระบบ BBS และสามารถแก้ไขแล้วบันทึกไว้ในหน้าพรีเซนต์นี้ได้</p>
                </div>
                <button
                  type="button"
                  className={`h-10 rounded-md px-4 text-sm font-semibold ${debtorProfileEditing ? "bg-[#1a9b63] text-white" : "border border-[#b9dcf4] bg-white text-[#005088]"}`}
                  onClick={() => setDebtorProfileEditing((current) => !current)}
                >
                  {debtorProfileEditing ? "บันทึกข้อมูล" : "แก้ไขข้อมูล"}
                </button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {people.map((person) => (
                  <div key={person.debtor_id} className="rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
                    <p className="text-xs font-semibold text-[#005088]">{person.role}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="text-xs font-semibold text-slate-500">ชื่อลูกหนี้</span>
                        <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:font-semibold" value={person.bbs_profile.fullname} disabled={!debtorProfileEditing} onChange={(event) => updatePersonProfile(person.debtor_id, "fullname", event.target.value)} />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-500">อายุ</span>
                        <input type="number" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm disabled:border-transparent disabled:bg-transparent disabled:px-0" value={person.bbs_profile.age} disabled={!debtorProfileEditing} onChange={(event) => updatePersonProfile(person.debtor_id, "age", event.target.value)} />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-500">อาชีพ / ธุรกิจ</span>
                        <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm disabled:border-transparent disabled:bg-transparent disabled:px-0" value={person.bbs_profile.occupation ?? ""} disabled={!debtorProfileEditing} onChange={(event) => updatePersonProfile(person.debtor_id, "occupation", event.target.value)} placeholder="ระบุอาชีพหรือธุรกิจ" />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-xs font-semibold text-slate-500">ที่อยู่ตามทะเบียนบ้าน</span>
                        <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm disabled:border-transparent disabled:bg-transparent disabled:px-0" value={person.bbs_profile.registered_address} disabled={!debtorProfileEditing} onChange={(event) => updatePersonProfile(person.debtor_id, "registered_address", event.target.value)} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                ["ผลรวมรายได้", compactMoney(totalIncome)],
                ["ผลรวมรายจ่าย", compactMoney(totalExpense)],
                ["รายได้คงเหลือ", compactMoney(netIncome)],
                ["ความสามารถชำระ", compactMoney(capacity)],
                ["สัดส่วน 4/3", `${paymentRatio.toFixed(1)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#c8e3f7] bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-bold text-[#005088]">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
              <label className="block max-w-sm">
                <span className="text-sm font-semibold text-slate-700">ความสามารถในการชำระหนี้ปัจจุบัน</span>
                <input
                  type="number"
                  className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-[#005088] focus:ring-2 focus:ring-[#b9dcf4]"
                  value={capacity}
                  onChange={(event) => updateCapacity(event.target.value)}
                />
              </label>
            </div>
            {people.map((person) => {
              const expanded = expandedPeople.includes(person.debtor_id);
              const incomeTotal = person.user_inputs.income_sources.reduce((sum, line) => sum + Number(line.amount || 0), 0);
              const expenseTotal = person.user_inputs.expense_details.reduce((sum, line) => sum + Number(line.amount || 0), 0);
              const noteStyle = person.user_inputs.note_style ?? {};
              return (
                <div key={person.debtor_id} className="rounded-lg border border-[#c8e3f7] bg-white shadow-sm">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                    onClick={() => setExpandedPeople((current) => expanded ? current.filter((id) => id !== person.debtor_id) : [...current, person.debtor_id])}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#005088]">{person.role}</p>
                      <h2 className="text-lg font-bold text-[#003a70]">{person.bbs_profile.fullname}</h2>
                      <p className="text-sm text-slate-500">อายุ {person.bbs_profile.age} ปี • {person.bbs_profile.registered_address}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#005088]">{expanded ? "ย่อ" : "ขยาย"}</span>
                  </button>
                  {expanded && (
                    <div className="grid gap-5 border-t border-[#d7eaf8] p-5 lg:grid-cols-2">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-[#003a70]">รายได้</h3>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#b9dcf4] bg-[#f8fcff] px-3 text-xs font-semibold text-[#005088] hover:bg-[#eef7ff]"
                            onClick={() => addPersonLine(person.debtor_id, "income_sources")}
                          >
                            <Plus size={13} />
                            เพิ่มรายได้
                          </button>
                        </div>
                        {person.user_inputs.income_sources.map((line, index) => (
                          <div key={index} className="mt-3 grid grid-cols-[1fr_150px_auto] gap-3">
                            <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="แหล่งที่มารายได้" value={line.label} onChange={(event) => updatePersonLine(person.debtor_id, "income_sources", index, "label", event.target.value)} />
                            <input type="number" className="h-10 rounded-md border border-slate-300 px-3 text-right text-sm" placeholder="จำนวนเงิน" value={line.amount} onChange={(event) => updatePersonLine(person.debtor_id, "income_sources", index, "amount", event.target.value)} />
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => removePersonLine(person.debtor_id, "income_sources", index)}
                              disabled={person.user_inputs.income_sources.length <= 1}
                              title="ลบรายการรายได้"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                        <p className="mt-3 text-right text-sm font-bold text-[#005088]">รวม {compactMoney(incomeTotal)}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-[#003a70]">รายจ่าย</h3>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#b9dcf4] bg-[#f8fcff] px-3 text-xs font-semibold text-[#005088] hover:bg-[#eef7ff]"
                            onClick={() => addPersonLine(person.debtor_id, "expense_details")}
                          >
                            <Plus size={13} />
                            เพิ่มรายจ่าย
                          </button>
                        </div>
                        {person.user_inputs.expense_details.map((line, index) => (
                          <div key={index} className="mt-3 grid grid-cols-[1fr_150px_auto] gap-3">
                            <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="รายละเอียดค่าใช้จ่าย" value={line.label} onChange={(event) => updatePersonLine(person.debtor_id, "expense_details", index, "label", event.target.value)} />
                            <input type="number" className="h-10 rounded-md border border-slate-300 px-3 text-right text-sm" placeholder="จำนวนเงิน" value={line.amount} onChange={(event) => updatePersonLine(person.debtor_id, "expense_details", index, "amount", event.target.value)} />
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => removePersonLine(person.debtor_id, "expense_details", index)}
                              disabled={person.user_inputs.expense_details.length <= 1}
                              title="ลบรายการรายจ่าย"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                        <p className="mt-3 text-right text-sm font-bold text-[#005088]">รวม {compactMoney(expenseTotal)}</p>
                      </div>
                      <div className="lg:col-span-2">
                        <div className="mb-2 flex flex-wrap gap-2">
                          {[
                            ["bold", "B"],
                            ["italic", "I"],
                            ["highlight", "Highlight"],
                            ["red", "Red"],
                          ].map(([styleKey, label]) => (
                            <button
                              key={styleKey}
                              type="button"
                              className={`rounded border px-2 py-1 text-xs font-semibold transition ${
                                noteStyle[styleKey]
                                  ? styleKey === "highlight"
                                    ? "border-yellow-200 bg-yellow-100 text-yellow-900"
                                    : styleKey === "red"
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : "border-[#005088] bg-[#eef7ff] text-[#005088]"
                                  : "border-[#b9dcf4] bg-white text-[#005088] hover:bg-[#eef7ff]"
                              }`}
                              onClick={() => togglePersonNoteStyle(person.debtor_id, styleKey)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className={`min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#005088] focus:ring-2 focus:ring-[#b9dcf4] ${
                            noteStyle.bold ? "font-bold" : ""
                          } ${noteStyle.italic ? "italic" : ""} ${noteStyle.highlight ? "bg-yellow-50" : ""} ${noteStyle.red ? "text-red-700" : ""}`}
                          value={person.user_inputs.notes}
                          onChange={(event) => updatePersonNotes(person.debtor_id, event.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {activeTab === "legal" && (
          <section className="space-y-5">
            <div className="rounded-lg border border-[#c8e3f7] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#005088]">Legal Case Timeline</p>
                  <h2 className="mt-1 text-xl font-bold text-[#003a70]">ความคืบหน้าคดีของลูกหนี้และผู้เกี่ยวข้อง</h2>
                </div>
                <span className="rounded-full border border-[#b9dcf4] bg-[#f8fcff] px-3 py-1 text-xs font-semibold text-[#005088]">
                  อ้างอิงข้อมูลคดีจากระบบ BBS
                </span>
              </div>

              <div className="mt-8 overflow-x-auto pb-2">
                <div className="relative grid min-w-[920px] grid-cols-4 gap-5">
                  <div className="absolute left-10 right-10 top-6 h-1 rounded bg-[#d7eaf8]" />
                  {presentationData.tab3_legal_history.milestones.map((item) => {
                    const done = item.status === "Done";
                    return (
                      <div key={item.stage} className="relative rounded-lg border border-[#d7eaf8] bg-[#f8fcff] p-4 shadow-sm">
                        <span className={`relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-sm ${done ? "bg-[#11caa0] text-white" : "bg-yellow-100 text-yellow-800"}`}>
                          {done ? <CheckCircle2 size={20} /> : <Gavel size={20} />}
                        </span>
                        <h3 className="mt-4 text-base font-bold text-[#003a70]">{item.stage}</h3>
                        <p className="mt-1 text-xs font-semibold text-[#005088]">{item.date}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.case_no}</p>
                        <p className="mt-3 min-h-12 text-sm text-slate-700">{item.details}</p>
                        <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#005088]">ทุนทรัพย์ {compactMoney(item.capital_amount)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#c8e3f7] bg-white shadow-sm">
              <table className="min-w-full table-fixed border-collapse text-sm">
                <thead className="bg-[#eef7ff] text-[#005088]">
                  <tr>
                    {["ลำดับ", "ขั้นตอนคดี", "วันที่", "เลขคดี / คำร้อง", "สถานะ", "รายละเอียด"].map((heading) => (
                      <th key={heading} className="border border-[#d7eaf8] px-3 py-2 text-left font-semibold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {presentationData.tab3_legal_history.milestones.map((item, index) => (
                    <tr key={item.stage}>
                      <td className="border border-[#d7eaf8] px-3 py-2 font-semibold text-[#005088]">{index + 1}</td>
                      <td className="border border-[#d7eaf8] px-3 py-2 font-semibold text-slate-800">{item.stage}</td>
                      <td className="border border-[#d7eaf8] px-3 py-2">{item.date}</td>
                      <td className="border border-[#d7eaf8] px-3 py-2">{item.case_no}</td>
                      <td className="border border-[#d7eaf8] px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === "Done" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-800"}`}>
                          {item.status === "Done" ? "ดำเนินการแล้ว" : "อยู่ระหว่างดำเนินการ"}
                        </span>
                      </td>
                      <td className="border border-[#d7eaf8] px-3 py-2 text-slate-700">{item.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "restructure" && (
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#003a70]">ข้อเสนอปัจจุบัน</h2>
              {[
                ["total_settlement_amount", "ยอดเงินขออนุมัติรับชำระหนี้รวม"],
                ["principal_portion", "เงินต้น"],
                ["interest_portion", "ดอกเบี้ยค้างเดิม"],
                ["interest_rate_percent", "อัตราดอกเบี้ยใหม่ (%)"],
              ].map(([field, label]) => (
                <label key={field} className="mt-4 block">
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <input type="number" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={presentationData.tab4_debt_restructuring.current_proposal_user_input[field]} onChange={(event) => updateProposal(field, event.target.value)} />
                </label>
              ))}
              <div className="mt-5 overflow-hidden rounded-md border border-[#d7eaf8]">
                <table className="w-full text-sm">
                  <thead className="bg-[#eef7ff] text-[#005088]"><tr><th className="px-3 py-2 text-left">งวด</th><th className="px-3 py-2 text-right">จำนวนเงิน</th></tr></thead>
                  <tbody>
                    {presentationData.tab4_debt_restructuring.current_proposal_user_input.installments.map((row, index) => (
                      <tr key={index} className="border-t border-[#d7eaf8]">
                        <td className="px-3 py-2"><input className="h-9 w-full rounded border border-slate-200 px-2" value={row.period} onChange={(event) => updateInstallment(index, "period", event.target.value)} /></td>
                        <td className="px-3 py-2"><input type="number" className="h-9 w-full rounded border border-slate-200 px-2 text-right" value={row.amount} onChange={(event) => updateInstallment(index, "amount", event.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#003a70]">รอบเจรจาประนีประนอมจาก BBS</h2>
              <div className="mt-4 space-y-3">
                {presentationData.tab4_debt_restructuring.bbs_historical_negotiations.map((round) => (
                  <div key={round.round} className="rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-[#003a70]">{round.round}</p>
                      <p className="font-bold text-[#005088]">{compactMoney(round.proposed_amount)}</p>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{round.result}</p>
                    <p className="mt-1 text-sm text-slate-500">{round.reason}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 overflow-x-auto rounded-md border border-[#d7eaf8]">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-[#eef7ff] text-[#005088]">
                    <tr>
                      {["รอบ", "เงินต้น", "ดอกเบี้ย", "ค่าใช้จ่าย", "ภาระหนี้รวม", "ยอดชำระแล้ว", "ความคืบหน้า"].map((heading) => (
                        <th key={heading} className="border border-[#d7eaf8] px-3 py-2 text-left font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {presentationData.tab4_debt_restructuring.bbs_historical_negotiations.map((round, index) => {
                      const principal = round.proposed_amount * 0.72;
                      const interest = round.proposed_amount * 0.2;
                      const expense = round.proposed_amount * 0.08;
                      const paid = index === 0 ? round.proposed_amount * 0.18 : round.proposed_amount * 0.08;
                      return (
                        <tr key={`${round.round}-terms`}>
                          <td className="border border-[#d7eaf8] px-3 py-2 font-semibold text-[#003a70]">{round.round}</td>
                          <td className="border border-[#d7eaf8] px-3 py-2 text-right tabular-nums">{money(principal)}</td>
                          <td className="border border-[#d7eaf8] px-3 py-2 text-right tabular-nums">{money(interest)}</td>
                          <td className="border border-[#d7eaf8] px-3 py-2 text-right tabular-nums">{money(expense)}</td>
                          <td className="border border-[#d7eaf8] px-3 py-2 text-right font-semibold tabular-nums">{money(round.proposed_amount)}</td>
                          <td className="border border-[#d7eaf8] px-3 py-2 text-right tabular-nums">{money(paid)}</td>
                          <td className="border border-[#d7eaf8] px-3 py-2">{round.result}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "collateral" && (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-[#c8e3f7] bg-[#005088] p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#88f4dc]">Collateral Portfolio Overview</p>
                <h2 className="text-3xl font-bold">รายละเอียดหลักประกัน</h2>
              </div>
              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#11caa0] px-4 text-sm font-bold text-[#003a70]" onClick={addCollateral}>
                <Plus size={16} />
                Add New Collateral Item
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                ["รหัสลูกค้า", presentationData.account_id],
                ["ชื่อลูกค้า", debtor?.debtorName ?? people[0]?.bbs_profile.fullname],
                ["ยอดหนี้คงเหลือ", compactMoney(debtor?.balance ?? 0)],
                ["จำนวนหลักประกัน", `${presentationData.tab5_collateral_portfolio.collateral_items.length} รายการ`],
                ["มูลค่าหลักประกันรวม", compactMoney(presentationData.tab5_collateral_portfolio.total_portfolio_valuation)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#c8e3f7] bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-bold text-[#005088]">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-[260px_1fr_320px]">
              <aside className="rounded-lg border border-[#c8e3f7] bg-white p-4 shadow-sm">
                <h3 className="font-bold text-[#003a70]">หลักประกันทั้งหมด</h3>
                <div className="mt-3 space-y-2">
                  {presentationData.tab5_collateral_portfolio.collateral_items.map((item) => (
                    <button key={item.id} type="button" className={`w-full rounded-md border px-3 py-3 text-left text-sm ${selectedCollateral?.id === item.id ? "border-[#005088] bg-[#eef7ff] text-[#005088]" : "border-[#d7eaf8] text-slate-700"}`} onClick={() => setSelectedCollateralId(item.id)}>
                      <span className="font-semibold">{item.id}</span>
                      <span className="block text-xs">{item.asset_type}</span>
                    </button>
                  ))}
                </div>
              </aside>
              <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
                <h3 className="font-bold text-[#003a70]">Location Map</h3>
                <div className="mt-4 flex min-h-72 items-center justify-center rounded-lg border border-dashed border-[#9ed4f5] bg-[#e8f4fb]">
                  <div className="text-center text-[#005088]">
                    <MapPin className="mx-auto" size={42} />
                    <p className="mt-3 text-lg font-bold">Google Maps Placeholder</p>
                    <p className="text-sm">Lat {selectedCollateral?.google_map_coordinates.lat} / Lng {selectedCollateral?.google_map_coordinates.lng}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Lat</span><input type="number" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" value={selectedCollateral?.google_map_coordinates.lat ?? ""} onChange={(event) => updateCollateralCoordinate("lat", event.target.value)} /></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Lng</span><input type="number" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" value={selectedCollateral?.google_map_coordinates.lng ?? ""} onChange={(event) => updateCollateralCoordinate("lng", event.target.value)} /></label>
                </div>
                <div className="mt-5">
                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#9ed4f5] bg-[#f8fcff] px-4 py-5 text-center">
                    <UploadCloud className="text-[#005088]" size={28} />
                    <span className="mt-2 text-sm font-semibold text-[#005088]">Upload / drag-drop photos</span>
                    <input type="file" multiple className="sr-only" onChange={addCollateralImages} />
                  </label>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {(selectedCollateral?.images?.length ? selectedCollateral.images : [{ url: "", is_cover: true }]).map((image, index) => renderImageTile(image, index, "", selectedCollateral?.id))}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
                <h3 className="font-bold text-[#003a70]">Asset Specifications</h3>
                {[
                  ["title_deed_no", "เลขที่กรรมสิทธิ์ / โฉนด"],
                  ["asset_type", "ประเภทหลักประกัน"],
                  ["address", "ที่อยู่"],
                  ["legal_owner", "ผู้ถือกรรมสิทธิ์"],
                  ["collateral_status", "สถานะหลักประกัน"],
                  ["mortgage_amount", "มูลจำนอง"],
                  ["latest_appraisal_value", "ราคาประเมินล่าสุด"],
                ].map(([field, label]) => (
                  <label key={field} className="mt-4 block">
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                    <input className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={selectedCollateral?.[field] ?? ""} onChange={(event) => updateCollateral(field, event.target.value)} />
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#005088]">Appraisal History</p>
                  <h3 className="text-lg font-bold text-[#003a70]">ประวัติราคาประเมินหลักประกัน</h3>
                </div>
                <p className="text-sm text-slate-500">สถานะปัจจุบัน / ย้อนหลังตามปีประเมิน</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-4">
                {appraisalHistory.map((item) => (
                  <div key={item.year} className="rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
                    <div className="flex h-28 items-end rounded bg-white px-4 py-3">
                      <div className="w-full rounded-t bg-[#005088]" style={{ height: `${Math.max((item.value / maxAppraisal) * 100, 8)}%` }} />
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#003a70]">{item.year}</p>
                        <p className="text-xs text-slate-500">{item.type}</p>
                      </div>
                      <p className="text-right text-sm font-bold text-[#005088]">{money(item.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <button type="button" className="absolute right-5 top-5 text-white" onClick={() => setLightboxImage(null)}>
            <X size={32} />
          </button>
          {lightboxImage.url ? (
            <img src={lightboxImage.url} alt="Collateral preview" className="max-h-full max-w-full rounded-lg object-contain" />
          ) : (
            <div className="flex h-[70vh] w-full max-w-4xl flex-col items-center justify-center rounded-lg bg-white text-[#005088]">
              <ImagePlus size={54} />
              <p className="mt-3 text-lg font-bold">Collateral image placeholder</p>
            </div>
          )}
        </div>
      )}
      </div>
    </main>
  );
}

function plainTextToHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

function amountToSlideMb(value, fallback = 0) {
  const amount = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(amount) || !amount) return fallback;
  return amount > 100000 ? Number((amount / 1000000).toFixed(2)) : amount;
}

function amountToSlideUnit(value, unit, fallback = 0) {
  const amount = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(amount) || !amount) return fallback;
  const unitText = String(unit || "");
  if (unitText.includes("ล้าน")) return amount > 100000 ? Number((amount / 1000000).toFixed(2)) : amount;
  if (unitText.includes("พัน")) return amount > 10000 ? Number((amount / 1000).toFixed(2)) : amount;
  return amount;
}

function slideReportValue(reportData, includes, fallback = "") {
  const item = reportData.find((entry) => includes.every((text) => String(entry.label || "").includes(text)));
  return item ? item.value ?? "" : fallback;
}

function slideExactReportValue(reportData, label, fallback = "") {
  const item = reportData.find((entry) => entry.label === label);
  return item ? item.value ?? "" : fallback;
}

function slideAmount(value) {
  const amount = Number(String(value ?? "").replace(/[,%]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

const slideCashflowLabels = {
  income: [
    "เงินเดือน",
    "เงิน Commission",
    "Incentive",
    "ค่าเช่า",
    "ขายของออนไลน์",
    "ค่าจ้างงวดงาน (เฉลี่ย/เดือน)",
    "เงินจากธุรกิจ",
    "อื่นๆ",
  ],
  expense: [
    "ค่าน้ำ / ไฟ / โทรศัพท์ / อินเตอร์เน็ต",
    "ค่าใช้จ่ายส่วนตัว (ชีวิตประจำวัน)",
    "ค่าเช่าบ้าน",
    "เลี้ยงดูบิดามารดา",
    "เลี้ยงดูบุตร",
    "อื่นๆ กองทุนสำรองเลี้ยงชีพ",
  ],
  liability: [
    "รถยนต์",
    "บ้าน / (BAM)",
    "สินเชื่อสถาบันการเงิน",
    "นอกระบบ (บัญชีญาติ)",
    "บัตรเครดิต",
    "บัตรกดเงินสด",
    "อื่นๆ (เงินกู้สหกรณ์)",
  ],
};

function buildSlideCashflowItems(group, amounts = {}) {
  return slideCashflowLabels[group].map((label) => {
    const amount = amounts[label] ?? "";
    return {
      label,
      amount,
      is_checked_default: amount !== "" && amount !== null && amount !== undefined,
    };
  });
}

function slideManagementUnit(managementOverview = {}, reportData = []) {
  const rawUnit = managementOverview.unit
    || managementOverview.amountUnit
    || slideReportValue(reportData, ["3.3", "หน่วย"], "");
  return String(rawUnit || "ล้านบาท")
    .replace(/[()]/g, "")
    .replace(/^หน่วย\s*[:：]?\s*/, "")
    .trim() || "ล้านบาท";
}

function slideManagementUnitShort(unit) {
  const text = String(unit || "").trim();
  if (text.includes("ล้าน")) return "M";
  if (text.includes("พัน")) return "K";
  return text || "บาท";
}

function slideMapSnapshotSrc(asset) {
  const latitude = Number(asset?.gps_coordinates?.latitude || 0).toFixed(4);
  const longitude = Number(asset?.gps_coordinates?.longitude || 0).toFixed(4);
  const label = String(asset?.asset_id || "Collateral").replace(/[<&>"]/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 440">
      <defs>
        <linearGradient id="land" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#edf4ea"/>
          <stop offset="1" stop-color="#d8ead1"/>
        </linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-opacity=".18"/></filter>
      </defs>
      <rect width="820" height="440" fill="url(#land)"/>
      <path d="M-40 370 C160 275 260 350 418 248 S640 126 884 194" fill="none" stroke="#fdfdfd" stroke-width="40"/>
      <path d="M-36 370 C164 275 260 350 418 248 S640 126 884 194" fill="none" stroke="#d2d9df" stroke-width="4" stroke-dasharray="14 10"/>
      <path d="M72 -22 C146 78 96 214 192 302 S414 420 504 474" fill="none" stroke="#fff" stroke-width="24"/>
      <path d="M626 -18 C558 112 662 216 594 314 S604 404 702 470" fill="none" stroke="#fff" stroke-width="22"/>
      <g opacity=".75" fill="#cbe3bf">
        <rect x="238" y="58" width="118" height="68" rx="12"/>
        <rect x="524" y="64" width="156" height="78" rx="12"/>
        <rect x="68" y="248" width="126" height="76" rx="12"/>
        <rect x="556" y="312" width="160" height="78" rx="12"/>
      </g>
      <g filter="url(#shadow)">
        <path d="M410 112c-54 0-98 43-98 97 0 76 98 174 98 174s98-98 98-174c0-54-44-97-98-97z" fill="#e03636"/>
        <circle cx="410" cy="209" r="39" fill="#fff"/>
        <circle cx="410" cy="209" r="20" fill="#005fac"/>
      </g>
      <g font-family="Arial, sans-serif">
        <rect x="24" y="22" width="216" height="64" rx="16" fill="#fff" fill-opacity=".94"/>
        <text x="46" y="48" font-size="18" font-weight="700" fill="#005fac">Google Maps pin</text>
        <text x="46" y="70" font-size="15" fill="#475569">${label}</text>
        <rect x="246" y="362" width="328" height="50" rx="15" fill="#fff" fill-opacity=".95"/>
        <text x="410" y="393" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a">Lat ${latitude} / Lng ${longitude}</text>
      </g>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildSlidePaymentSummaryRows(paymentSummary = {}, reportData = []) {
  const rows = [
    ["restructureDebt", "1. ภาระหนี้ ณ วันปรับโครงสร้างหนี้"],
    ["compromiseAmount", "2. ยอดประนอมหนี้"],
    ["paidAmount", "3. ชำระตามผลการประนอมหนี้"],
    ["beforeCancel", "4. ภาระหนี้คงเหลือก่อนยกเลิกประนอมหนี้"],
    ["afterCancelToPresent", "5. ภาระหนี้คงเหลือหลังยกเลิกประนอมหนี้คำนวณถึงปัจจุบัน"],
    ["clause4InterestToPresent", "6. ภาระหนี้ตามข้อ 4 คำนวณดอกเบี้ยถึงปัจจุบัน"],
    ["currentOffer", "7. ข้อเสนอครั้งนี้"],
  ];
  const fields = ["principal", "interest", "fee", "total", "expense", "dayOne", "yield", "costFee", "costTotal"];

  return [
    ...rows.map(([key, label]) => ({
      row_label: label,
      ...Object.fromEntries(fields.map((field, index) => [
        field,
        slideExactReportValue(reportData, `${label} ${index + 1}`, paymentSummary?.[key]?.[field] ?? ""),
      ])),
    })),
    {
      row_label: "เพิ่มขึ้น (ลดลง) จากเดิม",
      ...Object.fromEntries(fields.map((field, index) => [
        field,
        slideExactReportValue(reportData, `เพิ่มขึ้นลดลง ${index + 1}`, ""),
      ])),
    },
  ];
}

function buildSlideManagementSummary(managementOverview = {}, reportData = []) {
  const rows = {
    revenue: [
      ["paid", "paid", "เงินที่ชำระมาแล้ว"],
      ["auctionPaid", "auctionReceived", "รับชำระแล้วจากการขายทอดตลาด"],
      ["collateralEstimate", "collateralEstimate", "ประมาณการจากการขายทรัพย์หลักประกัน (80% ของราคาประเมิน BAM)"],
      ["thirdParty", "thirdPartyAuction", "บุคคลภายนอกซื้อได้จากการขายทอดตลาด"],
      ["npaEstimate", "npaEstimate", "ประมาณการจากการขายทรัพย์ NPA"],
      ["currentOffer", "currentOffer", "ข้อเสนอครั้งนี้"],
    ],
    expenses: [
      ["dayOne", "dayOne", "Day one ณ วันรับโอน"],
      ["systemExpense", "systemExpense", "ค่าใช้จ่ายในระบบ"],
      ["futureExpense", "futureExpense", "ค่าใช้จ่ายในอนาคต"],
      ["commonFee", "commonFee", "ค่าส่วนกลางค้างชำระ"],
      ["nplTransfer", "nplTransferExpense", "ค่าใช้จ่ายในการโอน NPL"],
      ["npaTransfer", "npaTransferExpense", "ค่าใช้จ่ายในการโอน NPA"],
      ["assetFee", "purchaseFee", "ค่าธรรมเนียมการซื้อทรัพย์"],
    ],
  };
  const readRows = (group, labels) => labels.map(([rowId, payloadKey, fallbackLabel]) => ({
    id: rowId,
    label: slideReportValue(reportData, ["3.3", group, rowId, "รายการ"], fallbackLabel),
    amount: slideReportValue(reportData, ["3.3", group, rowId, "จำนวนเงิน"], managementOverview?.[payloadKey] ?? ""),
  }));
  const revenue = readRows("รับ", rows.revenue);
  const expenses = readRows("หัก", rows.expenses);
  const amountUnit = slideManagementUnit(managementOverview, reportData);

  return {
    amount_unit: amountUnit,
    amount_unit_short: slideManagementUnitShort(amountUnit),
    revenue,
    expenses,
    revenue_total: revenue.reduce((sum, row) => sum + slideAmount(row.amount), 0),
    expenses_total: expenses.reduce((sum, row) => sum + slideAmount(row.amount), 0),
  };
}

function createPresentationData(debtor, draft = readSavedDraft(debtor)) {
  const debtorName = debtor?.debtorName || "บริษัท นวธารา อินดัสทรี จำกัด";
  const reportData = draft?.reportData ?? draft?.payload?.__preview?.reportData ?? [];
  const summaryPayload = draft?.payload ?? {};
  const proposalPayload = summaryPayload.proposal ?? {};
  const debtorInfo = summaryPayload.debtorInfo ?? {};
  const slideUnit = slideManagementUnit(summaryPayload.managementOverview, reportData);
  const balanceMb = amountToSlideUnit(debtor?.balance ?? 12500000, slideUnit, 12.5);
  const appraisalMb = Number((balanceMb * 1.516).toFixed(2));
  const summaryPaymentTerms = proposalPayload.installments?.[0]
    ? `${proposalPayload.installments[0].period || "งวดแรก"} ${proposalPayload.installments[0].duration || ""} ${proposalPayload.installments[0].amount || ""}`.trim()
    : "";
  const negotiatedAmountMb = amountToSlideUnit(proposalPayload.amount, slideUnit, 3.95);
  const negotiatedPrincipalMb = amountToSlideUnit(proposalPayload.principal, slideUnit, 3.1);
  const factPeople = factPeopleFromReportData(reportData);
  const factPeopleSlides = factPeople.map((person, index) => {
    const isGuarantor = String(person.type).includes("ผู้ค้ำ");
    const summaryIncome = slideAmount(person.income);
    const summaryExpense = slideAmount(person.expense);
    return {
      debtor_id: `${isGuarantor ? "G" : "D"}-${String(index + 1).padStart(2, "0")}`,
      debtor_name: person.name || `${isGuarantor ? "ผู้ค้ำ" : "ลูกหนี้"}รายการที่ ${index + 1}`,
      role: person.type || (isGuarantor ? "ผู้ค้ำ" : "ลูกหนี้"),
      age: person.age || "",
      occupation: person.note || "ข้อมูลจากใบสรุปนำเสนอ",
      registered_address: person.address || "-",
      capacity_monthly_payment_thb: Math.max(summaryIncome - summaryExpense, 0),
      analyst_notes: "",
      cashflow_items: {
        income: buildSlideCashflowItems("income", { [isGuarantor ? "เงินเดือน" : "เงินจากธุรกิจ"]: summaryIncome || "" }),
        expense: buildSlideCashflowItems("expense", { "ค่าใช้จ่ายส่วนตัว (ชีวิตประจำวัน)": summaryExpense || "" }),
        liability: buildSlideCashflowItems("liability"),
      },
    };
  });
  return {
    client_portfolio: {
      customer_id: debtor?.customerId || "CUST-89210",
      customer_name: debtorName,
      total_outstanding_debt_mb: balanceMb,
      portfolio_appraisal_value_mb: appraisalMb,
    },
    tab1_summary: {
      agenda_text: "",
      presentation_point: "",
      metadata: {
        port_lot: debtor?.portfolio || "KTB21",
        transfer_date: summaryPayload.transferDate || "15/05/2566",
        holding_period_years: 2.8,
        legal_status: debtor?.legalStatus || "บังคับคดี",
        asset_tracing_status: "พบหลักประกัน 2 รายการ",
      },
      table_1_4_records: buildSlidePaymentSummaryRows(summaryPayload.paymentSummary, reportData),
      admin_summary_3_3: buildSlideManagementSummary(summaryPayload.managementOverview, reportData),
      decision_metrics: { cost_at_transfer_mb: Number((balanceMb * 0.72).toFixed(2)), principal_ratio_percentage: 72, appraisal_ratio_percentage: 85 },
    },
    tab2_debtors: factPeopleSlides.length ? factPeopleSlides : [
      {
        debtor_id: "D-01",
        debtor_name: debtorName,
        occupation: debtorInfo.debtorOccupation || "เจ้าของธุรกิจและผู้บริหารกิจการ",
        registered_address: "123/45 ถนนสุขุมวิท แขวงคลองเตบ เขตคลองเตย กรุงเทพมหานคร 10110",
        capacity_monthly_payment_thb: slideAmount(proposalPayload.installments?.[0]?.amount) > 100 ? slideAmount(proposalPayload.installments[0].amount) : 25000,
        analyst_notes: "",
        cashflow_items: {
          income: buildSlideCashflowItems("income", { "เงินจากธุรกิจ": 120000, ค่าเช่า: 25000 }),
          expense: buildSlideCashflowItems("expense", { "ค่าใช้จ่ายส่วนตัว (ชีวิตประจำวัน)": 65000, "เลี้ยงดูบุตร": 28000 }),
          liability: buildSlideCashflowItems("liability", { "บัตรเครดิต": 8000 }),
        },
      },
      {
        debtor_id: "D-02",
        debtor_name: "นายตัวอย่าง ผู้ค้ำประกัน",
        occupation: "พนักงานบริษัทเอกชน",
        registered_address: "88/8 ถนนหลักประกัน อำเภอเมือง จังหวัดนนทบุรี",
        capacity_monthly_payment_thb: 18000,
        analyst_notes: "",
        cashflow_items: {
          income: buildSlideCashflowItems("income", { เงินเดือน: 58000 }),
          expense: buildSlideCashflowItems("expense", { "ค่าใช้จ่ายส่วนตัว (ชีวิตประจำวัน)": 30000 }),
          liability: buildSlideCashflowItems("liability", { "สินเชื่อสถาบันการเงิน": 12000 }),
        },
      },
    ],
    tab3_litigation: {
      status_overview: { current_status: "บังคับคดี (ยึดทรัพย์แล้ว)", last_activity_date: "05 พ.ย. 2561" },
      timeline_milestones: [
        { label: "ซื้อพอร์ต", date: "15 มิ.ย. 2566", is_completed: true },
        { label: "ยื่นฟ้อง", date: "10 มี.ค. 2560", is_completed: true },
        { label: "พิพากษา", date: "22 พ.ค. 2561", is_completed: true },
        { label: "บังคับคดี", date: "05 พ.ย. 2561", is_completed: true },
        { label: "ขายทอดตลาด", date: "รอกำหนดวัน", is_completed: false },
      ],
      cases: [
        {
          case_id: "พ.123/2560",
          red_number: "แดง 456/2560",
          case_type: "คดีแพ่งสามัญ",
          filing_date: "10 มี.ค. 2017",
          judgment_date: "22 ม.ค. 2018",
          capital_value_thb: 15700000,
          status_label: "ยึดทรัพย์แล้ว",
          deep_details: { total_capital_claim: 15700000, linked_collateral_count: 2, jurisdiction_court: "ศาลแพ่ง", legal_notes: "คดีถึงที่สุดและตั้งเรื่องยึดทรัพย์หลักประกันตามขั้นตอนทางกฎหมายของบริษัท" },
        },
        {
          case_id: "ล.88/2561",
          red_number: "แดง 91/2561",
          case_type: "คดีล้มละลาย",
          filing_date: "18 ส.ค. 2018",
          judgment_date: "05 พ.ย. 2018",
          capital_value_thb: 4200000,
          status_label: "รอสวมสิทธิ",
          deep_details: { total_capital_claim: 4200000, linked_collateral_count: 1, jurisdiction_court: "ศาลล้มละลายกลาง", legal_notes: "อยู่ระหว่างตรวจคำสั่งรับชำระหนี้และสถานะการสวมสิทธิ" },
        },
      ],
    },
    tab4_restructuring: {
      current_proposal: { new_principal_mb: negotiatedPrincipalMb, negotiated_interest_mb: 0.8, court_expenses_mb: 0.05, total_agreed_repayment_mb: negotiatedAmountMb, payment_terms_note: summaryPaymentTerms || "งวดที่ 1-12 ผ่อนชำระต่อเดือนละ ฿ 20,000.00" },
      history_logs: [
        { round_number: 2, date: "12 พ.ค. 2565", status: "ผิดนัดเงื่อนไขสัญญา", matrix: { principal_mb: 2, interest_mb: 0.4, expenses_mb: 0.1, total_mb: 2.5 }, actual_recovered_amount_thb: 1125000, recovery_percentage: 45, failure_reason_note: "ต่ำกว่าเกณฑ์ต้นทุน Day One" },
        { round_number: 1, date: "05 ม.ค. 2563", status: "เสร็จสิ้นแผนสัญญานี้", matrix: { principal_mb: 2.5, interest_mb: 0.4, expenses_mb: 0.1, total_mb: 3 }, actual_recovered_amount_thb: 1500000, recovery_percentage: 50, failure_reason_note: "ประวัติรับชำระตามแผนเจรจารอบเดิม" },
      ],
    },
    tab5_collateral: {
      portfolio_totals: { client_id: debtor?.customerId || "CUST-89210", client_name: debtorName, outstanding_debt_balance_mb: balanceMb, total_appraisal_mb: appraisalMb },
      items: [
        {
          asset_id: "COL-10024",
          category: "House",
          asset_title: "บ้านเดี่ยว 2 ชั้น",
          judicial_status: "ยึดทรัพย์แล้ว",
          title_deed_no: "12345",
          registered_address: "123/45 ถ.วิภาวดีรังสิต",
          district_province: "กรุงเทพฯ / จตุจักร",
          registered_owner: "สมชาย ประเสริฐ",
          mortgage_value_thb: 12500000,
          initial_appraisal_thb: 7200000,
          latest_appraisal_thb: 8500000,
          gps_coordinates: { latitude: 13.9312, longitude: 100.7421 },
          valuation_history_mb: [
            { period: "Day One", value: 7.2 },
            { period: "ปีที่ 1", value: 7.5 },
            { period: "ปีที่ 2", value: 8.2 },
            { period: "ล่าสุด", value: 8.5 },
          ],
        },
        {
          asset_id: "COL-10025",
          category: "Land",
          asset_title: "ที่ดินเปล่า",
          judicial_status: "รอตรวจสอบ",
          title_deed_no: "33421",
          registered_address: "ถ.รังสิต-นครนายก",
          district_province: "ปทุมธานี / ลำลูกกา",
          registered_owner: debtorName,
          mortgage_value_thb: 5200000,
          initial_appraisal_thb: 4100000,
          latest_appraisal_thb: 4600000,
          gps_coordinates: { latitude: 13.9832, longitude: 100.6468 },
          valuation_history_mb: [
            { period: "Day One", value: 4 },
            { period: "ปีที่ 1", value: 4.1 },
            { period: "ปีที่ 2", value: 4.4 },
            { period: "ล่าสุด", value: 4.6 },
          ],
        },
      ],
    },
  };
}

function SlideInput({ value, onChange, presentationMode, textarea = false, className = "", align = "left" }) {
  const baseClass = `slide-input w-full bg-transparent outline-none transition ${className}`;
  if (textarea) {
    return (
      <textarea
        className={`${baseClass} resize-none rounded-md border border-dashed border-slate-300 px-2 py-1 focus:border-[#005fac]`}
        style={{ textAlign: align }}
        value={value}
        disabled={presentationMode}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  return (
    <input
      className={`${baseClass} border-0 border-b border-dashed border-slate-300 px-1 py-0.5 focus:border-[#005fac]`}
      style={{ textAlign: align }}
      value={value}
      disabled={presentationMode}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function SlideBuilderPage({ debtor, draft, onBack }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [presentationMode, setPresentationMode] = useState(false);
  const [data, setData] = useState(() => createPresentationData(debtor, draft));
  const [activeDebtorId, setActiveDebtorId] = useState("D-01");
  const [selectedCaseId, setSelectedCaseId] = useState("พ.123/2560");
  const [selectedAssetId, setSelectedAssetId] = useState("COL-10024");
  const [heroImage, setHeroImage] = useState("");
  const [coordEditing, setCoordEditing] = useState(false);
  const [summaryZoom, setSummaryZoom] = useState(null);
  const [repaymentCapacity, setRepaymentCapacity] = useState(() => data.tab2_debtors.reduce((sum, person) => sum + Number(person.capacity_monthly_payment_thb || 0), 0));
  const [memoDraftHtml, setMemoDraftHtml] = useState("");
  const [memoNotes, setMemoNotes] = useState([]);

  const tabs = [
    { key: "summary", label: "บทสรุปผู้บริหาร", icon: Presentation },
    { key: "debtor", label: "รายละเอียดลูกหนี้", icon: FileText },
    { key: "legal", label: "ประวัติคดีความ", icon: Gavel },
    { key: "restructure", label: "การปรับโครงสร้างหนี้", icon: ClipboardCheck },
    { key: "collateral", label: "รายละเอียดหลักประกัน", icon: MapPin },
  ];
  const slideDisplayUnit = data.tab1_summary.admin_summary_3_3.amount_unit_short || slideManagementUnitShort(data.tab1_summary.admin_summary_3_3.amount_unit);
  const fmtMb = (value) => `${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ${slideDisplayUnit}`;
  const fmtOneMb = (value) => `${Number(value || 0).toLocaleString("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${slideDisplayUnit}`;
  const fmtThb = (value) => `฿ ${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
  const updateSummary = (field, value) => setData((current) => ({ ...current, tab1_summary: { ...current.tab1_summary, [field]: value } }));
  const activeDebtor = data.tab2_debtors.find((item) => item.debtor_id === activeDebtorId) || data.tab2_debtors[0];
  const selectedCase = data.tab3_litigation.cases.find((item) => item.case_id === selectedCaseId) || data.tab3_litigation.cases[0];
  const selectedAsset = data.tab5_collateral.items.find((item) => item.asset_id === selectedAssetId) || data.tab5_collateral.items[0];
  const mapEmbedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(`${selectedAsset.gps_coordinates.latitude},${selectedAsset.gps_coordinates.longitude}`)}&z=17&output=embed`;
  const checkedSum = (items) => items.filter((item) => item.is_checked_default).reduce((sum, item) => sum + slideAmount(item.amount), 0);
  const visibleCashflow = (items) => presentationMode ? items.filter((item) => item.is_checked_default) : items;
  const incomeTotal = checkedSum(data.tab2_debtors.flatMap((person) => person.cashflow_items.income));
  const expenseTotal = checkedSum(data.tab2_debtors.flatMap((person) => person.cashflow_items.expense));
  const liabilityTotal = checkedSum(data.tab2_debtors.flatMap((person) => person.cashflow_items.liability || []));
  const netIncome = incomeTotal - expenseTotal - liabilityTotal;
  const ratio = incomeTotal ? Math.max((netIncome / incomeTotal) * 100, 0) : 0;
  const setCashflowChecked = (group, index, checked) => {
    setData((current) => ({
      ...current,
      tab2_debtors: current.tab2_debtors.map((person) => person.debtor_id === activeDebtorId
        ? {
          ...person,
          cashflow_items: {
            ...person.cashflow_items,
            [group]: person.cashflow_items[group].map((item, itemIndex) => itemIndex === index ? { ...item, is_checked_default: checked } : item),
          },
        }
        : person),
    }));
  };
  const setCashflowAmount = (group, index, amount) => {
    setData((current) => ({
      ...current,
      tab2_debtors: current.tab2_debtors.map((person) => person.debtor_id === activeDebtorId
        ? {
          ...person,
          cashflow_items: {
            ...person.cashflow_items,
            [group]: person.cashflow_items[group].map((item, itemIndex) => itemIndex === index ? { ...item, amount } : item),
          },
        }
        : person),
    }));
  };
  const updateDebtorField = (field, value) => {
    setData((current) => ({
      ...current,
      tab2_debtors: current.tab2_debtors.map((person) => person.debtor_id === activeDebtorId ? { ...person, [field]: value } : person),
    }));
  };
  const updateProposal = (field, value) => setData((current) => ({
    ...current,
    tab4_restructuring: {
      ...current.tab4_restructuring,
      current_proposal: { ...current.tab4_restructuring.current_proposal, [field]: field.includes("note") ? value : Number(value) || 0 },
    },
  }));
  const updateAssetCoordinate = (field, value) => setData((current) => ({
    ...current,
    tab5_collateral: {
      ...current.tab5_collateral,
      items: current.tab5_collateral.items.map((item) => item.asset_id === selectedAssetId
        ? { ...item, gps_coordinates: { ...item.gps_coordinates, [field]: Number(value) || 0 } }
        : item),
    },
  }));

  const renderCashflowTable = ({ title, group, items, tone }) => {
    const visibleItems = visibleCashflow(items);
    return (
      <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[14px] font-bold text-[#005fac]">{title}</p>
          <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${tone}`}>{fmtThb(checkedSum(items))}</span>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {visibleItems.map((item, index) => {
            const originalIndex = items.indexOf(item);
            return (
              <label key={`${item.label}-${index}`} className={`grid items-center gap-1.5 rounded border border-slate-100 px-1.5 py-1 text-[12px] ${presentationMode ? "grid-cols-[1fr_88px]" : "grid-cols-[18px_1fr_88px]"}`}>
                {!presentationMode && (
                  <input
                    type="checkbox"
                    className="slide-editable h-4 w-4 accent-[#005fac]"
                    checked={item.is_checked_default}
                    disabled={presentationMode}
                    onChange={(event) => setCashflowChecked(group, originalIndex, event.target.checked)}
                  />
                )}
                <span className="min-w-0 leading-tight">{item.label}</span>
                {presentationMode ? (
                  <span className="text-right tabular-nums">{fmtThb(item.amount)}</span>
                ) : (
                  <input
                    className="slide-input h-6 rounded border border-[#d7eaf8] bg-[#f8fcff] px-1.5 text-right tabular-nums outline-none focus:border-[#005fac]"
                    inputMode="decimal"
                    value={item.amount}
                    placeholder="0"
                    onChange={(event) => setCashflowAmount(group, originalIndex, event.target.value)}
                  />
                )}
              </label>
            );
          })}
          <div className="sticky bottom-0 grid grid-cols-[1fr_88px] border-t border-slate-300 bg-white pt-1 text-[12px] font-bold">
            <span>รวมรายการที่เลือก</span>
            <span className="text-right">{fmtThb(checkedSum(items))}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="grid h-full grid-rows-[66px_1fr] gap-3">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
        <div className="grid grid-cols-[90px_1fr_130px_1.15fr] items-center gap-3 text-[14px]">
          <span className="font-bold text-[#005fac]">วาระ:</span>
          <SlideInput value={data.tab1_summary.agenda_text} presentationMode={presentationMode} onChange={(value) => updateSummary("agenda_text", value)} />
          <span className="font-bold text-[#005fac]">ประเด็นนำเสนอ:</span>
          <SlideInput value={data.tab1_summary.presentation_point} presentationMode={presentationMode} onChange={(value) => updateSummary("presentation_point", value)} />
        </div>
      </div>
      <div className="grid grid-cols-[0.92fr_1.38fr] gap-3 overflow-hidden">
        <div className="grid grid-rows-[202px_1fr] gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[15px] font-bold text-[#005fac]">ข้อมูล BBS</p>
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              {[
                ["Port Lot", data.tab1_summary.metadata.port_lot],
                ["วันรับโอน", data.tab1_summary.metadata.transfer_date],
                ["Holding", `${data.tab1_summary.metadata.holding_period_years}Y`],
                ["สถานะคดี", data.tab1_summary.metadata.legal_status],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-slate-50 px-3 py-1.5">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
                  <p className="font-bold text-slate-900">{value}</p>
                </div>
              ))}
              <div className="col-span-2 rounded-md bg-emerald-50 px-3 py-1.5 text-emerald-900">
                <p className="text-[11px] font-semibold uppercase">Asset Trace</p>
                <p className="font-bold">{data.tab1_summary.metadata.asset_tracing_status}</p>
              </div>
            </div>
          </div>
          <label className="relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-[#eef7ff]">
            {heroImage ? (
              <img src={heroImage} alt="Collateral" className="h-full w-full object-cover" />
            ) : (
              <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-sky-100 via-white to-slate-200">
                <div className="absolute left-1/2 top-7 flex h-14 w-24 -translate-x-1/2 items-center justify-center rounded bg-white/95 text-[26px] font-black tracking-wide text-[#005fac] shadow">BAM</div>
                <div className="absolute bottom-0 left-0 right-0 flex h-28 items-end justify-center gap-2 px-10">
                  {[68, 96, 122, 86, 138, 108, 78].map((height, index) => (
                    <div key={index} className="w-9 rounded-t bg-[#005fac]/80 shadow" style={{ height }} />
                  ))}
                </div>
                <div className="slide-editable absolute inset-0 flex items-center justify-center bg-white/30 text-[#005fac]">
                  <div className="rounded-lg bg-white/90 px-5 py-3 text-center shadow-sm">
                    <UploadCloud className="mx-auto mb-1" size={28} />
                    <p className="text-[13px] font-bold">Import Single รูปเดียว</p>
                  </div>
                </div>
              </div>
            )}
            <input type="file" accept="image/*" className="slide-editable sr-only" disabled={presentationMode} onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setHeroImage(URL.createObjectURL(file));
            }} />
          </label>
        </div>
        <div className="grid grid-rows-[205px_1fr_42px] gap-3 overflow-hidden">
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <p className="mb-2 text-[15px] font-bold text-[#005fac]">1.4 ตารางสรุปภาระหนี้และต้นทุน</p>
            <table className="w-full table-fixed border-collapse text-[12px]">
              <thead className="bg-slate-100 text-[#005fac]">
                <tr><th rowSpan={2} className="border p-1">รายการ</th><th colSpan={4} className="border p-1">ภาระหนี้เดิม</th><th colSpan={3} className="border p-1">ต้นทุนสะสม</th></tr>
                <tr>{["เงินต้น", "ดอกเบี้ย", "คชจ.", "รวม", "DayOne", "Yield", "รวม"].map((head, index) => <th key={`${head}-${index}`} className="border p-1">{head}</th>)}</tr>
              </thead>
              <tbody>
                {data.tab1_summary.table_1_4_records.map((row) => (
                  <tr key={row.row_label}>
                    <td className="border p-1 font-semibold">{row.row_label}</td>
                    {[row.debt_principal, row.debt_interest, row.debt_expenses, row.debt_total, row.cost_dayone, row.cost_yield, row.cost_total].map((value, index) => <td key={index} className="border p-1 text-right tabular-nums">{fmtMb(value)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <p className="mb-1 text-[14px] font-bold text-[#005fac]">3.3 สรุปภาพรวมการบริหารหนี้</p>
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-md bg-emerald-50 p-2">
                <p className="mb-1 font-bold text-emerald-900">รายรับ</p>
                {[["เจรจาครั้งนี้", data.tab1_summary.admin_summary_3_3.revenue.negotiated_repayment], ["ประนอมหนี้", data.tab1_summary.admin_summary_3_3.revenue.settlement], ["ขายทอดตลาด", data.tab1_summary.admin_summary_3_3.revenue.auction_revenue], ["รวมรายรับ", data.tab1_summary.admin_summary_3_3.revenue.total_revenue]].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-emerald-100 py-0.5"><span>{label}</span><b>{fmtMb(value)}</b></div>
                ))}
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <p className="mb-1 font-bold text-slate-900">รายจ่าย</p>
                {[["ต้นทุนรับโอน", data.tab1_summary.admin_summary_3_3.expenses.dayone_cost], ["คชจ.ทางตรง NPL", data.tab1_summary.admin_summary_3_3.expenses.direct_npl_expenses], ["คชจ.อนาคต", data.tab1_summary.admin_summary_3_3.expenses.estimated_future_expenses], ["รวมรายจ่าย", data.tab1_summary.admin_summary_3_3.expenses.total_expenses]].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-slate-200 py-0.5"><span>{label}</span><b>{fmtMb(value)}</b></div>
                ))}
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between rounded-md bg-[#005fac] px-3 py-1.5 text-white">
              <span className="text-[12px] font-bold">ส่วนเกินทุน</span>
              <span className="text-[16px] font-black">+{fmtMb(data.tab1_summary.admin_summary_3_3.surplus_mb)} / {data.tab1_summary.admin_summary_3_3.surplus_percentage}%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[["Cost", data.tab1_summary.decision_metrics.cost_at_transfer_mb], ["% Principal", `${data.tab1_summary.decision_metrics.principal_ratio_percentage}%`], ["% Appraisal", `${data.tab1_summary.decision_metrics.appraisal_ratio_percentage}%`]].map(([label, value]) => (
              <div key={label} className="rounded-full border border-[#1a9b63]/40 bg-white px-4 py-2 text-center shadow-sm"><span className="text-[11px] text-slate-500">{label}</span><b className="ml-2 text-[#005fac]">{typeof value === "number" ? fmtMb(value) : value}</b></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDebtor = () => (
    <div className="grid h-full grid-rows-[76px_1fr] gap-3">
      <div className="grid grid-cols-3 gap-3">
        {[["รายได้รวมต่อเดือน", incomeTotal, "text-emerald-700"], ["รายจ่ายรวมประจำเดือน", expenseTotal, "text-red-600"], ["รายได้คงเหลือสุทธิ (Net)", netIncome, "text-[#005fac]"]].map(([label, value, color]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-[12px] font-bold text-slate-500">{label}</p><p className={`mt-1 text-[22px] font-black ${color}`}>{fmtThb(value)}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-[1.25fr_0.75fr] gap-3 overflow-hidden">
        <div className="grid grid-rows-[150px_42px_1fr] gap-3 overflow-hidden">
          <div className="rounded-lg border-l-4 border-[#facc15] bg-yellow-50 p-4 shadow-sm">
            <p className="mb-2 text-[14px] font-bold text-slate-900">Analysis Memo</p>
            <div
              className={`min-h-[92px] rounded-md px-2 py-1 text-[14px] leading-relaxed outline-none ${presentationMode ? "border border-transparent" : "border border-dashed border-slate-300 bg-white/35 focus:border-[#005fac]"}`}
              contentEditable={!presentationMode}
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: activeDebtor.analyst_notes }}
              onBlur={(event) => updateDebtorField("analyst_notes", event.currentTarget.innerHTML)}
            />
          </div>
          <div className="flex gap-2">
            {data.tab2_debtors.map((person) => <button key={person.debtor_id} type="button" className={`rounded-full px-4 py-2 text-[13px] font-bold ${activeDebtorId === person.debtor_id ? "bg-[#005fac] text-white" : "bg-white text-[#005fac] border border-[#c8e3f7]"}`} onClick={() => setActiveDebtorId(person.debtor_id)}>{person.debtor_id}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-3 overflow-hidden">
            {renderCashflowTable({ title: "Income Checklist", group: "income", items: activeDebtor.cashflow_items.income, tone: "bg-emerald-100 text-emerald-800" })}
            {renderCashflowTable({ title: "Expense Checklist", group: "expense", items: activeDebtor.cashflow_items.expense, tone: "bg-red-100 text-red-700" })}
          </div>
        </div>
        <div className="grid grid-rows-[1fr_1fr] gap-3">
          <div className="rounded-lg bg-[#005fac] p-5 text-white">
            <p className="text-[13px] font-bold opacity-80">Current Repayment Capacity</p>
            <input className="slide-input mt-4 w-full bg-transparent text-[34px] font-black outline-none" value={fmtThb(activeDebtor.capacity_monthly_payment_thb)} disabled={presentationMode} onChange={(event) => updateDebtorField("capacity_monthly_payment_thb", Number(event.target.value.replace(/[^\d.]/g, "")) || 0)} />
            <p className="text-[13px] opacity-80">บาท / เดือน</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-[14px] font-bold text-[#005fac]">Ratio 4/3</p>
            <div className="mt-5 text-[42px] font-black text-[#005fac]">{ratio.toFixed(1)}%</div>
            <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1a9b63]" style={{ width: `${Math.min(ratio, 100)}%` }} /></div>
            <p className="mt-3 text-[12px] text-slate-500">Capacity divided by net income</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLegal = () => (
    <div className="grid h-full grid-rows-[136px_1fr_142px] gap-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-[18px] font-black text-[#005fac]">ความคืบหน้าทางคดี</h3><div className="flex gap-2 text-[12px] font-bold"><span className="rounded-full bg-[#005fac] px-3 py-1 text-white">สถานะปัจจุบัน: {data.tab3_litigation.status_overview.current_status}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">ล่าสุด: {data.tab3_litigation.status_overview.last_activity_date}</span></div></div>
        <div className="grid grid-cols-5 items-start gap-2">
          {data.tab3_litigation.timeline_milestones.map((item, index) => <div key={item.label} className="relative text-center">{index < 4 && <div className={`absolute left-1/2 top-4 h-0.5 w-full ${item.is_completed ? "bg-[#1a9b63]" : "bg-slate-200"}`} />}<div className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold ${item.is_completed ? "bg-[#1a9b63] text-white" : "bg-slate-200 text-slate-500"}`}>{index + 1}</div><p className="mt-2 text-[12px] font-bold">{item.label}</p><p className="text-[11px] text-slate-500">{item.date}</p></div>)}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <table className="w-full table-fixed border-collapse text-[12px]">
          <thead className="bg-slate-100 text-[#005fac]"><tr>{["คดีดำ/แดง", "ประเภท", "วันที่ฟ้อง", "วันที่พิพากษา", "ทุนทรัพย์", "สถานะ", "Detail"].map((head) => <th key={head} className="border p-2">{head}</th>)}</tr></thead>
          <tbody>
            {data.tab3_litigation.cases.map((caseItem) => <tr key={caseItem.case_id} className={selectedCaseId === caseItem.case_id ? "bg-emerald-50" : ""}><td className="border p-2 font-bold">{caseItem.case_id}<br /><span className="text-red-600">{caseItem.red_number}</span></td><td className="border p-2">{caseItem.case_type}</td><td className="border p-2">{caseItem.filing_date}</td><td className="border p-2">{caseItem.judgment_date}</td><td className="border p-2 text-right">{fmtThb(caseItem.capital_value_thb)}</td><td className="border p-2">{caseItem.status_label}</td><td className="border p-2 text-center"><button type="button" className="rounded bg-[#005fac] px-3 py-1 text-white" onClick={() => setSelectedCaseId(caseItem.case_id)}>ดู</button></td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-white p-4 text-[13px]">
        {[["ทุนทรัพย์ฟ้อง", fmtThb(selectedCase.deep_details.total_capital_claim)], ["หลักประกันที่โยง", `${selectedCase.deep_details.linked_collateral_count} รายการ`], ["ศาล", selectedCase.deep_details.jurisdiction_court], ["สถานะ", selectedCase.status_label]].map(([label, value]) => <div key={label}><p className="text-[11px] font-bold text-slate-500">{label}</p><p className="font-black text-[#005fac]">{value}</p></div>)}
        <div className="col-span-4 rounded bg-slate-50 p-2"><b>Legal notes:</b> {selectedCase.deep_details.legal_notes}</div>
      </div>
    </div>
  );

  const renderRestructure = () => {
    const proposal = data.tab4_restructuring.current_proposal;
    return (
      <div className="grid h-full grid-rows-[128px_1fr] gap-4">
        <div className="overflow-hidden rounded-lg border border-[#1a9b63] bg-white">
          <div className="bg-[#1a9b63] px-4 py-2 text-[14px] font-black text-white">โซนกรอกข้อมูล: ข้อเสนอปัจจุบันประจำรอบเจรจา (User Inputs - โทนสีเรียบร้อย ไม่ฉูดฉาดสายตา)</div>
          <div className="grid grid-cols-4">
            {[["ยอดเงินรวมขออนุมัติรับชำระหนี้", "total_agreed_repayment_mb"], ["เงินต้นคงเหลือปัจจุบันบัญชี", "new_principal_mb"], ["ดอกเบี้ยค้างเดิมประนอม", "negotiated_interest_mb"], ["อัตราดอกเบี้ยใหม่สำหรับรอบนี้", "interest_rate_percent"]].map(([label, field], index) => <div key={field} className={`border-r border-slate-200 px-4 py-3 text-center ${index === 3 ? "bg-emerald-50" : "bg-white"}`}><p className="text-[12px] font-medium text-slate-600">{label}</p><input className="slide-input mt-1 w-full text-center text-[20px] font-black text-[#005fac] outline-none" value={proposal[field] ?? 3.5} disabled={presentationMode} onChange={(event) => updateProposal(field, event.target.value)} /></div>)}
          </div>
          <div className="border-t border-slate-200 px-4 py-2 text-[12px]">
            <SlideInput className="text-[12px]" value={proposal.payment_terms_note} presentationMode={presentationMode} onChange={(value) => updateProposal("payment_terms_note", value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {data.tab4_restructuring.history_logs.map((log) => <div key={log.round_number} className="rounded-lg border border-slate-200 bg-white p-4"><div className="mb-2 flex items-center justify-between"><b className="text-[#005fac]">Round {log.round_number}</b><span className="text-[12px] text-slate-500">{log.date}</span></div><p className="text-[13px] font-bold text-red-600">{log.status}</p><div className="mt-3 grid grid-cols-4 gap-2 text-center text-[12px]">{Object.entries(log.matrix).map(([key, value]) => <div key={key} className="rounded bg-slate-50 p-2"><p className="text-slate-500">{key.replace("_mb", "")}</p><b>{fmtMb(value)}</b></div>)}</div><div className="mt-3"><div className="flex justify-between text-[12px]"><span>Actual recovered {fmtThb(log.actual_recovered_amount_thb)}</span><b>{log.recovery_percentage}%</b></div><div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#1a9b63]" style={{ width: `${log.recovery_percentage}%` }} /></div></div><p className="mt-2 text-[12px] text-slate-600">{log.failure_reason_note}</p></div>)}
        </div>
      </div>
    );
  };

  const renderCollateral = () => (
    <div className="grid h-full grid-rows-[46px_1fr_112px] gap-3">
      <div className="rounded-lg border border-[#005fac] bg-[#f2fbff] px-5 py-2">
        <div className="grid h-full grid-cols-[1.1fr_1.35fr_1.3fr_1.25fr_1.35fr] items-center gap-4 text-[13px] font-bold text-[#005fac]">
          <span>รหัสบัญชีพอร์ต: <b>{data.tab5_collateral.portfolio_totals.client_id}</b></span>
          <span>ชื่อบัญชีลูกค้าประวัติ: <b>{data.tab5_collateral.portfolio_totals.client_name}</b></span>
          <span>ยอดภาระหนี้คงเหลือรวม: <b>{fmtMb(data.tab5_collateral.portfolio_totals.outstanding_debt_balance_mb)}</b></span>
          <span>จำนวนรายการทรัพย์สินประกัน: <b>{data.tab5_collateral.items.length} รายการ</b></span>
          <span>มูลค่าพอร์ตหลักประกันรวมประเมิน: <b className="text-[#1a9b63]">{fmtMb(data.tab5_collateral.portfolio_totals.total_appraisal_mb)}</b></span>
        </div>
      </div>
      <div className="grid grid-cols-[260px_1fr_340px] gap-4 overflow-hidden">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-3 text-[13px] font-bold text-slate-600">รายการหลักประกันในเคส</p>
          <div className="space-y-2">
            {data.tab5_collateral.items.map((item) => (
              <button
                key={item.asset_id}
                type="button"
                className={`w-full rounded-md border px-3 py-3 text-left transition ${
                  selectedAssetId === item.asset_id
                    ? "border-[#005fac] bg-[#eef7ff] text-[#005fac]"
                    : "border-slate-200 bg-white text-slate-400 hover:border-[#9ed4f5]"
                }`}
                onClick={() => setSelectedAssetId(item.asset_id)}
              >
                <b className="block text-[13px]">{item.asset_id} ({item.category})</b>
                <span className="text-[11px]">{item.district_province} • {fmtThb(item.latest_appraisal_thb)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm grid-cols-[1fr_82px]">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-slate-100 to-slate-400" />
            <div className="absolute inset-x-0 bottom-0 flex h-40 items-end justify-center gap-4 px-10">
              {[120, 72, 132, 92, 154, 84, 116].map((height, index) => (
                <div key={index} className="w-14 rounded-t-lg bg-white/80 shadow-lg ring-1 ring-white/80" style={{ height }}>
                  <div className="mx-auto mt-2 h-3 w-8 rounded-sm bg-[#f59e0b]/80" />
                </div>
              ))}
            </div>
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <MapPin size={42} className="fill-red-500 text-red-500 drop-shadow" />
              <b className="rounded bg-white px-2 py-1 text-[12px] text-[#005fac] shadow">{selectedAsset.asset_id}</b>
            </div>
          </div>
          <div className="relative border-l border-slate-300 bg-white px-2 py-28 text-[12px] font-bold leading-6 text-slate-700">
            <p>Lat / Lng</p>
            <p>{selectedAsset.gps_coordinates.latitude.toFixed(4)}</p>
            <p>{selectedAsset.gps_coordinates.longitude.toFixed(4)}</p>
            <div className="slide-editable absolute bottom-3 right-2 rounded bg-white p-1 text-[11px] shadow">
              <button type="button" className="font-bold text-[#005fac]" onClick={() => setCoordEditing((current) => !current)}>แก้พิกัด</button>
              {coordEditing && (
                <div className="mt-2 grid gap-1">
                  <input className="w-20 border px-1" value={selectedAsset.gps_coordinates.latitude} onChange={(event) => updateAssetCoordinate("latitude", event.target.value)} />
                  <input className="w-20 border px-1" value={selectedAsset.gps_coordinates.longitude} onChange={(event) => updateAssetCoordinate("longitude", event.target.value)} />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white text-[12px] shadow-sm">
          <h3 className="border-b border-slate-200 px-4 py-3 text-[14px] font-black text-[#005fac]">สรุปข้อมูลหลักประกัน</h3>
          <div className="px-4 py-3">
            {[["เลขที่กรรมสิทธิ์ / โฉนด", selectedAsset.asset_id], ["ประเภทหลักประกัน", selectedAsset.asset_title], ["ที่อยู่จังหวัดทรัพย์", selectedAsset.registered_address], ["จังหวัด / เขต", selectedAsset.district_province], ["ผู้ถือกรรมสิทธิ์จัดสิทธิ์", selectedAsset.registered_owner], ["สถานะหลักประกัน", selectedAsset.judicial_status], ["ราคาประเมินวันแรก", fmtThb(selectedAsset.initial_appraisal_thb)], ["ราคาประเมินล่าสุด", fmtThb(selectedAsset.latest_appraisal_thb)]].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[138px_1fr] border-b border-slate-100 py-1.5">
                <span className="font-bold text-slate-600">{label}:</span>
                <span className={`text-right font-bold ${label === "สถานะหลักประกัน" ? "text-red-500" : label === "ราคาประเมินล่าสุด" ? "text-[#1a9b63]" : "text-slate-900"}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-3 shadow-sm">
        <p className="mb-3 text-[13px] font-bold text-slate-600">ประวัติราคาประเมินย้อนหลัง (หน่วย {slideDisplayUnit})</p>
        <div className="relative mx-10 mt-8">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-300" />
          <div className="relative grid grid-cols-4">
            {selectedAsset.valuation_history_mb.map((point, index) => {
              const active = index === selectedAsset.valuation_history_mb.length - 1;
              return (
                <div key={point.period} className="text-center">
                  <div className={`mx-auto mb-2 w-fit rounded-full px-3 py-1 text-[11px] font-black text-white ${active ? "bg-[#1a9b63]" : "bg-[#005fac]"}`}>{fmtMb(point.value)}</div>
                  <div className={`relative z-10 mx-auto h-4 w-4 rounded-full border-4 border-white ${active ? "bg-[#1a9b63]" : "bg-[#005fac]"}`} />
                  <p className="mt-2 text-[11px] font-bold text-slate-500">{point.period}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const formatMemo = (command, value) => {
    if (presentationMode) return;
    document.execCommand(command, false, value);
  };
  const memoText = (html) => String(html || "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  const archiveMemo = (status) => {
    if (!memoText(memoDraftHtml)) return;
    setMemoNotes((current) => [{ id: `${Date.now()}-${current.length}`, html: memoDraftHtml, status }, ...current]);
    setMemoDraftHtml("");
  };

  const renderPromptSummary = () => {
    const tableRows = data.tab1_summary.table_1_4_records;
    const paymentFields = ["principal", "interest", "fee", "total", "expense", "dayOne", "yield", "costFee", "costTotal"];
    const paymentCell = (value) => value === "" || value === null || value === undefined
      ? ""
      : typeof value === "number"
        ? value.toLocaleString("th-TH", { maximumFractionDigits: 2 })
        : value;
    const adminSummary = data.tab1_summary.admin_summary_3_3;
    const revenue = adminSummary.revenue;
    const expenses = adminSummary.expenses;
    const summaryUnit = adminSummary.amount_unit || "ล้านบาท";
    const summaryUnitShort = adminSummary.amount_unit_short || slideManagementUnitShort(summaryUnit);
    const summaryAmount = (value) => slideAmount(value)
      ? `${slideAmount(value).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ${summaryUnitShort}`
      : value === 0 ? `0 ${summaryUnitShort}` : "-";
    const managementRows = (group, rows, totalLabel) => [
      ...rows,
      { id: `${group}-total`, label: totalLabel, amount: rows.reduce((sum, row) => sum + slideAmount(row.amount), 0), total: true },
    ];

    return (
      <div className="grid h-[calc(100%-18px)] grid-rows-[48px_1fr] gap-2.5">
        <section className="rounded-lg border border-[#c8e3f7] bg-[#f8fcff] px-4 py-1.5">
          <div className="grid h-full grid-cols-[54px_minmax(0,1fr)_118px_minmax(0,1.25fr)] items-center gap-3 text-[14px]">
            <span className="font-black text-[#005fac]">วาระ:</span>
            <SlideInput value={data.tab1_summary.agenda_text} presentationMode={presentationMode} onChange={(value) => updateSummary("agenda_text", value)} />
            <span className="font-black text-[#005fac]">ประเด็นนำเสนอ:</span>
            <SlideInput value={data.tab1_summary.presentation_point} presentationMode={presentationMode} onChange={(value) => updateSummary("presentation_point", value)} />
          </div>
        </section>

        <div className="grid min-h-0 grid-cols-[320px_minmax(0,1fr)] gap-4">
          <div className="grid min-h-0 grid-rows-[184px_1fr] gap-3">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-[15px] font-black text-[#005fac]">ข้อมูลเคส</h3>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                {[
                  ["Port Lot", data.tab1_summary.metadata.port_lot],
                  ["วันที่รับโอน", data.tab1_summary.metadata.transfer_date],
                  ["Holding Period", `${data.tab1_summary.metadata.holding_period_years} ปี`],
                  ["สถานะทางคดี", data.tab1_summary.metadata.legal_status],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-[#e4f0fa] bg-[#f8fcff] px-2.5 py-2">
                    <p className="text-[11px] font-bold text-slate-500">{label}</p>
                    <p className="mt-0.5 font-black text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <label className="relative flex min-h-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-[#c8e3f7] bg-[#eef7ff] shadow-sm">
              {heroImage ? (
                <img src={heroImage} alt="Main collateral" className="h-full w-full object-cover" />
              ) : (
                <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(145deg,#e8f5ff,#ffffff_45%,#d6e5f1)]">
                  <div className="absolute inset-x-0 bottom-0 flex h-[58%] items-end justify-center gap-2 px-5">
                    {[52, 92, 116, 84, 136, 104].map((height, index) => (
                      <div key={height} className="w-9 rounded-t bg-[#005fac]/75 shadow" style={{ height: `${height}px` }}>
                        <div className="mx-auto mt-3 h-2 w-5 rounded bg-white/55" />
                      </div>
                    ))}
                  </div>
                  <div className="absolute left-4 top-4 rounded-md bg-white/95 px-3 py-2 text-[12px] font-black text-[#005fac] shadow-sm">
                    Main Collateral
                  </div>
                  <div className="slide-editable absolute inset-0 flex items-center justify-center bg-white/30">
                    <div className="rounded-md border border-[#c8e3f7] bg-white/95 px-4 py-3 text-center text-[#005fac] shadow-sm">
                      <UploadCloud className="mx-auto" size={24} />
                      <p className="mt-1 text-[12px] font-bold">อัปโหลดรูปหลักประกัน 1 รูป</p>
                    </div>
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="slide-editable sr-only"
                disabled={presentationMode}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setHeroImage(URL.createObjectURL(file));
                }}
              />
            </label>
          </div>

          <div className="grid min-h-0 grid-rows-[194px_minmax(0,1fr)_38px] gap-2">
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h3 className="text-[14px] font-black text-[#005fac]">1.4 ตารางภาระหนี้เทียบต้นทุนสะสม</h3>
                <button type="button" className="slide-editable inline-flex items-center gap-1 rounded-full border border-[#b9dcf4] bg-[#f8fcff] px-2 py-0.5 text-[11px] font-black text-[#005fac]" onClick={() => setSummaryZoom("payment")}>
                  <Maximize2 size={12} />
                  ดู
                </button>
              </div>
              <table className="w-full table-fixed border-collapse text-[9px]">
                <thead className="bg-[#eaf5fd] text-[#004b93]">
                  <tr>
                    <th rowSpan={2} className="w-[30%] border border-[#b9d4e7] p-0.5 text-left">รายการ</th>
                    <th colSpan={4} className="border border-[#b9d4e7] p-0.5">ภาระหนี้เดิม</th>
                    <th rowSpan={2} className="border border-[#b9d4e7] p-0.5">ค่าใช้จ่าย</th>
                    <th colSpan={4} className="border border-[#b9d4e7] p-0.5">ต้นทุนสะสม</th>
                  </tr>
                  <tr>
                    {["เงินต้น", "ดอกเบี้ย", "คชจ.", "รวม", "DayOne", "Yield", "คชจ.", "รวม"].map((heading, index) => (
                      <th key={`${heading}-${index}`} className="border border-[#b9d4e7] p-0.5">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, index) => (
                    <tr key={row.row_label} className={index === tableRows.length - 1 ? "bg-[#f2fbff] font-bold" : ""}>
                      <td className="border border-slate-200 p-0.5 font-semibold leading-tight">{row.row_label}</td>
                      {paymentFields.map((field) => (
                        <td key={field} className="border border-slate-200 p-0.5 text-right tabular-nums">{paymentCell(row[field])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="text-[14px] font-black text-[#005fac]">3.3 สรุปภาพรวมการบริหารหนี้</h3>
                <div className="flex items-center gap-1">
                  <span className="rounded-full bg-[#eef7ff] px-2 py-0.5 text-[10px] font-black text-[#005fac]">หน่วย: {summaryUnit}</span>
                  <button type="button" className="slide-editable inline-flex items-center gap-1 rounded-full border border-[#b9dcf4] bg-white px-2 py-0.5 text-[11px] font-black text-[#005fac]" onClick={() => setSummaryZoom("management")}>
                    <Maximize2 size={12} />
                    ดู
                  </button>
                </div>
              </div>
              <div className="grid h-[calc(100%-22px)] grid-cols-2 gap-2 text-[11px] leading-tight">
                <div className="min-h-0 overflow-hidden rounded-md border border-[#bde7d5] bg-emerald-50/40 p-2">
                  <p className="mb-1 font-black text-[#005fac]">รายรับ</p>
                  {managementRows("revenue", revenue, "รวมรายรับ").map((row, index, items) => (
                    <div key={row.id} className={`flex items-end justify-between gap-2 py-px ${index === items.length - 1 ? "mt-1 border-t-2 border-slate-800 pt-1 font-black" : "border-b border-emerald-100"}`}>
                      <span className="min-w-0 leading-tight">{row.label}</span>
                      <span className="shrink-0 tabular-nums">{summaryAmount(row.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="min-h-0 overflow-hidden rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-2">
                  <p className="mb-1 font-black text-[#005fac]">รายจ่าย</p>
                  {managementRows("expenses", expenses, "รวมรายจ่าย").map((row, index, items) => (
                    <div key={row.id} className={`flex items-end justify-between gap-2 py-px ${index === items.length - 1 ? "mt-1 border-t-2 border-slate-800 pt-1 font-black" : "border-b border-slate-100"}`}>
                      <span className="min-w-0 leading-tight">{row.label}</span>
                      <span className="shrink-0 tabular-nums">{summaryAmount(row.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-3 gap-3">
              {[
                ["ต้นทุน ณ วันรับโอน", fmtOneMb(data.tab1_summary.decision_metrics.cost_at_transfer_mb)],
                ["% เงินต้น ณ วันโอน", `${data.tab1_summary.decision_metrics.principal_ratio_percentage}%`],
                ["% ราคาประเมิน", `${data.tab1_summary.decision_metrics.appraisal_ratio_percentage}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-center rounded-full border border-[#b9dcf4] bg-[#f2fbff] px-4 py-2 text-center shadow-sm">
                  <span className="text-[12px] font-bold text-slate-600">{label}</span>
                  <b className="ml-2 text-[14px] text-[#005fac]">{value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryZoomModal = () => {
    if (!summaryZoom) return null;
    const paymentFields = ["principal", "interest", "fee", "total", "expense", "dayOne", "yield", "costFee", "costTotal"];
    const paymentCell = (value) => value === "" || value === null || value === undefined
      ? ""
      : typeof value === "number"
        ? value.toLocaleString("th-TH", { maximumFractionDigits: 2 })
        : value;
    const adminSummary = data.tab1_summary.admin_summary_3_3;
    const summaryUnit = adminSummary.amount_unit || "ล้านบาท";
    const summaryUnitShort = adminSummary.amount_unit_short || slideManagementUnitShort(summaryUnit);
    const summaryAmount = (value) => slideAmount(value)
      ? `${slideAmount(value).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ${summaryUnitShort}`
      : value === 0 ? `0 ${summaryUnitShort}` : "-";
    const totalRow = (group, rows, label) => [...rows, {
      id: `${group}-total-popup`,
      label,
      amount: rows.reduce((sum, row) => sum + slideAmount(row.amount), 0),
      total: true,
    }];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-5" onMouseDown={() => setSummaryZoom(null)}>
        <section className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-xl border border-white/40 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
          <header className="flex items-center justify-between border-b border-[#d7eaf8] bg-[#f5fbff] px-5 py-3">
            <div>
              <p className="text-[12px] font-black text-[#005fac]">ดูข้อมูลเต็มจอ</p>
              <h3 className="text-[18px] font-black text-[#003a70]">
                {summaryZoom === "payment" ? "1.4 ตารางภาระหนี้เทียบต้นทุนสะสม" : "3.3 สรุปภาพรวมการบริหารหนี้"}
              </h3>
            </div>
            <button type="button" aria-label="ปิด" className="rounded-full border border-[#c8e3f7] bg-white p-2 text-[#005fac] shadow-sm" onClick={() => setSummaryZoom(null)}>
              <X size={20} />
            </button>
          </header>
          <div className="max-h-[calc(92vh-76px)] overflow-auto p-5">
            {summaryZoom === "payment" ? (
              <table className="w-full min-w-[980px] table-fixed border-collapse text-[13px]">
                <thead className="bg-[#eaf5fd] text-[#004b93]">
                  <tr>
                    <th rowSpan={2} className="w-[30%] border border-[#b9d4e7] p-2 text-left">รายการ</th>
                    <th colSpan={4} className="border border-[#b9d4e7] p-2">ภาระหนี้เดิม</th>
                    <th rowSpan={2} className="border border-[#b9d4e7] p-2">ค่าใช้จ่าย</th>
                    <th colSpan={4} className="border border-[#b9d4e7] p-2">ต้นทุนสะสม</th>
                  </tr>
                  <tr>
                    {["เงินต้น", "ดอกเบี้ย", "คชจ.", "รวม", "DayOne", "Yield", "คชจ.", "รวม"].map((heading, index) => (
                      <th key={`${heading}-popup-${index}`} className="border border-[#b9d4e7] p-2">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.tab1_summary.table_1_4_records.map((row, index) => (
                    <tr key={`${row.row_label}-popup`} className={index === data.tab1_summary.table_1_4_records.length - 1 ? "bg-[#f2fbff] font-bold" : ""}>
                      <td className="border border-slate-200 p-2 font-semibold">{row.row_label}</td>
                      {paymentFields.map((field) => <td key={`${row.row_label}-${field}-popup`} className="border border-slate-200 p-2 text-right tabular-nums">{paymentCell(row[field])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  ["รายรับ", "revenue", adminSummary.revenue, "รวมรายรับ", "border-emerald-200 bg-emerald-50/55"],
                  ["รายจ่าย", "expenses", adminSummary.expenses, "รวมรายจ่าย", "border-[#d7eaf8] bg-[#f8fcff]"],
                ].map(([title, group, rows, totalLabel, tone]) => (
                  <section key={group} className={`rounded-xl border p-4 ${tone}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-[17px] font-black text-[#005fac]">{title}</h4>
                      <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-slate-600">หน่วย: {summaryUnit}</span>
                    </div>
                    <div className="space-y-1 text-[14px]">
                      {totalRow(group, rows, totalLabel).map((row) => (
                        <div key={row.id} className={`grid grid-cols-[minmax(0,1fr)_150px] gap-4 py-2 ${row.total ? "mt-2 border-t-2 border-slate-800 font-black" : "border-b border-white/80"}`}>
                          <span>{row.label}</span>
                          <span className="text-right tabular-nums">{summaryAmount(row.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  };

  const renderPromptDebtor = () => (
    <div className="grid h-[calc(100%-18px)] grid-rows-[62px_174px_34px_1fr] gap-2">
      <div className="grid grid-cols-3 gap-3">
        {[
          ["รายได้รวมต่อเดือน", incomeTotal, "border-[#005fac] text-[#005fac]"],
          ["รายจ่ายรวมประจำเดือน", expenseTotal, "border-[#df5962] text-[#df4550]"],
          ["รายได้คงเหลือสุทธิ (Net)", netIncome, "border-[#1a9b63] bg-emerald-50 text-[#1a9b63]"],
        ].map(([label, value, tone]) => (
          <section key={label} className={`rounded-lg border-t-4 border border-slate-200 bg-white px-4 py-2 text-center shadow-sm ${tone}`}>
            <p className="flex items-center justify-center gap-1 text-[12px] font-bold text-slate-600"><Lock size={12} />{label}</p>
            <p className="mt-0.5 text-[21px] font-black tabular-nums">{fmtThb(value)}</p>
          </section>
        ))}
      </div>

      <div className="grid min-h-0 grid-cols-[1.12fr_0.88fr] gap-2.5">
        <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="border-l-4 border-[#005fac] pl-2 text-[15px] font-black text-[#005fac]">สรุปสถานะเงิน</h3>
            {!presentationMode && (
              <div className="slide-editable flex items-center gap-1 text-[11px]">
                <button type="button" title="ตัวหนา" className="h-7 min-w-7 rounded border border-[#c8e3f7] bg-white px-1 font-black text-[#005fac]" onMouseDown={(event) => {
                  event.preventDefault();
                  formatMemo("bold");
                }}>B</button>
                <button type="button" title="ขีดเส้นใต้" className="h-7 min-w-7 rounded border border-[#c8e3f7] bg-white px-1 font-black text-[#005fac] underline" onMouseDown={(event) => {
                  event.preventDefault();
                  formatMemo("underline");
                }}>U</button>
                <span className="ml-1 font-bold text-slate-500">Highlight</span>
                {[
                  ["#fecaca", "แดง"],
                  ["#fef08a", "เหลือง"],
                  ["#bbf7d0", "เขียว"],
                  ["#bfdbfe", "น้ำเงิน"],
                ].map(([color, title]) => (
                  <button key={color} type="button" title={`ไฮไลท์${title}`} className="h-5 w-5 rounded border border-white shadow ring-1 ring-slate-200" style={{ backgroundColor: color }} onMouseDown={(event) => {
                    event.preventDefault();
                    formatMemo("hiliteColor", color);
                  }} />
                ))}
                <span className="ml-1 font-bold text-slate-500">สีอักษร</span>
                {["#0f172a", "#dc2626", "#166534", "#005fac"].map((color) => (
                  <button key={color} type="button" title="เปลี่ยนสีอักษรที่เลือก" className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white text-[11px] font-black" style={{ color }} onMouseDown={(event) => {
                    event.preventDefault();
                    formatMemo("foreColor", color);
                  }}>A</button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-1.5 grid h-[132px] grid-rows-[68px_1fr] gap-1.5">
            <div className="relative overflow-hidden rounded-md border-l-4 border-[#facc15] bg-yellow-50 shadow-inner">
              <div
                className={`h-full overflow-y-auto px-3 py-2 text-[13px] leading-relaxed outline-none ${presentationMode ? "" : "bg-yellow-50/70 focus:bg-white focus:ring-1 focus:ring-[#005fac]"}`}
                contentEditable={!presentationMode}
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: memoDraftHtml }}
                onInput={(event) => setMemoDraftHtml(event.currentTarget.innerHTML)}
              />
              {!presentationMode && (
                <div className="slide-editable absolute bottom-1 right-1 flex gap-1 bg-yellow-50/90 pl-1">
                  <button type="button" className="rounded border border-[#c8e3f7] bg-white px-2 py-1 text-[11px] font-black text-[#005fac]" onMouseDown={(event) => event.preventDefault()} onClick={() => archiveMemo("เพิ่มแล้ว")}>+ เพิ่ม Note</button>
                  <button type="button" className="rounded bg-[#005fac] px-2 py-1 text-[11px] font-black text-white shadow" onMouseDown={(event) => event.preventDefault()} onClick={() => archiveMemo("ส่งแล้ว")}>ส่ง Note</button>
                </div>
              )}
            </div>
            <div className="overflow-y-auto rounded-md border border-[#e4f0fa] bg-[#f8fcff] px-2 py-1.5">
              {memoNotes.length ? (
                <div className="space-y-1.5">
                  {memoNotes.map((note, index) => (
                    <article key={note.id} className="rounded border border-white bg-white px-2 py-1 shadow-sm">
                      <p className="mb-0.5 text-[10px] font-black text-[#005fac]">Note {memoNotes.length - index} · {note.status}</p>
                      <div className="line-clamp-2 text-[12px] leading-snug" dangerouslySetInnerHTML={{ __html: note.html }} />
                    </article>
                  ))}
                </div>
              ) : !presentationMode ? (
                <p className="text-[11px] text-slate-500">Note ที่ส่งแล้วจะแสดงตรงนี้และเลื่อนดูได้</p>
              ) : null}
            </div>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-2.5">
          <section className="flex flex-col items-center justify-center rounded-lg border-2 border-[#005fac] bg-white p-3 text-center shadow-sm">
            <p className="text-[12px] font-bold text-slate-600">ความสามารถในการชำระหนี้ปัจจุบัน</p>
            <input
              className="slide-input mt-1.5 w-full bg-transparent text-center text-[26px] font-black text-[#005fac] outline-none"
              value={fmtThb(repaymentCapacity)}
              disabled={presentationMode}
              onChange={(event) => setRepaymentCapacity(Number(event.target.value.replace(/[^\d.]/g, "")) || 0)}
            />
          </section>
          <section className="flex flex-col items-center justify-center rounded-lg border border-[#bde7d5] bg-emerald-50 p-3 text-center shadow-sm">
            <p className="text-[12px] font-bold text-[#137a4e]">สัดส่วนเทียบรายได้คงเหลือ</p>
            <p className="text-[11px] font-bold text-slate-500">วัดจากรายได้รวม 100%</p>
            <p className="mt-1.5 text-[30px] font-black text-[#1a9b63]">{ratio.toFixed(1)}%</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500"><Lock size={11} />ลดลงเมื่อค่าใช้จ่ายหรือภาระหนี้เพิ่ม</p>
          </section>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-hidden">
        {data.tab2_debtors.map((person, index) => (
          <button
            key={person.debtor_id}
            type="button"
            className={`rounded-full px-4 py-2 text-[13px] font-black transition ${activeDebtorId === person.debtor_id ? "bg-[#005fac] text-white" : "border border-[#c8e3f7] bg-white text-[#005fac]"}`}
            onClick={() => setActiveDebtorId(person.debtor_id)}
          >
            {index === 0 ? "ลูกหนี้หลัก" : "ลูกหนี้ร่วม"}: {person.debtor_name}
          </button>
        ))}
        <span className="truncate text-[12px] text-slate-500">
          อายุ {activeDebtor.age || 48} ปี · {activeDebtor.occupation} · {activeDebtor.registered_address}
        </span>
      </div>

      <div className="grid min-h-0 grid-cols-3 gap-2.5">
        {renderCashflowTable({ title: "รายได้", group: "income", items: activeDebtor.cashflow_items.income, tone: "bg-[#e4f3ff] text-[#005fac]" })}
        {renderCashflowTable({ title: "ค่าใช้จ่าย", group: "expense", items: activeDebtor.cashflow_items.expense, tone: "bg-rose-50 text-rose-700" })}
        {renderCashflowTable({ title: "ภาระหนี้", group: "liability", items: activeDebtor.cashflow_items.liability || [], tone: "bg-amber-50 text-amber-800" })}
      </div>
    </div>
  );

  const renderPromptLegal = () => (
    <div className="grid h-full grid-rows-[150px_1fr_154px] gap-3">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-black text-[#005fac]">ความคืบหน้าทางคดี</h3>
          <div className="flex gap-2 text-[12px] font-black">
            <span className="rounded-full bg-[#005fac] px-3 py-1 text-white">สถานะปัจจุบัน: {data.tab3_litigation.status_overview.current_status}</span>
            <span className="rounded-full border border-[#c8e3f7] bg-[#f8fcff] px-3 py-1 text-[#005fac]">ความเคลื่อนไหวล่าสุด: {data.tab3_litigation.status_overview.last_activity_date}</span>
          </div>
        </div>
        <div className="relative mt-7 grid grid-cols-5">
          <div className="absolute left-[8%] right-[8%] top-4 h-1 rounded-full bg-[#d7eaf8]" />
          {data.tab3_litigation.timeline_milestones.map((item, index) => (
            <div key={item.label} className="relative text-center">
              <div className={`relative z-10 mx-auto h-9 w-9 rounded-full border-[6px] border-white shadow-sm ${item.is_completed ? "bg-[#005fac]" : "bg-slate-300"}`} />
              <p className="mt-2 text-[13px] font-black text-slate-900">{index + 1}. {item.label}</p>
              <p className="text-[11px] text-slate-500">{item.date}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h3 className="mb-2 border-l-4 border-[#005fac] pl-2 text-[15px] font-black text-[#005fac]">รายการคดีความทั้งหมดของพอร์ต</h3>
        <table className="w-full table-fixed border-collapse text-[12px]">
          <thead className="bg-[#eaf5fd] text-[#004b93]">
            <tr>
              {["หมายเลขคดีดำ/คดีแดง", "ประเภทคดี", "วันที่ยื่นฟ้อง", "วันที่ศาลพิพากษา", "ทุนทรัพย์ฟ้องรวม", "สถานะความคืบหน้า", "แอคชัน"].map((heading) => (
                <th key={heading} className="border border-[#c8ddeb] p-2">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.tab3_litigation.cases.map((caseItem) => (
              <tr
                key={caseItem.case_id}
                className={`cursor-pointer transition ${selectedCaseId === caseItem.case_id ? "bg-[#eef7ff]" : "hover:bg-slate-50"}`}
                onClick={() => setSelectedCaseId(caseItem.case_id)}
              >
                <td className="border p-2 font-black">{caseItem.case_id}<br /><span className="text-slate-500">{caseItem.red_number}</span></td>
                <td className="border p-2">{caseItem.case_type}</td>
                <td className="border p-2">{caseItem.filing_date}</td>
                <td className="border p-2">{caseItem.judgment_date}</td>
                <td className="border p-2 text-right font-bold tabular-nums">{fmtThb(caseItem.capital_value_thb)}</td>
                <td className="border p-2 font-bold text-[#005fac]">{caseItem.status_label}</td>
                <td className="border p-2 text-center"><span className="rounded border border-[#9ed4f5] px-2 py-1 font-bold text-[#005fac]">{selectedCaseId === caseItem.case_id ? "กำลังแสดง" : "เลือกดู"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-[#c8e3f7] bg-[#f8fcff] p-4 text-[13px] shadow-sm">
        <h3 className="mb-3 font-black text-[#005fac]">รายละเอียดคดีที่เลือก</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            ["ทุนทรัพย์ฟ้อง", fmtThb(selectedCase.deep_details.total_capital_claim)],
            ["หลักประกันที่โยง", `${selectedCase.deep_details.linked_collateral_count} รายการ`],
            ["ศาลที่พิจารณา", selectedCase.deep_details.jurisdiction_court],
            ["สถานะล่าสุด", selectedCase.status_label],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-white px-3 py-2 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500">{label}</p>
              <p className="font-black text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-[#d7eaf8] pt-2"><b className="text-[#005fac]">บันทึกทางกฎหมาย:</b> {selectedCase.deep_details.legal_notes}</p>
      </section>
    </div>
  );

  const renderPromptRestructure = () => {
    const proposal = data.tab4_restructuring.current_proposal;
    return (
      <div className="grid h-full grid-rows-[178px_1fr] gap-4">
        <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-100 px-4 py-2">
            <h3 className="text-[15px] font-black text-[#005fac]">ข้อเสนอปรับโครงสร้างหนี้ปัจจุบัน</h3>
          </div>
          <div className="grid grid-cols-4 divide-x divide-slate-200">
            {[
              ["ยอดรับชำระรวม", "total_agreed_repayment_mb", slideDisplayUnit],
              ["เงินต้นใหม่", "new_principal_mb", slideDisplayUnit],
              ["ดอกเบี้ย", "negotiated_interest_mb", slideDisplayUnit],
              ["อัตราดอกเบี้ย", "interest_rate_percent", "%"],
            ].map(([label, field, unit]) => (
              <label key={field} className="bg-white px-4 py-3 text-center">
                <span className="block text-[12px] font-bold text-slate-500">{label}</span>
                <span className="mt-1 flex items-baseline justify-center gap-1">
                  <input className="slide-input w-24 bg-transparent text-center text-[24px] font-black text-[#005fac] outline-none" value={proposal[field] ?? (field === "interest_rate_percent" ? 3.5 : 0)} disabled={presentationMode} onChange={(event) => updateProposal(field, event.target.value)} />
                  <b className="text-[12px] text-slate-500">{unit}</b>
                </span>
              </label>
            ))}
          </div>
          <div className="border-t border-slate-200 px-4 py-2">
            <p className="text-[11px] font-bold text-slate-500">หมายเหตุข้อเสนอ</p>
            <SlideInput className="text-[13px]" value={proposal.payment_terms_note} presentationMode={presentationMode} onChange={(value) => updateProposal("payment_terms_note", value)} />
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 border-l-4 border-[#005fac] pl-2 text-[16px] font-black text-[#005fac]">ประวัติการยื่นเจรจาประนีประนอมในอดีต</h3>
          <div className="space-y-2">
            {data.tab4_restructuring.history_logs.map((log) => {
              const isFailed = String(log.status).includes("ผิด") || String(log.status).includes("ไม่");
              return (
                <article key={log.round_number} className="grid grid-cols-[190px_minmax(0,1fr)_300px] items-center gap-3 rounded-lg border border-slate-200 bg-[#fbfdff] p-3">
                  <div>
                    <p className="text-[14px] font-black text-[#005fac]">รอบที่ {log.round_number}</p>
                    <p className="text-[12px] text-slate-500">{log.date}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${isFailed ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{log.status}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[12px]">
                    {[
                      ["เงินต้น", log.matrix.principal_mb],
                      ["ดอกเบี้ย", log.matrix.interest_mb],
                      ["คชจ.", log.matrix.expenses_mb],
                      ["รวมเสนอ", log.matrix.total_mb],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-[#d7eaf8] bg-white px-2 py-2">
                        <p className="font-bold text-slate-500">{label}</p>
                        <p className="font-black text-slate-900">{fmtMb(value)}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-end justify-between text-[12px]">
                      <span className="font-bold text-slate-600">รับชำระแล้ว {fmtThb(log.actual_recovered_amount_thb)}</span>
                      <b className="text-[16px] text-[#005fac]">{log.recovery_percentage}%</b>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${isFailed ? "bg-[#df5962]" : "bg-[#1a9b63]"}`} style={{ width: `${Math.min(log.recovery_percentage, 100)}%` }} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">{log.failure_reason_note}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    );
  };

  const renderPromptCollateral = (printMode = false) => (
    <div className="grid h-[calc(100%-18px)] grid-rows-[42px_1fr_92px] gap-2">
      <section className="rounded-lg border border-[#9ed4f5] bg-[#eef7ff] px-5 py-1.5">
        <div className="grid h-full grid-cols-[1.05fr_1.4fr_1.25fr_1.25fr] items-center gap-4 text-[13px] font-bold text-[#005fac]">
          <span>Client ID: <b>{data.tab5_collateral.portfolio_totals.client_id}</b></span>
          <span>Client Name: <b>{data.tab5_collateral.portfolio_totals.client_name}</b></span>
          <span>Total Outstanding Debt: <b>{fmtMb(data.tab5_collateral.portfolio_totals.outstanding_debt_balance_mb)}</b></span>
          <span>Total Portfolio Value: <b className="text-[#1a9b63]">{fmtMb(data.tab5_collateral.portfolio_totals.total_appraisal_mb)}</b></span>
        </div>
      </section>

      <div className="grid min-h-0 grid-cols-[228px_minmax(0,1fr)_336px] gap-3">
        <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
          <h3 className="mb-2 text-[14px] font-black text-[#005fac]">รายการหลักประกัน</h3>
          <div className="space-y-2">
            {data.tab5_collateral.items.map((item) => (
              <button key={item.asset_id} type="button" className={`flex w-full items-center gap-2 rounded-md border px-3 py-3 text-left transition ${selectedAssetId === item.asset_id ? "border-[#005fac] bg-[#eef7ff] text-[#005fac]" : "border-slate-200 bg-white text-slate-500"}`} onClick={() => setSelectedAssetId(item.asset_id)}>
                <MapPin size={17} />
                <span className="min-w-0">
                  <b className="block truncate text-[13px]">{item.asset_id}</b>
                  <span className="block truncate text-[11px]">{item.asset_title} · {fmtOneMb(item.latest_appraisal_thb / 1000000)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm grid-cols-[1fr_102px]">
          <div className="relative overflow-hidden">
            {printMode ? (
              <img
                src={slideMapSnapshotSrc(selectedAsset)}
                alt={`Google Maps pin snapshot ${selectedAsset.asset_id}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <iframe
                title={`Google Map ${selectedAsset.asset_id}`}
                className="h-full w-full border-0"
                src={mapEmbedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
            <b className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/70 bg-white/95 px-3 py-1 text-[11px] text-[#005fac] shadow">{selectedAsset.asset_id} · Google Maps</b>
          </div>
          <div className="relative border-l border-slate-200 bg-white px-3 py-10 text-[12px] font-bold text-slate-700">
            <p className="text-[#005fac]">GPS</p>
            <p className="mt-4">Lat</p>
            <p>{selectedAsset.gps_coordinates.latitude.toFixed(4)}</p>
            <p className="mt-3">Lng</p>
            <p>{selectedAsset.gps_coordinates.longitude.toFixed(4)}</p>
            <div className="slide-editable absolute bottom-3 left-2 right-2 rounded border border-[#d7eaf8] bg-white p-1 text-[11px] shadow-sm">
              <button type="button" className="w-full font-black text-[#005fac]" onClick={() => setCoordEditing((current) => !current)}>แก้พิกัด</button>
              {coordEditing && (
                <div className="mt-1 grid gap-1">
                  <input className="w-full border px-1" value={selectedAsset.gps_coordinates.latitude} onChange={(event) => updateAssetCoordinate("latitude", event.target.value)} />
                  <input className="w-full border px-1" value={selectedAsset.gps_coordinates.longitude} onChange={(event) => updateAssetCoordinate("longitude", event.target.value)} />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white text-[12px] shadow-sm">
          <h3 className="border-b border-slate-200 px-4 py-2 text-[14px] font-black text-[#005fac]">สรุปข้อมูลหลักประกัน</h3>
          <div className="px-4 py-1.5">
            {[
              ["เลขที่โฉนด", selectedAsset.title_deed_no],
              ["ประเภททรัพย์", selectedAsset.asset_title],
              ["ที่อยู่", selectedAsset.registered_address],
              ["จังหวัด / เขต", selectedAsset.district_province],
              ["ผู้ถือกรรมสิทธิ์", selectedAsset.registered_owner],
              ["สถานะบังคับคดี", selectedAsset.judicial_status],
              ["มูลค่าจำนอง", fmtThb(selectedAsset.mortgage_value_thb)],
              ["ราคาประเมิน Day-One", fmtThb(selectedAsset.initial_appraisal_thb)],
              ["ราคาประเมินล่าสุด", fmtThb(selectedAsset.latest_appraisal_thb)],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[132px_1fr] gap-2 border-b border-slate-100 py-1">
                <span className="font-bold text-slate-500">{label}</span>
                <span className={`text-right font-black ${label === "สถานะบังคับคดี" ? "text-[#df4550]" : label === "ราคาประเมินล่าสุด" ? "text-[#1a9b63]" : "text-slate-900"}`}>{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white px-6 py-1.5 shadow-sm">
        <p className="text-[13px] font-black text-[#005fac]">ประวัติราคาประเมิน</p>
        <div className="relative mx-8 mt-2.5">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-[#b9dcf4]" />
          <div className="relative grid grid-cols-4">
            {selectedAsset.valuation_history_mb.map((point, index) => {
              const active = index === selectedAsset.valuation_history_mb.length - 1;
              return (
                <div key={point.period} className="text-center">
                  <div className={`mx-auto mb-2 w-fit rounded-full px-3 py-1 text-[11px] font-black text-white ${active ? "bg-[#1a9b63]" : "bg-[#005fac]"}`}>{fmtOneMb(point.value)}</div>
                  <div className={`relative z-10 mx-auto h-4 w-4 rounded-full border-4 border-white shadow ${active ? "bg-[#1a9b63]" : "bg-[#005fac]"}`} />
                  <p className="mt-2 text-[11px] font-bold text-slate-500">{point.period}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );

  const renderTab = (tabKey = activeTab, printMode = false) => {
    if (tabKey === "summary") return renderPromptSummary();
    if (tabKey === "debtor") return renderPromptDebtor();
    if (tabKey === "legal") return renderPromptLegal();
    if (tabKey === "restructure") return renderPromptRestructure();
    return renderPromptCollateral(printMode);
  };
  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab) + 1;
  const exportSlideDeck = () => {
    window.setTimeout(() => window.print(), 30);
  };
  const bamLogoSrc = "https://bam-bo-fs-prd.bam.co.th/bam-strapi/logo_2435d8c3fa.svg";

  const renderSlideHeader = (currentTabKey, interactive = true) => {
    const currentTab = tabs.find((tab) => tab.key === currentTabKey);
    if (!interactive) {
      return (
        <header className="slide-export-header relative overflow-hidden border-b border-[#b9dcf4] bg-[linear-gradient(110deg,#eaf6ff,#ffffff_52%,#ddf8f1)] text-[#003a70]">
          <div className="absolute left-0 top-0 h-full w-2 bg-[#005fac]" />
          <div className="flex h-full items-center justify-between gap-5 px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#c8e3f7]">
                <img src={bamLogoSrc} alt="BAM logo" className="h-8 w-8 object-contain" />
              </span>
              <div>
                <p className="text-[13px] font-black leading-none">BAM</p>
                <p className="mt-1 text-[11px] font-bold text-[#005fac]">ระบบสร้างสไลด์นำเสนอ</p>
              </div>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-bold text-slate-500">Presentation Deck</p>
              <p className="truncate text-[17px] font-black">{currentTab?.label}</p>
            </div>
          </div>
        </header>
      );
    }
    return (
    <header className="slide-topbar relative bg-[#004b93] text-white">
      <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-gradient-to-r from-[#004b93] via-[#0b73bb] to-[#f18a1b]" />
      <div className="grid h-full grid-cols-[112px_1fr_102px_178px] gap-0 px-3 pt-1.5">
        <button type="button" className="flex flex-col items-center justify-center text-center" onClick={interactive ? onBack : undefined}>
          <span className="flex h-[34px] w-[58px] items-center justify-center rounded bg-white px-1 shadow-sm">
            <img src={bamLogoSrc} alt="BAM logo" className="h-[30px] w-auto object-contain" />
          </span>
          <span className="mt-0.5 text-[13px] font-bold leading-none">BAM</span>
          {interactive ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[9px] font-bold leading-tight text-sky-50">
              <ArrowLeft size={11} />
              กลับหน้าอนุมัติ
            </span>
          ) : (
            <span className="mt-1 text-[10px] leading-tight text-sky-100">Presentation<br />System</span>
          )}
        </button>
        <nav className="flex min-w-0 items-end gap-1">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const active = currentTabKey === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`slide-tab h-[62px] min-w-0 flex-1 rounded-t-lg border px-3 text-left text-[13px] font-bold leading-tight transition ${
                  active
                    ? "border-white bg-white text-[#003a70]"
                    : "border-[#2b7fbd] bg-[#005fac] text-sky-50 hover:bg-[#0b73bb]"
                }`}
                onClick={interactive ? () => setActiveTab(tab.key) : undefined}
              >
                <span className="flex items-center gap-1.5">
                  <Icon size={15} />
                  <span>{index + 1}. {tab.label}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <button type="button" className="mx-2 mb-2 mt-2 rounded-md bg-[#005fac] text-[13px] font-black text-white shadow-sm ring-1 ring-white/20" onClick={interactive ? exportSlideDeck : undefined}>
          <FileText className="mx-auto mb-1" size={16} />
          Export<br />PDF
        </button>
        <div className="mb-2 mt-2 rounded-md border border-white/25 bg-[#06152a] p-1 shadow-sm">
          <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-normal text-sky-100">Mode</p>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              className={`rounded px-2 py-2 text-[12px] font-black transition ${!presentationMode ? "bg-white text-[#004b93]" : "bg-white/10 text-sky-50"}`}
              onClick={interactive ? () => setPresentationMode(false) : undefined}
            >
              Edit
            </button>
            <button
              type="button"
              className={`rounded px-2 py-2 text-[12px] font-black transition ${presentationMode ? "bg-[#1a9b63] text-white" : "bg-white/10 text-sky-50"}`}
              onClick={interactive ? () => setPresentationMode(true) : undefined}
            >
              Presentation
            </button>
          </div>
        </div>
      </div>
    </header>
    );
  };

  const renderSlideCanvas = (tabKey, printMode = false) => {
    const tabNumber = tabs.findIndex((tab) => tab.key === tabKey) + 1;
    return (
      <section className={`slide-container ${printMode ? "slide-print-page" : "h-screen min-h-[720px] w-full shadow-2xl ring-1 ring-slate-300"} ${presentationMode ? "slide-presenting" : ""} overflow-hidden bg-white`}>
        <div className={`grid h-full ${printMode ? "grid-rows-[58px_1fr]" : "grid-rows-[82px_1fr]"}`}>
          {renderSlideHeader(tabKey, !printMode)}
          <div className={`relative min-h-0 px-6 py-4 xl:px-9 xl:py-5 ${printMode ? "slide-export-body bg-[#f7fbff]" : "bg-white"}`}>
            {renderTab(tabKey, printMode)}
            <div className="pointer-events-none absolute bottom-3 right-8 text-[12px] font-bold text-slate-400">สไลด์นำเสนอหน้า {tabNumber}/5</div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <main className="slide-page min-h-screen bg-[#eef7ff] text-slate-900">
      <div className="slide-screen-view">
        <div className="slide-print-host h-screen w-full overflow-hidden">
          {renderSlideCanvas(activeTab)}
        </div>
      </div>
      {renderSummaryZoomModal()}
      <div className="slide-print-deck">
        {tabs.map((tab) => (
          <React.Fragment key={tab.key}>{renderSlideCanvas(tab.key, true)}</React.Fragment>
        ))}
      </div>
    </main>
  );
}

function AllDebtorsOverviewPage({ debtors }) {
  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm shadow-blue-100/60">
        <p className="text-sm font-semibold text-[#005fac]">All Debtors Overview</p>
        <h2 className="mt-1 text-2xl font-bold text-[#003a70]">รายละเอียดลูกหนี้</h2>
        <p className="mt-1 text-sm text-slate-500">ภาพรวมรายการลูกหนี้ทั้งหมดจากข้อมูล mock data</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {debtors.map((debtor) => (
          <DebtorInfoCard key={debtor.customerId} debtor={debtor} />
        ))}
      </div>
    </section>
  );
}

const summaryDraftStorageKey = "bam-summary-drafts";
const legacySummaryDraftStorageKey = "bam-summary-draft";

function draftCustomerId(draft) {
  return draft?.debtor?.customerId || draft?.payload?.clientCode || "";
}

function readSavedDrafts() {
  try {
    const savedDrafts = JSON.parse(localStorage.getItem(summaryDraftStorageKey) || "[]");
    if (Array.isArray(savedDrafts) && savedDrafts.length) {
      return [...savedDrafts].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    }

    const legacyDraft = JSON.parse(localStorage.getItem(legacySummaryDraftStorageKey) || "null");
    if (legacyDraft) return [legacyDraft];
  } catch {
    return [];
  }

  return [];
}

function readSavedDraft(debtorOrCustomerId) {
  const customerId = typeof debtorOrCustomerId === "string" ? debtorOrCustomerId : debtorOrCustomerId?.customerId;
  const drafts = readSavedDrafts();
  if (!customerId) return drafts[0] ?? null;
  return drafts.find((draft) => draftCustomerId(draft) === customerId) ?? null;
}

function saveSummaryDraft(nextDraft) {
  const customerId = draftCustomerId(nextDraft);
  const remainingDrafts = readSavedDrafts().filter((draft) => draftCustomerId(draft) !== customerId);
  const drafts = [nextDraft, ...remainingDrafts];
  localStorage.setItem(summaryDraftStorageKey, JSON.stringify(drafts));
  localStorage.setItem(legacySummaryDraftStorageKey, JSON.stringify(nextDraft));
  return drafts;
}

function PendingApprovalPage({ onReviewDraft, onCreateSlide }) {
  const [savedDrafts, setSavedDrafts] = useState(readSavedDrafts);
  const setDraftStatus = (savedDraft, status) => {
    if (!savedDraft) return;
    const nextDraft = {
      ...savedDraft,
      status,
      approvedAt: status === "approved" ? new Date().toISOString() : savedDraft.approvedAt,
      rejectedAt: status === "rejected" ? new Date().toISOString() : savedDraft.rejectedAt,
    };
    setSavedDrafts(saveSummaryDraft(nextDraft));
  };

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm shadow-blue-100/60">
        <p className="text-sm font-semibold text-[#005fac]">Approval Queue</p>
        <h2 className="mt-1 text-2xl font-bold text-[#003a70]">รายการที่รออนุมัติหลังสร้างใบสรุปนำเสนอ</h2>
        <p className="mt-1 text-sm text-slate-500">รายการดราฟหรือใบสรุปที่สร้างแล้วและรอขั้นตอนอนุมัติ</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#c8e3f7] bg-white shadow-sm shadow-blue-100/60">
        <table className="min-w-full divide-y divide-[#d7eaf8]">
          <thead className="bg-[#e6f3fc]">
            <tr>
              {["เลขที่รายการ", "รหัสลูกค้า", "ชื่อลูกหนี้", "วันที่สร้าง", "สถานะ", "จัดการ"].map((heading) => (
                <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#335f82]">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e7f2fb]">
            {savedDrafts.length ? (
              savedDrafts.map((savedDraft) => {
                const isApproved = savedDraft.status === "approved";
                const isRejected = savedDraft.status === "rejected";
                return (
                  <tr key={savedDraft.id || draftCustomerId(savedDraft)}>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{savedDraft.id}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{savedDraft.debtor?.customerId ?? "-"}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{savedDraft.debtor?.debtorName ?? "-"}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{new Date(savedDraft.createdAt).toLocaleString("th-TH")}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${isApproved ? "border-green-200 bg-green-50 text-green-700" : isRejected ? "border-red-200 bg-red-50 text-red-700" : "border-yellow-200 bg-yellow-50 text-yellow-800"}`}>
                        {isApproved ? "อนุมัติแล้ว" : isRejected ? "ไม่อนุมัติ" : "รออนุมัติ"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="h-9 rounded-md border border-[#b9dcf4] bg-white px-3 text-xs font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
                          onClick={() => onReviewDraft?.(savedDraft)}
                        >
                          ดูข้อมูล/เอกสาร
                        </button>
                        {!isApproved && !isRejected && (
                          <button
                            type="button"
                            className="h-9 rounded-md bg-[#005fac] px-3 text-xs font-semibold text-white transition hover:bg-[#004b93]"
                            onClick={() => setDraftStatus(savedDraft, "approved")}
                          >
                            อนุมัติ
                          </button>
                        )}
                        {!isApproved && !isRejected && (
                          <button
                            type="button"
                            className="h-9 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            onClick={() => setDraftStatus(savedDraft, "rejected")}
                          >
                            ไม่อนุมัติ
                          </button>
                        )}
                        <button
                          type="button"
                          className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition ${
                            isApproved
                              ? "bg-[#1a9b63] text-white hover:bg-[#137a4e]"
                              : "cursor-not-allowed bg-slate-200 text-slate-500"
                          }`}
                          onClick={() => isApproved && onCreateSlide?.(savedDraft)}
                          disabled={!isApproved}
                          title={isApproved ? "สร้างสไลด์นำเสนอ" : "ต้องตรวจเอกสารและอนุมัติก่อน"}
                        >
                          <Presentation size={16} />
                          สร้างสไลด์นำเสนอ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={6}>
                  ยังไม่มีรายการที่รออนุมัติ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ApprovalReviewPage({ draft, onBack, onDraftUpdate, onCreateSlide }) {
  const [currentDraft, setCurrentDraft] = useState(draft);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const isApproved = currentDraft?.status === "approved";

  const approveDraft = () => {
    if (!currentDraft) return;
    const approvedDraft = {
      ...currentDraft,
      status: "approved",
      approvedAt: new Date().toISOString(),
    };
    saveSummaryDraft(approvedDraft);
    setCurrentDraft(approvedDraft);
    onDraftUpdate?.(approvedDraft);
  };
  const downloadReviewedPdf = async () => {
    if (!currentDraft?.payload) return;
    setIsDownloadingPdf(true);
    try {
      await downloadPresentationSummaryPdf(currentDraft.payload);
    } catch (error) {
      alert(`ดาวน์โหลด PDF ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!currentDraft) {
    return (
      <main className="min-h-screen bg-[#eef7ff] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-dashed border-[#b9dcf4] bg-white p-8 text-center">
          <p className="text-sm font-semibold text-[#003a70]">ไม่พบรายการสำหรับตรวจเอกสาร</p>
          <button
            type="button"
            className="mt-4 h-10 rounded-md border border-[#b9dcf4] bg-white px-4 text-sm font-semibold text-[#005fac]"
            onClick={onBack}
          >
            กลับหน้ารายการอนุมัติ
          </button>
        </div>
      </main>
    );
  }

  return (
    <SummaryPreviewPage
      debtor={currentDraft.debtor}
      reportData={currentDraft.reportData ?? currentDraft.payload?.__preview?.reportData ?? []}
      debtTemplate={currentDraft.payload?.__preview?.debtTemplate}
      onBack={onBack}
      onDownloadPdf={downloadReviewedPdf}
      isDownloadingPdf={isDownloadingPdf}
      backLabel="กลับหน้ารายการอนุมัติ"
      infoPanel={<div className="mb-5"><DebtorInfoCard debtor={currentDraft.debtor} /></div>}
      extraActions={
        <>
          {!isApproved && (
            <button
              type="button"
              className="h-10 rounded-md bg-[#005fac] px-4 text-sm font-semibold text-white transition hover:bg-[#004b93]"
              onClick={approveDraft}
            >
              อนุมัติเอกสาร
            </button>
          )}
          <button
            type="button"
            className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
              isApproved
                ? "bg-[#1a9b63] text-white hover:bg-[#137a4e]"
                : "cursor-not-allowed bg-slate-200 text-slate-500"
            }`}
            onClick={() => isApproved && onCreateSlide?.(currentDraft)}
            disabled={!isApproved}
            title={isApproved ? "สร้างสไลด์นำเสนอ" : "ต้องอนุมัติเอกสารก่อน"}
          >
            <Presentation size={16} />
            สร้างสไลด์นำเสนอ
          </button>
        </>
      }
    />
  );
}

function summaryFieldSpec(label, requestedType = "text") {
  const text = String(label || "").toLowerCase();
  if (requestedType === "plainText") return { type: "text", badge: "ข้อความ", helper: "กรอกเป็นตัวอักษรหรือรหัส" };
  if (requestedType === "file") return { type: "file", badge: "ไฟล์", helper: "เลือกไฟล์" };
  if (requestedType === "textarea") return { type: "textarea", badge: "ข้อความ", helper: "รองรับข้อความหลายบรรทัด" };
  if (requestedType === "percent" || /เปอร์เซ็น|%|อัตราดอกเบี้ย|recovery|yield|สัดส่วน/.test(text)) {
    return { type: "text", inputMode: "decimal", badge: "เปอร์เซ็นต์", helper: "กรอกเป็นตัวเลข เช่น 3.50", format: "percent", suffix: "%" };
  }
  if (requestedType === "date" || (!text.includes("%") && /วันที่|วันรับโอน|วันที่ฟ้อง|วันที่พิพากษา|วันที่ปิด|วันที่ปลด/.test(text))) {
    return { type: "date", badge: "วันที่", helper: "เลือกวันที่จากปฏิทิน" };
  }
  if (/เงิน|ยอด|รายได้|รายจ่าย|ค่าใช้จ่าย|ค่าเช่า|ค่าครองชีพ|ราคา|มูลค่า|ภาระหนี้|ต้นทุน|ดอกเบี้ย|รับชำระ|day\s*one|บาท|amount|principal|interest/.test(text)) {
    return { type: "text", inputMode: "decimal", badge: "จำนวนเงิน", helper: "กรอกตัวเลขจำนวนเงิน", format: "number" };
  }
  if (requestedType === "number" || /อายุ|จำนวนงวด|งวดที่|ระยะเวลา|จำนวนหลักประกัน|holding|ปี|เดือน/.test(text)) {
    if (/อายุ/.test(text)) {
      return { type: "number", inputMode: "numeric", step: "1", min: "0", badge: "ตัวเลข", helper: "กรอกเป็นตัวเลข" };
    }
    return { type: "text", inputMode: "decimal", badge: "ตัวเลข", helper: "กรอกเป็นตัวเลข", format: "number" };
  }
  if (requestedType === "integer") {
    return { type: "number", inputMode: "numeric", step: "1", min: "0", badge: "ตัวเลข", helper: "กรอกเป็นตัวเลข" };
  }
  return { type: "text", badge: "ข้อความ", helper: "กรอกเป็นตัวอักษรหรือรหัส" };
}

function formatNumericInputValue(value) {
  const text = String(value ?? "").replace(/[^\d.]/g, "");
  if (!text) return "";
  const hasTrailingDot = text.endsWith(".");
  const [integerPart, ...decimalParts] = text.split(".");
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");
  const formattedInteger = (normalizedInteger || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimalText = decimalParts.join("").slice(0, 2);
  if (decimalText) return `${formattedInteger}.${decimalText}`;
  return hasTrailingDot ? `${formattedInteger}.` : formattedInteger;
}

function formatSummaryInputDefault(value, spec) {
  if (spec.format === "number" || spec.format === "percent") return formatNumericInputValue(value);
  return value;
}

function handleSummaryFormattedInput(event, spec) {
  if (spec.format === "number" || spec.format === "percent") {
    event.currentTarget.value = formatNumericInputValue(event.currentTarget.value);
  }
}

let summaryFormValueSnapshot = {};

function Field({ label, summaryLabel = label, type = "text", placeholder = "กรอกข้อมูล", className = "", defaultValue, disabled = false }) {
  const spec = summaryFieldSpec(summaryLabel, type);
  const storedValue = summaryFormValueSnapshot[summaryLabel];
  const resolvedDefaultValue = defaultValue ?? (Array.isArray(storedValue) ? storedValue.join(", ") : storedValue ?? "");
  const inputDefaultValue = spec.type === "file" ? undefined : formatSummaryInputDefault(resolvedDefaultValue, spec);
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      {spec.type === "textarea" ? (
        <textarea
          data-summary-label={summaryLabel}
          data-summary-type={spec.badge}
          className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#005fac] focus:ring-2 focus:ring-[#9ed4f5]"
          placeholder={placeholder}
          defaultValue={inputDefaultValue}
          disabled={disabled}
        />
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <input
            data-summary-label={summaryLabel}
            data-summary-type={spec.badge}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#005fac] focus:ring-2 focus:ring-[#9ed4f5]"
            type={spec.type}
            inputMode={spec.inputMode}
            step={spec.step}
            min={spec.min}
            placeholder={placeholder}
            defaultValue={inputDefaultValue}
            disabled={disabled}
            onInput={(event) => handleSummaryFormattedInput(event, spec)}
          />
          {spec.suffix && <span className="shrink-0 text-sm font-semibold text-slate-600">{spec.suffix}</span>}
        </div>
      )}
    </label>
  );
}

function CheckGroup({ label, summaryLabel = label, options, single = false }) {
  const selectedValues = normalizeMultiValue(summaryFormValueSnapshot[summaryLabel]);
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {options.map((option) => (
          <label key={option} className="inline-flex items-center gap-2 rounded-md border border-[#d7eaf8] bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-[#005fac]"
              data-summary-label={summaryLabel}
              data-summary-single={single ? "true" : undefined}
              value={option}
              defaultChecked={selectedValues.includes(option)}
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm shadow-blue-100/60">
      <h3 className="text-base font-semibold text-[#003a70]">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ReadOnlyInfo({ label, value }) {
  return (
    <div className="rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

function EditableCell({ label, typeOverride, suffix = "", rowSpan = 1 }) {
  const spec = summaryFieldSpec(label, typeOverride);
  const storedValue = summaryFormValueSnapshot[label];
  const defaultValue = Array.isArray(storedValue) ? storedValue.join(", ") : storedValue ?? "";
  const displaySuffix = suffix || spec.suffix || "";
  return (
    <td rowSpan={rowSpan} className="border border-slate-400 p-1">
      <div className="flex items-center gap-1">
        <input
          aria-label={label}
          data-summary-label={label}
          data-summary-type={spec.badge}
          className="h-8 w-full min-w-20 bg-transparent px-1 text-xs outline-none focus:bg-white"
          type={spec.type}
          inputMode={spec.inputMode}
          step={spec.step}
          min={spec.min}
          title={`${label} (${spec.badge})`}
          defaultValue={formatSummaryInputDefault(defaultValue, spec)}
          onInput={(event) => handleSummaryFormattedInput(event, spec)}
        />
        {displaySuffix && <span className="text-xs text-slate-500">{displaySuffix}</span>}
      </div>
    </td>
  );
}

function SummaryInlineInput({ label, type = "text", className = "w-44" }) {
  const spec = summaryFieldSpec(label, type);
  const storedValue = summaryFormValueSnapshot[label];
  const defaultValue = Array.isArray(storedValue) ? storedValue.join(", ") : storedValue ?? "";
  return (
    <input
      data-summary-label={label}
      data-summary-type={spec.badge}
      className={`${className} border-0 border-b border-dotted border-slate-500 bg-transparent px-1 text-sm outline-none focus:border-[#005fac]`}
      type={spec.type}
      inputMode={spec.inputMode}
      step={spec.step}
      min={spec.min}
      defaultValue={formatSummaryInputDefault(defaultValue, spec)}
      onInput={(event) => handleSummaryFormattedInput(event, spec)}
    />
  );
}

function UploadBox({ title, description = "รองรับไฟล์เอกสารหรือรูปภาพประกอบ", files = [], progress = 0, isUploading = false, onChange }) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <div className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#9ed4f5] bg-[#f8fcff] px-4 py-6 text-center transition hover:bg-[#eef7ff]">
          <UploadCloud className="mb-2 text-[#005fac]" size={28} />
          <span className="text-sm font-semibold text-[#005fac]">เลือกไฟล์เพื่ออัปโหลด</span>
          <span className="mt-1 text-xs text-slate-500">{description}</span>
        </div>
        <input type="file" className="sr-only" multiple onChange={onChange} />
      </label>
      {(isUploading || files.length > 0) && (
        <div className="rounded-md border border-[#d7eaf8] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#003a70]">
              {isUploading ? "กำลังอัปโหลดไฟล์..." : `อัปโหลดแล้ว ${files.length} รายการ`}
            </p>
            {isUploading && <span className="text-xs font-medium text-slate-500">{progress}%</span>}
          </div>
          {isUploading && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e6f3fc]">
              <div className="h-full rounded-full bg-[#005fac] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
          {files.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-3 rounded-md bg-[#f8fcff] px-3 py-2">
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-green-700">อัปโหลดเสร็จแล้ว • {Math.max(1, Math.round(file.size / 1024))} KB</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DebtTemplateTable({ type }) {
  const titleMap = {
    first: "กรณีประนอมหนี้ครั้งแรก",
    previous: "กรณีเคยประนอมหนี้แล้ว",
    remaining: "กรณีประนอมหนี้ส่วนที่เหลือจากการขายทอดตลาด และหลักประกันขายทอดตลาดแล้วแต่ยังไม่ตัดชำระ",
  };
  const title = titleMap[type] ?? titleMap.previous;
  const textColumnIndexes = new Set([1, 2, 9, 11, 12]);
  const summaryTextColumnIndexes = new Set([9, 11, 12]);
  const noPercentSummaryColumns = new Set([9, 10, 11, 12]);
  const debtTemplateColumnWidths = ["95px", "145px", "92px", "96px", "96px", "96px", "92px", "110px", "240px", "120px", "170px", "180px"];
  const cellType = (columnIndex) => {
    if (columnIndex === 3) return "percent";
    return textColumnIndexes.has(columnIndex) ? "plainText" : "number";
  };
  const costRowSpan = type === "first" ? 5 : type === "remaining" ? 7 : 3;
  const firstSummaryColumns = [3, 4, 5, 6, 9, 10, 11, 12];
  const remainingSummaryColumns = [4, 5, 6, 9, 10, 11, 12];
  const summaryCellType = (label, columnIndex) => {
    if (summaryTextColumnIndexes.has(columnIndex)) return "plainText";
    return label.includes("%") && !noPercentSummaryColumns.has(columnIndex) ? "percent" : "number";
  };
  const summaryCellSuffix = (label, columnIndex) => (label.includes("%") && !noPercentSummaryColumns.has(columnIndex) ? "%" : "");
  const rowCells = (row) => (
    <>
      {[1, 2, 3, 4, 5, 6].map((column) => (
        <EditableCell key={column} label={`${title} แถว ${row} คอลัมน์ ${column}`} typeOverride={cellType(column)} />
      ))}
      {row === 1 && (
        <>
          <EditableCell label={`${title} แถว 1 คอลัมน์ 7`} typeOverride="number" rowSpan={costRowSpan} />
          <EditableCell label={`${title} แถว 1 คอลัมน์ 8`} typeOverride="number" rowSpan={costRowSpan} />
        </>
      )}
      {[9, 10, 11, 12].map((column) => (
        <EditableCell key={column} label={`${title} แถว ${row} คอลัมน์ ${column}`} typeOverride={cellType(column)} />
      ))}
    </>
  );

  return (
    <div className="overflow-x-auto">
      <p className="mb-3 text-sm font-semibold text-slate-900 underline">{title}</p>
      <table className="min-w-[1530px] border-collapse text-xs">
        <colgroup>
          {debtTemplateColumnWidths.map((width, index) => <col key={index} style={{ width }} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="border border-slate-400 bg-[#d9ecfb] text-[#003a70] px-2 py-2" rowSpan={2}>เลขบัญชี</th>
            <th className="border border-slate-400 bg-[#d9ecfb] text-[#003a70] px-2 py-2" rowSpan={2}>หนี้ตาม</th>
            <th className="border border-slate-400 bg-[#e6f3fc] text-[#003a70] px-2 py-2 text-red-600" rowSpan={2}>อัตราดอกเบี้ย</th>
            <th className="border border-slate-400 bg-[#e6f3fc] text-[#003a70] px-2 py-2" colSpan={3}>ภาระหนี้ ณ ...</th>
            <th className="border border-slate-400 bg-[#e6f3fc] text-[#003a70] px-2 py-2" colSpan={2}>ต้นทุน ณ ...</th>
            <th className="border border-slate-400 bg-[#e6f3fc] text-[#003a70] px-2 py-2" rowSpan={2}>หลักประกัน / ผู้ค้ำประกัน</th>
            <th className="border border-slate-400 bg-[#e6f3fc] text-[#003a70] px-2 py-2" rowSpan={2}>ราคาประเมิน BAM วันที่</th>
            <th className="border border-slate-400 bg-[#e6f3fc] text-[#003a70] px-2 py-2" rowSpan={2}>สถานะบังคับคดี</th>
            <th className="border border-slate-400 bg-[#e6f3fc] text-[#003a70] px-2 py-2" rowSpan={2}>หมายเหตุ</th>
          </tr>
          <tr className="bg-[#e6f3fc] text-[#003a70]">
            {["เงินต้น", "ดอกเบี้ย", "รวม", "Day One", "Day One + Yield"].map((heading) => (
              <th key={heading} className="border border-slate-400 px-2 py-2">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((row) => (
            <tr key={row}>
              {rowCells(row)}
            </tr>
          ))}
          {type === "first" && (
            <>
              <tr>
                <td className="border border-slate-400 px-2 py-2 text-center" colSpan={2}>ขออนุมัติครั้งนี้</td>
                {firstSummaryColumns.map((column, index) => (
                  <EditableCell key={column} label={`ขออนุมัติครั้งนี้ ${index + 1}`} typeOverride={summaryCellType("ขออนุมัติครั้งนี้", column)} />
                ))}
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-2 text-center" colSpan={2}>% การรับชำระ</td>
                {firstSummaryColumns.map((column, index) => (
                  <EditableCell key={column} label={`% การรับชำระ ${index + 1}`} typeOverride={summaryCellType("% การรับชำระ", column)} suffix={summaryCellSuffix("% การรับชำระ", column)} />
                ))}
              </tr>
            </>
          )}
          {type === "remaining" && ["ชำระหนี้จากการขายทอดตลาด", "ภาระหนี้คงเหลือ", "ขออนุมัติครั้งนี้", "% การรับชำระ"].map((label) => (
            <tr key={label}>
              <td className="border border-slate-400 bg-[#d9ecfb] px-2 py-2 text-center font-semibold text-[#003a70]" colSpan={3}>{label}</td>
              {remainingSummaryColumns.map((column, index) => (
                <EditableCell key={column} label={`${label} ${index + 1}`} typeOverride={summaryCellType(label, column)} suffix={summaryCellSuffix(label, column)} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BankruptcyTable() {
  const headings = ["ผู้เกี่ยวข้อง", "สถานะ", "โจทก์", "คดีแดงที่", "วันที่พิทักษ์ทรัพย์ฯ", "จำนวนที่ยื่นขอรับชำระหนี้", "วันที่พิพากษาล้มฯ", "วันที่ปลดล้มฯ", "วันที่ปิดคดี", "สวมสิทธิ์", "หมายเหตุ"];
  const columnWidths = ["210px", "170px", "150px", "130px", "118px", "170px", "118px", "118px", "118px", "125px", "190px"];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1620px] border-collapse text-xs">
        <colgroup>
          {columnWidths.map((width, index) => <col key={index} style={{ width }} />)}
        </colgroup>
        <thead>
          <tr className="bg-[#e6f3fc] text-[#003a70]">
            {headings.map((heading) => <th key={heading} className="border border-slate-400 px-2 py-2">{heading}</th>)}
          </tr>
        </thead>
        <tbody>
          {["ลูกหนี้", "ผู้ค้ำ/ผู้จำนอง", "ผู้ค้ำประกัน"].map((status, row) => (
            <tr key={status}>
              <EditableCell label={`คดีล้มละลาย ${status} ผู้เกี่ยวข้อง`} typeOverride="plainText" />
              <td className="border border-slate-400 px-2 py-2">{status}</td>
              {Array.from({ length: headings.length - 2 }).map((_, index) => {
                const heading = headings[index + 2];
                return <EditableCell key={index} label={`คดีล้มละลาย ${status} ${heading}`} typeOverride={heading === "จำนวนที่ยื่นขอรับชำระหนี้" ? "plainText" : undefined} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentSummaryTable() {
  const rows = [
    "1. ภาระหนี้ ณ วันปรับโครงสร้างหนี้",
    "2. ยอดประนอมหนี้",
    "3. ชำระตามผลการประนอมหนี้",
    "4. ภาระหนี้คงเหลือก่อนยกเลิกประนอมหนี้",
    "5. ภาระหนี้คงเหลือหลังยกเลิกประนอมหนี้คำนวณถึงปัจจุบัน",
    "6. ภาระหนี้ตามข้อ 4 คำนวณดอกเบี้ยถึงปัจจุบัน",
    "7. ข้อเสนอครั้งนี้",
  ];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[920px] border-collapse text-xs">
        <colgroup>
          <col style={{ width: "300px" }} />
          {Array.from({ length: 9 }).map((_, index) => <col key={index} style={{ width: "72px" }} />)}
        </colgroup>
        <thead>
          <tr className="bg-[#e6f3fc] text-[#003a70]">
            <th className="border border-slate-400 px-2 py-2" rowSpan={2}>รายการ</th>
            <th className="border border-slate-400 px-2 py-2" colSpan={4}>ภาระหนี้</th>
            <th className="border border-slate-400 px-2 py-2" rowSpan={2}>ค่าใช้จ่าย</th>
            <th className="border border-slate-400 px-2 py-2" colSpan={4}>ต้นทุน</th>
          </tr>
          <tr className="bg-[#e6f3fc] text-[#003a70]">
            {["เงินต้น", "ดอกเบี้ย", "ค่าใช้จ่าย", "รวม", "DayOne", "Yield", "ค่าใช้จ่าย", "รวม"].map((heading, index) => (
              <th key={`${heading}-${index}`} className="border border-slate-400 px-2 py-2">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td className="border border-slate-400 px-2 py-2 font-medium">{row}</td>
              {Array.from({ length: 9 }).map((_, index) => <EditableCell key={index} label={`${row} ${index + 1}`} typeOverride="number" />)}
            </tr>
          ))}
          <tr className="bg-[#e6f3fc] text-[#003a70] font-semibold">
            <td className="border border-slate-400 px-2 py-2 text-center">เพิ่มขึ้น (ลดลง) จากเดิม</td>
            {Array.from({ length: 9 }).map((_, index) => <EditableCell key={index} label={`เพิ่มขึ้นลดลง ${index + 1}`} typeOverride="number" />)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ApprovalHistoryTable() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#e6f3fc] text-[#003a70]">
            <th className="w-2/3 border border-slate-400 px-3 py-2 text-center text-base font-semibold">การอนุมัติที่ผ่านมา</th>
            <th className="w-1/3 border border-slate-400 px-3 py-2 text-center text-base font-semibold">ความคืบหน้า</th>
          </tr>
        </thead>
        <tbody>
          {[1].map((row) => (
            <tr key={row}>
              <td className="border border-slate-400 p-2 align-top">
                <textarea
                  className="min-h-16 w-full resize-y bg-transparent text-sm outline-none focus:bg-white"
                  data-summary-label={`การอนุมัติที่ผ่านมา ${row}`}
                />
              </td>
              <td className="border border-slate-400 p-2 align-top">
                <textarea
                  className="min-h-16 w-full resize-y bg-transparent text-sm outline-none focus:bg-white"
                  data-summary-label={`การอนุมัติที่ผ่านมา ความคืบหน้า ${row}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InstallmentScheduleTable({ rows, onAddRow, onUpdateRow, onRemoveRow, hideProposal = false }) {
  const fields = hideProposal ? ["period", "month", "amount"] : ["period", "month", "amount", "proposal"];
  const columnWidths = hideProposal ? ["130px", "260px", "150px", "92px"] : ["130px", "230px", "150px", "330px", "92px"];
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className={`${hideProposal ? "min-w-[640px]" : "min-w-[930px]"} border-collapse text-xs`}>
          <colgroup>
            {columnWidths.map((width, index) => <col key={index} style={{ width }} />)}
          </colgroup>
          <thead>
            <tr className="bg-[#e6f3fc] text-[#003a70]">
              <th className="border border-slate-400 px-2 py-2" colSpan={3}>เงื่อนไขเดิม</th>
              {!hideProposal && <th className="border border-slate-400 px-2 py-2" rowSpan={2}>ข้อเสนอครั้งนี้</th>}
              <th className="border border-slate-400 px-2 py-2" rowSpan={2}>จัดการ</th>
            </tr>
            <tr className="bg-[#e6f3fc] text-[#003a70]">
              <th className="border border-slate-400 px-2 py-2">งวดที่</th>
              <th className="border border-slate-400 px-2 py-2">เดือน</th>
              <th className="border border-slate-400 px-2 py-2">ค่างวดเดือนละ (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {rows.custom.map((row) => (
              <tr key={row.id}>
                {fields.map((field) => (
                  <td key={field} className="border border-slate-400 p-1">
                    <input
                      className="h-9 w-full bg-transparent px-2 text-xs outline-none focus:bg-white disabled:text-slate-700"
                      data-summary-label={`ตารางผ่อนชำระ ${row.id} ${field}`}
                      type="text"
                      inputMode={field === "amount" ? "decimal" : undefined}
                      value={row[field]}
                      onChange={(event) => onUpdateRow(row.id, field, field === "amount" ? formatNumericInputValue(event.target.value) : event.target.value)}
                    />
                  </td>
                ))}
                <td className="border border-slate-400 px-2 py-1 text-center">
                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                    onClick={() => onRemoveRow(row.id)}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="h-9 rounded-md border border-[#b9dcf4] bg-white px-3 text-xs font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
        onClick={onAddRow}
      >
        + เพิ่มแถวในตาราง
      </button>
    </div>
  );
}

function PersonInfoTable({ title, role, people, onAddRow, onRemoveRow }) {
  const valueFor = (label) => {
    const value = summaryFormValueSnapshot[label];
    return Array.isArray(value) ? value.join(", ") : value ?? "";
  };
  const rolePeople = people.filter((person) => person.role === role);
  const columns = [
    ["ชื่อ", "ชื่อ", "text"],
    ["อายุ", "อายุ", "number"],
    ["ที่อยู่", "ที่อยู่", "text"],
    ["รายได้", "รายได้ / เดือน", "number"],
    ["รายจ่าย", "รายจ่าย / เดือน", "number"],
    ["หมายเหตุ", "หมายเหตุ", "text"],
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#003a70]">{title}</p>
        <button
          type="button"
          className="h-9 rounded-md border border-[#b9dcf4] bg-white px-3 text-xs font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
          onClick={() => onAddRow(role)}
        >
          + เพิ่มแถว
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] border-collapse text-xs">
          <colgroup>
            <col style={{ width: "170px" }} />
            <col style={{ width: "70px" }} />
            <col style={{ width: "280px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "190px" }} />
            <col style={{ width: "70px" }} />
          </colgroup>
          <thead>
            <tr className="bg-[#e6f3fc] text-[#003a70]">
              {columns.map(([heading]) => (
                <th key={heading} className="border border-slate-400 px-2 py-2">{heading}</th>
              ))}
              <th className="border border-slate-400 px-2 py-2">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rolePeople.map((person) => (
              <tr key={person.id}>
                <td className="hidden">
                  <input type="hidden" data-summary-label={`1.3 ${person.id} ประเภท`} defaultValue={role} />
                </td>
                {columns.map(([, field, inputType]) => {
                  const label = `1.3 ${person.id} ${field}`;
                  const spec = summaryFieldSpec(label, inputType);
                  return (
                    <td key={field} className="border border-slate-400 p-1">
                      <input
                        className="h-9 w-full min-w-28 bg-transparent px-2 text-xs outline-none focus:bg-white"
                        data-summary-label={label}
                        data-summary-type={spec.badge}
                        type={spec.type}
                        inputMode={spec.inputMode}
                        step={spec.step}
                        min={spec.min}
                        defaultValue={formatSummaryInputDefault(valueFor(label), spec)}
                        onInput={(event) => handleSummaryFormattedInput(event, spec)}
                      />
                    </td>
                  );
                })}
                <td className="border border-slate-400 px-2 py-1 text-center">
                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => onRemoveRow(person.id)}
                    disabled={rolePeople.length <= 1}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OpinionPaymentTable() {
  const headings = ["ชำระแล้ว", "ชำระครั้งนี้", "รวมรับชำระ", "% เงินต้น ณ วันรับโอน", "% ราคาประเมิน", "% Day one ณ วันรับโอน", "% ส่วนเกินทุน"];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] border-collapse text-xs">
        <thead>
          <tr className="bg-[#e6f3fc] text-[#003a70]">
            {headings.map((heading) => (
              <th key={heading} className="border border-slate-400 px-2 py-2">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1].map((row) => (
            <tr key={row}>
              {headings.map((heading) => {
                const isPercent = heading.includes("%");
                return <EditableCell key={heading} label={`3.1 ${heading} แถว ${row}`} typeOverride={isPercent ? "percent" : "number"} suffix={isPercent ? "%" : ""} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DebtManagementSummary({ number = "3.3", editable = false, reportData = [] }) {
  const [isEditing, setIsEditing] = useState(false);
  const summaryKey = "3.3 สรุปภาพรวมการบริหารหนี้";
  const receiveRows = [
    { id: "paid", label: "เงินที่ชำระมาแล้ว", value: "2,000" },
    { id: "auctionPaid", label: "รับชำระแล้วจากการขายทอดตลาด", value: "350" },
    { id: "collateralEstimate", label: "ประมาณการจากการขายทรัพย์หลักประกัน (80% ของราคาประเมิน BAM)", value: "1,250" },
    { id: "thirdParty", label: "บุคคลภายนอกซื้อได้จากการขายทอดตลาด", value: "780" },
    { id: "npaEstimate", label: "ประมาณการจากการขายทรัพย์ NPA", value: "420" },
    { id: "currentOffer", label: "ข้อเสนอครั้งนี้", value: "3,900" },
  ];
  const deductRows = [
    { id: "dayOne", label: "Day one ณ วันรับโอน", value: "1,800" },
    { id: "systemExpense", label: "ค่าใช้จ่ายในระบบ", value: "120" },
    { id: "futureExpense", label: "ค่าใช้จ่ายในอนาคต", value: "80" },
    { id: "commonFee", label: "ค่าส่วนกลางค้างชำระ", value: "35" },
    { id: "nplTransfer", label: "ค่าใช้จ่ายในการโอน NPL", value: "45" },
    { id: "npaTransfer", label: "ค่าใช้จ่ายในการโอน NPA", value: "60" },
    { id: "assetFee", label: "ค่าธรรมเนียมการซื้อทรัพย์", value: "110" },
  ];
  const summaryRow = { id: "surplus", label: "ส่วนเกินทุน", value: "1,650" };
  const valueFor = (label, fallback = "") => {
    const storedValue = summaryFormValueSnapshot[label];
    const fromReport = findReportExactValue(reportData, label, "");
    const storedText = Array.isArray(storedValue) ? storedValue.join(", ") : storedValue;
    const resolved = fromReport || storedText || fallback;
    return resolved ?? "";
  };
  const fieldName = (group, row, field) => `${summaryKey} ${group} ${row.id} ${field}`;
  const unitLabel = `${summaryKey} หน่วย`;
  const unitValue = valueFor(unitLabel, "ล้านบาท");
  const renderText = (group, row) => {
    const label = fieldName(group, row, "รายการ");
    if (!editable) return valueFor(label, row.label);
    return (
      <input
        data-summary-label={label}
        className="h-9 w-full bg-transparent px-2 text-sm outline-none focus:bg-white disabled:text-slate-800"
        defaultValue={valueFor(label, row.label)}
        disabled={!isEditing}
      />
    );
  };
  const renderAmount = (group, row) => {
    const label = fieldName(group, row, "จำนวนเงิน");
    if (!editable) return valueFor(label, row.value);
    const spec = summaryFieldSpec(label, "number");
    return (
      <input
        data-summary-label={label}
        data-summary-type={spec.badge}
        className="h-9 w-full bg-transparent px-2 text-right text-sm tabular-nums outline-none focus:bg-white disabled:text-slate-800"
        type={spec.type}
        inputMode={spec.inputMode}
        defaultValue={formatSummaryInputDefault(valueFor(label, row.value), spec)}
        disabled={!isEditing}
        onInput={(event) => handleSummaryFormattedInput(event, spec)}
      />
    );
  };
  const renderRows = (group, rows) => rows.map((row) => (
    <tr key={row.id}>
      <td className="border-b border-[#d7eaf8] px-2 py-1.5">- {renderText(group, row)}</td>
      <td className="border-b border-[#d7eaf8] px-2 py-1.5 text-right tabular-nums">{renderAmount(group, row)}</td>
    </tr>
  ));

  return (
    <div className="debt-management-summary rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[#003a70] underline">{number} สรุปภาพรวมการบริหารหนี้</h4>
        <div className="flex items-center gap-2">
          {editable ? (
            <label className="flex items-center gap-1 rounded-md border border-[#d7eaf8] bg-white px-2 py-1 text-xs text-slate-500">
              <span>หน่วย :</span>
              <input
                data-summary-label={unitLabel}
                className="w-24 bg-transparent font-semibold text-slate-700 outline-none disabled:text-slate-700"
                defaultValue={unitValue}
                disabled={!isEditing}
                placeholder="ล้านบาท"
              />
            </label>
          ) : (
            <span className="text-xs text-slate-500">(หน่วย : {unitValue})</span>
          )}
          {editable && (
            <button
              type="button"
              className={`h-9 rounded-md px-3 text-xs font-semibold ${isEditing ? "bg-[#1a9b63] text-white" : "border border-[#b9dcf4] bg-white text-[#005fac]"}`}
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? "บันทึก" : "แก้ไข"}
            </button>
          )}
        </div>
      </div>
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: "78%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>
        <tbody>
          <tr><td className="px-2 py-1 font-semibold text-slate-900" colSpan={2}>รับ</td></tr>
          {renderRows("รับ", receiveRows)}
          <tr><td className="px-2 py-2 font-semibold text-slate-900" colSpan={2}>หัก</td></tr>
          {renderRows("หัก", deductRows)}
          <tr className="font-semibold">
            <td className="px-2 py-2">{editable ? renderText("สรุป", summaryRow) : valueFor(fieldName("สรุป", summaryRow, "รายการ"), summaryRow.label)}</td>
            <td className="px-2 py-2 text-right tabular-nums">{editable ? renderAmount("สรุป", summaryRow) : valueFor(fieldName("สรุป", summaryRow, "จำนวนเงิน"), summaryRow.value)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function findReportValue(reportData, includes, fallback = "-") {
  const item = reportData.find((entry) => includes.every((text) => entry.label.includes(text)) && entry.value);
  return item?.value || fallback;
}

function findReportExactValue(reportData, label, fallback = "") {
  const item = reportData.find((entry) => entry.label === label && entry.value);
  return item?.value || fallback;
}

function findReportValues(reportData, includes) {
  return reportData
    .filter((entry) => includes.every((text) => entry.label.includes(text)) && entry.value)
    .map((entry) => entry.value);
}

function installmentRowsFromReportData(reportData) {
  const grouped = new Map();
  reportData.forEach((entry) => {
    const match = entry.label.match(/^ตารางผ่อนชำระ\s+(.+)\s+(period|month|amount|proposal)$/);
    if (!match) return;
    const [, id, field] = match;
    const current = grouped.get(id) ?? { period: "", month: "", amount: "", proposal: "" };
    current[field] = entry.value ?? "";
    grouped.set(id, current);
  });

  const rows = Array.from(grouped.values()).filter((row) => row.period || row.month || row.amount || row.proposal);
  return rows.length ? rows : [{ period: "", month: "", amount: "", proposal: "" }];
}

function loanContractsFromReportData(reportData) {
  const grouped = new Map();
  reportData.forEach((entry) => {
    const match = entry.label.match(/^(สัญญากู้|วันที่สัญญากู้)\s+(\d+)$/);
    if (!match) return;
    const [, field, index] = match;
    const current = grouped.get(index) ?? { contract: "", date: "" };
    if (field === "สัญญากู้") current.contract = entry.value ?? "";
    if (field === "วันที่สัญญากู้") current.date = entry.value ?? "";
    grouped.set(index, current);
  });
  const rows = Array.from(grouped.values()).filter((row) => row.contract || row.date);
  return rows.length ? rows : [{ contract: findReportValue(reportData, ["สัญญากู้"], ""), date: findReportValue(reportData, ["วันที่สัญญากู้"], "") }];
}

function factPeopleFromReportData(reportData) {
  const grouped = new Map();
  reportData.forEach((entry) => {
    const match = entry.label.match(/^1\.3\s+(.+?)\s+(ประเภท|ชื่อ|อายุ|ที่อยู่|รายได้ \/ เดือน|รายจ่าย \/ เดือน|หมายเหตุ)$/);
    if (!match) return;
    const [, id, field] = match;
    const current = grouped.get(id) ?? { id, type: "", name: "", age: "", address: "", income: "", expense: "", note: "" };
    const map = {
      ประเภท: "type",
      ชื่อ: "name",
      อายุ: "age",
      ที่อยู่: "address",
      "รายได้ / เดือน": "income",
      "รายจ่าย / เดือน": "expense",
      หมายเหตุ: "note",
    };
    current[map[field]] = entry.value ?? "";
    grouped.set(id, current);
  });
  return Array.from(grouped.values())
    .map((person) => ({
      ...person,
      type: person.type || (String(person.id).includes("guarantor") ? "ผู้ค้ำ" : "ลูกหนี้"),
    }))
    .filter((person) => ["name", "age", "address", "income", "expense", "note"].some((key) => person[key]));
}

function opinionPaymentRowFromReportData(reportData) {
  const columns = ["ชำระแล้ว", "ชำระครั้งนี้", "รวมรับชำระ", "% เงินต้น ณ วันรับโอน", "% ราคาประเมิน", "% Day one ณ วันรับโอน", "% ส่วนเกินทุน"];
  return {
    columns,
    row: Object.fromEntries(columns.map((column) => [column, findReportExactValue(reportData, `3.1 ${column} แถว 1`, "")])),
  };
}

function extraSectionsFromReportData(reportData, prefix) {
  const grouped = new Map();
  reportData.forEach((entry) => {
    const match = entry.label.match(/^(\d+\.\d+)\s+(ชื่อหัวข้อ|รายละเอียด)$/);
    if (!match || !match[1].startsWith(`${prefix}.`)) return;
    const [, number, field] = match;
    const current = grouped.get(number) ?? { number, title: "", detail: "" };
    if (field === "ชื่อหัวข้อ") current.title = entry.value ?? "";
    if (field === "รายละเอียด") current.detail = entry.value ?? "";
    grouped.set(number, current);
  });
  return Array.from(grouped.values())
    .filter((section) => String(section.title || section.detail).trim())
    .sort((a, b) => Number(a.number.split(".")[1]) - Number(b.number.split(".")[1]));
}

function opinionBoxesFromReportData(reportData) {
  return extraSectionsFromReportData(reportData, 3);
}

function normalizeMultiValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function valueOf(values, label, fallback = "") {
  const value = values[label];
  if (Array.isArray(value)) return value.join(", ");
  return value ?? fallback;
}

function numberOf(values, label, fallback = "") {
  const value = valueOf(values, label, "");
  if (value === "") return fallback;
  const numeric = Number(String(value).replace(/[,%]/g, ""));
  return Number.isFinite(numeric) ? numeric : value;
}

function reportEntriesFromValues(values) {
  return Object.entries(values).map(([label, value]) => ({
    label,
    value: Array.isArray(value) ? value.join(", ") : value,
  }));
}

function collectVisibleSummaryValues(existingValues = {}) {
  const grouped = new Map(Object.entries(existingValues));

  document.querySelectorAll("[data-summary-label]").forEach((element) => {
    const label = element.dataset.summaryLabel;
    if (!label) return;

    if (element.type === "checkbox") {
      const current = normalizeMultiValue(grouped.get(label));
      const next = new Set(current);
      if (element.checked) next.add(element.value);
      else next.delete(element.value);
      grouped.set(label, Array.from(next));
      return;
    }

    if (element.type === "file") {
      const fileNames = Array.from(element.files ?? []).map((file) => file.name);
      if (fileNames.length) grouped.set(label, fileNames.join(", "));
      return;
    }

    grouped.set(label, element.value || "");
  });

  return Object.fromEntries(grouped);
}

function extractDebtRows(values, debtTemplate) {
  const titleMap = {
    first: "กรณีประนอมหนี้ครั้งแรก",
    previous: "กรณีเคยประนอมหนี้แล้ว",
    remaining: "กรณีประนอมหนี้ส่วนที่เหลือจากการขายทอดตลาด และหลักประกันขายทอดตลาดแล้วแต่ยังไม่ตัดชำระ",
  };
  const title = titleMap[debtTemplate] ?? titleMap.previous;
  const keys = [
    "accountNo",
    "debtBasis",
    "interestRate",
    "principal",
    "interest",
    "totalDebt",
    "dayOne",
    "dayOneYield",
    "collateral",
    "bamAppraisal",
    "enforcementStatus",
    "note",
  ];

  return [1, 2, 3]
    .map((rowNo) => {
      const row = {};
      keys.forEach((key, index) => {
        row[key] = valueOf(values, `${title} แถว ${rowNo} คอลัมน์ ${index + 1}`, "");
      });
      return row;
    })
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
}

function paymentLine(values, label) {
  const keys = ["principal", "interest", "fee", "total", "expense", "dayOne", "yield", "costFee", "costTotal"];
  return keys.reduce((line, key, index) => {
    line[key] = numberOf(values, `${label} ${index + 1}`, "");
    return line;
  }, {});
}

function buildPresentationSummaryPayload({ debtor, values, debtTemplate, caseSelections, installmentRows }) {
  const purposeFor = normalizeMultiValue(values["จุดประสงค์เพื่อ"]);
  const recipients = normalizeMultiValue(values["เรียน"]);
  const rightSubrogationStatus = valueOf(values, "สถานะการสวมสิทธิ");
  const preferentialStatuses = normalizeMultiValue(values["สถานะคดีบุริมสิทธิ"]);
  const bankruptcyResults = normalizeMultiValue(values["ผลตรวจสอบคดีล้มละลาย"]);
  const debtTemplateName = {
    first: "ประนอมหนี้ครั้งแรก",
    previous: "เคยประนอมหนี้แล้ว",
    remaining: "ประนอมหนี้ส่วนที่เหลือจากการขายทอด แต่หลักประกันยังไม่ตัดชำระ",
  }[debtTemplate || "previous"];
  const paymentRows = {
    restructureDebt: "1. ภาระหนี้ ณ วันปรับโครงสร้างหนี้",
    compromiseAmount: "2. ยอดประนอมหนี้",
    paidAmount: "3. ชำระตามผลการประนอมหนี้",
    beforeCancel: "4. ภาระหนี้คงเหลือก่อนยกเลิกประนอมหนี้",
    afterCancelToPresent: "5. ภาระหนี้คงเหลือหลังยกเลิกประนอมหนี้คำนวณถึงปัจจุบัน",
    clause4InterestToPresent: "6. ภาระหนี้ตามข้อ 4 คำนวณดอกเบี้ยถึงปัจจุบัน",
    currentOffer: "7. ข้อเสนอครั้งนี้",
  };
  const firstInstallment = installmentRows.custom.find((row) => row.period || row.month || row.amount || row.proposal) ?? {};
  const receiveAmount = numberOf(values, "3.1 รวมรับชำระ แถว 1", "");
  const principalAmount = numberOf(values, "3.1 % เงินต้น ณ วันรับโอน แถว 1", "");

  return {
    debtorName: debtor?.debtorName ?? "",
    portfolio: debtor?.portfolio ?? "",
    clientCode: debtor?.customerId ?? "",
    transferDate: transferDateIso,
    department: debtor?.department ?? "",
    team: debtor?.team ?? "",
    purposeFor,
    recipients,
    otherRecipientText: valueOf(values, "เรียน อื่นๆ"),
    objective: valueOf(values, "วัตถุประสงค์"),

    case: {
      noCase: caseSelections.noCase || normalizeMultiValue(values["ความคืบหน้าในการดำเนินคดี"]).includes("ยังไม่มีการดำเนินคดี"),
      loanContractNo: valueOf(values, "สัญญากู้"),
      loanContractDate: valueOf(values, "วันที่สัญญากู้"),
      civil: caseSelections.civil,
      civilBlackNo: valueOf(values, "คดีแพ่ง คดีหมายเลขดำที่"),
      filingDate: valueOf(values, "วันที่ฟ้อง"),
      civilRedNo: valueOf(values, "คดีแพ่ง คดีหมายเลขแดงที่"),
      judgmentDate: valueOf(values, "วันที่พิพากษา"),
      rightSubrogationStatus,
      preferential: caseSelections.preferential,
      preferentialRedNo: valueOf(values, "คดีบุริมสิทธิ คดีหมายเลขแดงที่"),
      plaintiff: valueOf(values, "โจทก์"),
      preferentialStatus: preferentialStatuses.join(", "),
      preferentialOrderStatus: preferentialStatuses.join(", "),
      bankruptcy: caseSelections.bankruptcy,
      bankruptcyCheckDate: "",
      bankruptcyFound: bankruptcyResults.includes("พบ"),
      bankruptcyDetail: "",
    },

    debtorInfo: {
      debtorAge: valueOf(values, "อายุลูกหนี้"),
      debtorOccupation: valueOf(values, "อาชีพลูกหนี้"),
      debtorIncome: numberOf(values, "รายได้ลูกหนี้ / เดือน"),
      debtorExpense: numberOf(values, "รายจ่ายลูกหนี้ / เดือน"),
      guarantorAge: valueOf(values, "อายุผู้ค้ำ"),
      guarantorOccupation: valueOf(values, "อาชีพผู้ค้ำ"),
      guarantorIncome: numberOf(values, "รายได้ผู้ค้ำ / เดือน"),
      guarantorExpense: numberOf(values, "รายจ่ายผู้ค้ำ / เดือน"),
      negotiation: valueOf(values, "การเจรจา"),
    },

    debtTemplate: debtTemplateName,
    debtRows: extractDebtRows(values, debtTemplate || "previous"),
    approvalHistory: [
      {
        approval: valueOf(values, "การอนุมัติที่ผ่านมา 1"),
        progress: valueOf(values, "การอนุมัติที่ผ่านมา ความคืบหน้า 1"),
      },
    ].filter((row) => row.approval || row.progress),
    paymentSummary: Object.fromEntries(
      Object.entries(paymentRows).map(([key, label]) => [key, paymentLine(values, label)]),
    ),

    assetSearch: {
      status: valueOf(values, "1.5 ผลการสืบทรัพย์"),
      otherAssetCount: valueOf(values, "1.5 ข้อมูลทรัพย์สินอื่น"),
      otherAssetAppraisal: numberOf(values, "1.5 ราคาประเมินรวม"),
      note: valueOf(values, "1.5 สาเหตุอื่นๆ"),
    },
    otherDebtCheck: {
      date: valueOf(values, "1.6 ตามแบบยืนยันภาระหนี้เกณฑ์สิทธิ์ ลว."),
      status: valueOf(values, "1.6 ผลตรวจสอบภาระหนี้อื่น"),
      accountCount: valueOf(values, "1.6 พบรวมกี่บัญชี"),
    },
    amloAndSigning: {
      status: valueOf(values, "1.7 สถานะการดำเนินการตามกฎหมาย ปปง."),
      note: valueOf(values, "1.7 เหตุผลประกอบการพิจารณา"),
    },
    futureExpense: {
      total: numberOf(values, "1.8 ค่าใช้จ่ายทั้งหมด"),
      system: numberOf(values, "1.8 แบ่งเป็นค่าใช้จ่ายในระบบ"),
      future: numberOf(values, "1.8 ค่าใช้จ่ายในอนาคตรวม"),
    },
    proposal: {
      amount: receiveAmount || firstInstallment.amount || "",
      principal: principalAmount || "",
      oldInterest: "",
      withinMonth: firstInstallment.month || "",
      interestRate: "",
      interestStartDate: "",
      installments: installmentRows.custom
        .filter((row) => row.period || row.month || row.amount || row.proposal)
        .map((row) => ({
          period: row.period,
          duration: row.month,
          amount: row.amount,
          proposal: row.proposal,
        })),
      condition221: valueOf(values, "2.1 ประเด็นปัญหา / สิ่งที่ให้พิจารณา"),
      condition222: "",
      condition223: "",
      exemptionText: "",
      enforcementEndDate: "",
    },
    presenterOpinion: {
      opinion: valueOf(values, "ความเห็นผู้นำเสนอ"),
      reason: valueOf(values, "เหตุผลเพิ่มเติม"),
    },
    managementOverview: {
      unit: valueOf(values, "3.3 สรุปภาพรวมการบริหารหนี้ หน่วย", "ล้านบาท"),
      paid: 2000,
      auctionReceived: 350,
      collateralEstimate: 1250,
      thirdPartyAuction: 780,
      npaEstimate: 420,
      currentOffer: receiveAmount || "",
      currentOfferPercent: valueOf(values, "3.1 % ส่วนเกินทุน แถว 1"),
      dayOne: 1800,
      systemExpense: 120,
      futureExpense: 80,
      commonFee: 35,
      nplTransferExpense: 45,
      npaTransferExpense: 60,
      purchaseFee: 110,
      purchaseFeePercent: "",
      surplus: 1650,
      surplusPercentText: "คิดเป็น % ของต้นทุนรับโอนรวมค่าใช้จ่าย",
    },
    signers: {
      presenterPosition: "เจ้าหน้าที่ผู้นำเสนอ",
      managerGroup: "ผู้จัดการกลุ่มพัฒนาสินทรัพย์ ....",
      directorDepartment: "ผู้อำนวยการฝ่ายพัฒนาสินทรัพย์",
    },
  };
}

function DocumentRow({ label, value }) {
  return (
    <div className="grid grid-cols-[220px_1fr] gap-3 border-b border-dotted border-slate-300 py-1.5 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="whitespace-pre-wrap text-slate-950">{value || "-"}</span>
    </div>
  );
}

function PrintTable({ columns, rows }) {
  const isLegacyDebtTemplatePreview = columns.length === 7
    && columns.includes("เลขบัญชี")
    && columns.includes("หนี้ตาม")
    && columns.includes("ภาระหนี้")
    && columns.includes("ต้นทุน");
  if (isLegacyDebtTemplatePreview) return null;

  return (
    <div className="overflow-x-auto">
      <table className="document-compact-table w-full border-collapse">
        <thead>
          <tr className="bg-[#e6f3fc] text-[#003a70]">
            {columns.map((column) => (
              <th key={column} className="border border-slate-500 px-2 py-2 text-center">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column} className="border border-slate-400 px-2 py-2 align-top">{row[column] || "\u00A0"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentInstallmentScheduleTable({ rows, hideProposal = false }) {
  const displayRows = rows.length ? rows : [{ period: "", month: "", amount: "", proposal: "" }];
  return (
    <div className="overflow-hidden">
      <table className="document-compact-table w-full table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: hideProposal ? "52%" : "32%" }} />
          <col style={{ width: "20%" }} />
          {!hideProposal && <col style={{ width: "30%" }} />}
        </colgroup>
        <thead>
          <tr>
            <th className="border border-black px-1 py-1 text-center font-semibold" colSpan={3}>เงื่อนไขเดิม</th>
            {!hideProposal && <th className="border border-black px-1 py-1 text-center font-semibold" rowSpan={2}>ข้อเสนอครั้งนี้</th>}
          </tr>
          <tr>
            <th className="border border-black px-1 py-1 text-center font-semibold">งวดที่</th>
            <th className="border border-black px-1 py-1 text-center font-semibold">เดือน</th>
            <th className="border border-black px-1 py-1 text-center font-semibold">ค่างวดเดือนละ (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => (
            <tr key={index}>
              <td className="border border-black px-1 py-1 align-top">{row.period || "\u00A0"}</td>
              <td className="border border-black px-1 py-1 align-top">{row.month || "\u00A0"}</td>
              <td className="border border-black px-1 py-1 align-top text-right tabular-nums">{row.amount || "\u00A0"}</td>
              {!hideProposal && <td className="border border-black px-1 py-1 align-top">{row.proposal || "\u00A0"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentPaymentSummaryTable({ reportData }) {
  const rows = [
    "1. ภาระหนี้ ณ วันปรับโครงสร้างหนี้",
    "2. ยอดประนอมหนี้",
    "3. ชำระตามผลการประนอมหนี้",
    "4. ภาระหนี้คงเหลือก่อนยกเลิกประนอมหนี้",
    "5. ภาระหนี้คงเหลือหลังยกเลิกประนอมหนี้คำนวณถึงปัจจุบัน",
    "6. ภาระหนี้ตามข้อ 4 คำนวณดอกเบี้ยถึงปัจจุบัน",
    "7. ข้อเสนอครั้งนี้",
  ];
  const valueAt = (label, index) => findReportExactValue(reportData, `${label} ${index}`, "");

  return (
    <div className="overflow-hidden">
      <p className="mb-1 font-semibold underline">สรุปผลการชำระหนี้</p>
      <table className="document-compact-table w-full table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "32%" }} />
          {Array.from({ length: 8 }).map((_, index) => <col key={index} style={{ width: "7.5%" }} />)}
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="border border-black px-1 py-1 text-center font-semibold" rowSpan={2}>รายการ</th>
            <th className="border border-black px-1 py-1 text-center font-semibold" colSpan={4}>ภาระหนี้</th>
            <th className="border border-black px-1 py-1 text-center font-semibold" rowSpan={2}>ค่าใช้จ่าย</th>
            <th className="border border-black px-1 py-1 text-center font-semibold" colSpan={4}>ต้นทุน</th>
          </tr>
          <tr>
            {["เงินต้น", "ดอกเบี้ย", "ค่าใช้จ่าย", "รวม", "DayOne", "Yield", "ค่าใช้จ่าย", "รวม"].map((heading, index) => (
              <th key={`${heading}-${index}`} className="border border-black px-1 py-1 text-center font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td className="border border-black px-1 py-1 align-top font-medium">{row}</td>
              {Array.from({ length: 9 }).map((_, index) => (
                <td key={index} className="border border-black px-1 py-1 align-top text-right tabular-nums">{valueAt(row, index + 1) || "\u00A0"}</td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="border border-black px-1 py-1 text-center font-semibold">เพิ่มขึ้น (ลดลง) จากเดิม</td>
            {Array.from({ length: 9 }).map((_, index) => (
              <td key={index} className="border border-black px-1 py-1 align-top text-right tabular-nums">{findReportExactValue(reportData, `เพิ่มขึ้นลดลง ${index + 1}`, "") || "\u00A0"}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DocumentSectionTitle({ children }) {
  return <h3 className="document-section-title text-xs underline">{children}</h3>;
}

function CaseProgressPreview({ reportData }) {
  const selectedCases = findReportValue(reportData, ["ความคืบหน้าในการดำเนินคดี"], "");
  const caseOptions = checkboxText(["ยังไม่มีการดำเนินคดี", "คดีแพ่ง", "คดีบุริมสิทธิ", "คดีล้มละลาย"], selectedCases);
  const bankruptcyRows = ["ลูกหนี้", "ผู้ค้ำ/ผู้จำนอง", "ผู้ค้ำประกัน"].map((status) => ({
    ผู้เกี่ยวข้อง: findReportValue(reportData, ["คดีล้มละลาย", status, "ผู้เกี่ยวข้อง"], status),
    โจทก์: findReportValue(reportData, ["คดีล้มละลาย", status, "โจทก์"], ""),
    คดีแดงที่: findReportValue(reportData, ["คดีล้มละลาย", status, "คดีแดงที่"], ""),
    วันที่พิทักษ์ทรัพย์: findReportValue(reportData, ["คดีล้มละลาย", status, "วันที่พิทักษ์ทรัพย์ฯ"], ""),
    จำนวนที่ยื่นขอรับชำระหนี้: findReportValue(reportData, ["คดีล้มละลาย", status, "จำนวนที่ยื่นขอรับชำระหนี้"], ""),
    สวมสิทธิ์: findReportValue(reportData, ["คดีล้มละลาย", status, "สวมสิทธิ์"], ""),
    หมายเหตุ: findReportValue(reportData, ["คดีล้มละลาย", status, "หมายเหตุ"], ""),
  }));
  const hasBankruptcyTable = bankruptcyRows.some((row) => Object.values(row).some((value, index) => index > 0 && value && value !== "-"));

  return (
    <div className="space-y-2 text-[11px]">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {caseOptions.map((option) => <span key={option}>{option}</span>)}
      </div>
      {selectedCases.includes("ยังไม่มีการดำเนินคดี") && (
        <p>สัญญากู้ <span className="document-inline-value">{findReportValue(reportData, ["สัญญากู้"], "................")}</span> วันที่ <span className="document-inline-value">{findReportValue(reportData, ["วันที่สัญญากู้"], "................")}</span></p>
      )}
      {selectedCases.includes("คดีแพ่ง") && (
        <div className="space-y-1">
          <p>คดีหมายเลขดำที่ <span className="document-inline-value">{findReportValue(reportData, ["คดีแพ่ง คดีหมายเลขดำที่"], "................")}</span> วันที่ฟ้อง <span className="document-inline-value">{findReportValue(reportData, ["วันที่ฟ้อง"], "................")}</span></p>
          <p>คดีหมายเลขแดงที่ <span className="document-inline-value">{findReportValue(reportData, ["คดีแพ่ง คดีหมายเลขแดงที่"], "................")}</span> วันที่พิพากษา <span className="document-inline-value">{findReportValue(reportData, ["วันที่พิพากษา"], "................")}</span></p>
          <p>{checkboxText(["ศาลอนุญาตให้สวมสิทธิแล้ว", "ศาลยังไม่อนุญาตให้สวมสิทธิ"], findReportValue(reportData, ["สถานะการสวมสิทธิ"], "")).join("   ")}</p>
        </div>
      )}
      {selectedCases.includes("คดีบุริมสิทธิ") && (
        <div className="space-y-1">
          <p>คดีหมายเลขแดงที่ <span className="document-inline-value">{findReportValue(reportData, ["คดีบุริมสิทธิ คดีหมายเลขแดงที่"], "................")}</span> โจทก์ <span className="document-inline-value">{findReportValue(reportData, ["โจทก์"], "................")}</span></p>
          <p>{checkboxText(["ยังไม่ยื่นบุริมสิทธิ", "ยื่นบุริมสิทธิแล้ว", "ศาลมีคำสั่งให้ได้รับชำระหนี้บุริมสิทธิแล้ว", "ยังไม่มีคำสั่งให้ได้รับชำระหนี้บุริมสิทธิ"], findReportValue(reportData, ["สถานะคดีบุริมสิทธิ"], "")).join("   ")}</p>
        </div>
      )}
      {selectedCases.includes("คดีล้มละลาย") && (
        <div className="space-y-2">
          <p>{checkboxText(["พบ", "ไม่พบ"], findReportValue(reportData, ["ผลตรวจสอบคดีล้มละลาย"], "")).join("   ")}</p>
          {hasBankruptcyTable && (
            <PrintTable
              columns={["ผู้เกี่ยวข้อง", "โจทก์", "คดีแดงที่", "วันที่พิทักษ์ทรัพย์", "จำนวนที่ยื่นขอรับชำระหนี้", "สวมสิทธิ์", "หมายเหตุ"]}
              rows={bankruptcyRows}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CaseProgressPreviewV2({ reportData }) {
  const selectedCases = findReportValue(reportData, ["ความคืบหน้าในการดำเนินคดี"], "");
  const caseOptions = checkboxText(["ยังไม่มีการดำเนินคดี", "คดีแพ่ง", "คดีบุริมสิทธิ", "คดีล้มละลาย"], selectedCases);
  const hasCase = (label) => selectedCases.includes(label);
  const underlineValue = (value) => <span className="document-inline-value">{value}</span>;
  const legalRightOptions = checkboxText(["ศาลอนุญาตให้สวมสิทธิแล้ว", "ศาลยังไม่อนุญาตให้สวมสิทธิ"], findReportValue(reportData, ["สถานะการสวมสิทธิ"], ""));
  const preferentialOptions = checkboxText(
    ["ยังไม่ยื่นบุริมสิทธิ", "ยื่นบุริมสิทธิแล้ว", "ศาลมีคำสั่งให้ได้รับชำระหนี้บุริมสิทธิแล้ว", "ยังไม่มีคำสั่งให้ได้รับชำระหนี้บุริมสิทธิ"],
    findReportValue(reportData, ["สถานะคดีบุริมสิทธิ"], ""),
  );
  const bankruptcyOptions = checkboxText(["พบ", "ไม่พบ"], findReportValue(reportData, ["ผลตรวจสอบคดีล้มละลาย"], ""));
  const bankruptcyRows = ["ลูกหนี้", "ผู้ค้ำ/ผู้จำนอง", "ผู้ค้ำประกัน"].map((status) => ({
    ผู้เกี่ยวข้อง: findReportValue(reportData, ["คดีล้มละลาย", status, "ผู้เกี่ยวข้อง"], status),
    โจทก์: findReportValue(reportData, ["คดีล้มละลาย", status, "โจทก์"], ""),
    คดีแดงที่: findReportValue(reportData, ["คดีล้มละลาย", status, "คดีแดงที่"], ""),
    วันที่พิทักษ์ทรัพย์: findReportValue(reportData, ["คดีล้มละลาย", status, "วันที่พิทักษ์ทรัพย์ฯ"], ""),
    จำนวนที่ยื่นขอรับชำระหนี้: findReportValue(reportData, ["คดีล้มละลาย", status, "จำนวนที่ยื่นขอรับชำระหนี้"], ""),
    สวมสิทธิ์: findReportValue(reportData, ["คดีล้มละลาย", status, "สวมสิทธิ์"], ""),
    หมายเหตุ: findReportValue(reportData, ["คดีล้มละลาย", status, "หมายเหตุ"], ""),
  }));
  const hasBankruptcyTable = bankruptcyRows.some((row) => Object.values(row).some((value, index) => index > 0 && value && value !== "-"));

  return (
    <div className="case-progress-preview space-y-2">
      <div className="case-option-row flex flex-wrap gap-x-4 gap-y-1">
        {caseOptions.map((option) => <span key={option}>{option}</span>)}
      </div>

      {hasCase("ยังไม่มีการดำเนินคดี") && (
        <div className="document-case-item">
          {loanContractsFromReportData(reportData).map((loan, index) => (
            <p key={index} className="document-case-line">
              <span className="document-case-title">{index === 0 ? "• ยังไม่มีการดำเนินคดี" : ""}</span>
              <span>สัญญากู้ {underlineValue(loan.contract || "................")} วันที่ {underlineValue(loan.date || "................")}</span>
            </p>
          ))}
        </div>
      )}

      {hasCase("คดีแพ่ง") && (
        <div className="document-case-item">
          <p className="document-case-line"><span className="document-case-title">• คดีแพ่ง</span><span>คดีหมายเลขดำที่ {underlineValue(findReportValue(reportData, ["คดีแพ่ง คดีหมายเลขดำที่"], "................"))} วันที่ฟ้อง {underlineValue(findReportValue(reportData, ["วันที่ฟ้อง"], "................"))}</span></p>
          <p className="document-case-detail">คดีหมายเลขแดงที่ {underlineValue(findReportValue(reportData, ["คดีแพ่ง คดีหมายเลขแดงที่"], "................"))} วันที่พิพากษา {underlineValue(findReportValue(reportData, ["วันที่พิพากษา"], "................"))}</p>
          <p className="document-case-detail">{legalRightOptions.join("   ")}</p>
        </div>
      )}

      {hasCase("คดีบุริมสิทธิ") && (
        <div className="document-case-item">
          <p className="document-case-line"><span className="document-case-title">• คดีบุริมสิทธิ</span><span>คดีหมายเลขแดงที่ {underlineValue(findReportValue(reportData, ["คดีบุริมสิทธิ คดีหมายเลขแดงที่"], "................"))} โจทก์ {underlineValue(findReportValue(reportData, ["โจทก์"], "................"))}</span></p>
          <p className="document-case-detail">{preferentialOptions.join("   ")}</p>
        </div>
      )}

      {hasCase("คดีล้มละลาย") && (
        <div className="document-case-item space-y-1">
          <p className="document-case-line"><span className="document-case-title">• คดีล้มละลาย</span><span>{bankruptcyOptions.join("   ")}</span></p>
          {hasBankruptcyTable && (
            <PrintTable
              columns={["ผู้เกี่ยวข้อง", "โจทก์", "คดีแดงที่", "วันที่พิทักษ์ทรัพย์", "จำนวนที่ยื่นขอรับชำระหนี้", "สวมสิทธิ์", "หมายเหตุ"]}
              rows={bankruptcyRows}
            />
          )}
        </div>
      )}
    </div>
  );
}

function checkboxText(options, selectedText) {
  const selectedValues = normalizeMultiValue(selectedText);
  const checkedMark = "\u2611\uFE0E";
  const uncheckedMark = "\u2610\uFE0E";
  return options.map((option) => `${selectedValues.some((value) => value.includes(option) || option.includes(value)) ? checkedMark : uncheckedMark} ${option}`);
}

function DocumentDebtTemplateBlock({ type, reportData }) {
  const selectedType = type || "previous";
  const selectedLabel = debtTemplateOptions.find((option) => option.type === selectedType)?.label || "";
  const choices = checkboxText(debtTemplateOptions.map((option) => option.label), selectedLabel);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[8px] leading-tight">
        {choices.map((choice) => <span key={choice}>{choice}</span>)}
      </div>
      <DocumentDebtTemplateTable type={selectedType} reportData={reportData} />
    </div>
  );
}

function DocumentDebtCell({ value = "", className = "", colSpan = 1, rowSpan = 1 }) {
  return <td colSpan={colSpan} rowSpan={rowSpan} className={`border border-black px-1 py-1 align-top ${className}`}>{value || "\u00A0"}</td>;
}

function DocumentDebtTemplateTable({ type, reportData }) {
  const title = debtTemplateTitleMap[type] || debtTemplateTitleMap.previous;
  const rowValue = (row, column) => findReportValue(reportData, [`แถว ${row}`, `คอลัมน์ ${column}`], "");
  const rowDisplayValue = (row, column) => {
    const value = rowValue(row, column);
    if (column === 3 && value && !String(value).includes("%")) return `${value}%`;
    return value;
  };
  const summaryValue = (label, column) => findReportValue(reportData, [label, `${column}`], "");
  const textColumnIndexes = new Set([9, 10, 11, 12]);
  const costRowSpan = type === "first" ? 5 : type === "remaining" ? 7 : 3;
  const firstSummaryColumns = [3, 4, 5, 6, 9, 10, 11, 12];
  const remainingSummaryColumns = [4, 5, 6, 9, 10, 11, 12];
  const documentDebtColumnWidths = ["7%", "9%", "6%", "7%", "7%", "7%", "7%", "8%", "17%", "8%", "10%", "7%"];
  const summaryDisplayValue = (label, valueIndex, columnIndex) => {
    const value = summaryValue(label, valueIndex);
    if (!value || !label.includes("%") || textColumnIndexes.has(columnIndex)) return value;
    return String(value).includes("%") ? value : `${value}%`;
  };
  const rowCells = (row) => (
    <>
      {[1, 2, 3, 4, 5, 6].map((column) => <DocumentDebtCell key={column} value={rowDisplayValue(row, column)} />)}
      {row === 1 && (
        <>
          <DocumentDebtCell value={rowValue(1, 7)} rowSpan={costRowSpan} />
          <DocumentDebtCell value={rowValue(1, 8)} rowSpan={costRowSpan} />
        </>
      )}
      {[9, 10, 11, 12].map((column) => <DocumentDebtCell key={column} value={rowValue(row, column)} />)}
    </>
  );

  if (type === "remaining") {
    const summaryRows = ["ชำระหนี้จากการขายทอดตลาด", "ภาระหนี้คงเหลือ", "ขออนุมัติครั้งนี้", "% การรับชำระ"];
    return (
      <div className="w-full overflow-hidden">
        <p className="mb-1 text-[8px] font-semibold underline">{title}</p>
        <table className="document-debt-template w-full table-fixed border-collapse text-[7px] leading-tight">
          <colgroup>
            {documentDebtColumnWidths.map((width, index) => <col key={index} style={{ width }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>เลขบัญชี</th>
              <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>หนี้ตาม</th>
              <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>อัตราดอกเบี้ย</th>
              <th className="border border-black px-1 py-1 align-middle font-semibold" colSpan={3}>ภาระหนี้ ณ ...</th>
              <th className="border border-black px-1 py-1 align-middle font-semibold" colSpan={2}>ต้นทุน ณ ...</th>
              <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>หลักประกัน / ผู้ค้ำประกัน</th>
              <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>ราคาประเมิน BAM วันที่</th>
              <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>สถานะบังคับคดี</th>
              <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>หมายเหตุ</th>
            </tr>
            <tr>
              {["เงินต้น", "ดอกเบี้ย", "รวม", "Day One", "Day One + Yield"].map((heading) => (
                <th key={heading} className="border border-black px-1 py-1 align-middle font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((row) => (
              <tr key={row}>
                {rowCells(row)}
              </tr>
            ))}
            {summaryRows.map((label) => (
              <tr key={label}>
                <DocumentDebtCell value={label} colSpan={3} className="font-semibold text-center" />
                {remainingSummaryColumns.map((column, index) => <DocumentDebtCell key={column} value={summaryDisplayValue(label, index + 1, column)} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <p className="mb-1 text-[8px] font-semibold underline">{title}</p>
      <table className="document-debt-template w-full table-fixed border-collapse text-[7px] leading-tight">
        <colgroup>
          {documentDebtColumnWidths.map((width, index) => <col key={index} style={{ width }} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>เลขบัญชี</th>
            <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>หนี้ตาม</th>
            <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>อัตราดอกเบี้ย</th>
            <th className="border border-black px-1 py-1 align-middle font-semibold" colSpan={3}>ภาระหนี้ ณ ...</th>
            <th className="border border-black px-1 py-1 align-middle font-semibold" colSpan={2}>ต้นทุน ณ ...</th>
            <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>หลักประกัน / ผู้ค้ำประกัน</th>
            <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>ราคาประเมิน BAM วันที่</th>
            <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>สถานะบังคับคดี</th>
            <th className="border border-black px-1 py-1 align-middle font-semibold" rowSpan={2}>หมายเหตุ</th>
          </tr>
          <tr>
            {["เงินต้น", "ดอกเบี้ย", "รวม", "Day One", "Day One + Yield"].map((heading) => (
              <th key={heading} className="border border-black px-1 py-1 align-middle font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((row) => (
            <tr key={row}>
              {rowCells(row)}
            </tr>
          ))}
          {type === "first" && (
            <>
              <tr>
                <DocumentDebtCell value="ขออนุมัติครั้งนี้" colSpan={2} className="font-semibold text-center" />
                {firstSummaryColumns.map((column, index) => <DocumentDebtCell key={column} value={summaryValue("ขออนุมัติครั้งนี้", index + 1)} />)}
              </tr>
              <tr>
                <DocumentDebtCell value="% การรับชำระ" colSpan={2} className="font-semibold text-center" />
                {firstSummaryColumns.map((column, index) => <DocumentDebtCell key={column} value={summaryDisplayValue("% การรับชำระ", index + 1, column)} />)}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SummaryPageHeader({ debtor, recipients, purpose, objective }) {
  const purposeOptions = checkboxText(["ทราบ", "สัตยาบัน", "พิจารณา"], purpose);
  const recipientRowOne = checkboxText(["คณะกรรมการบริษัท", "คณะกรรมการบริหาร"], recipients);
  const recipientRowTwo = checkboxText(["คณะกรรมการพัฒนาสินทรัพย์", "คณะอนุกรรมการพัฒนาสินทรัพย์", "อื่นๆ"], recipients);

  return (
    <header className="document-header text-[11px] leading-relaxed">
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="py-0.5" colSpan={4}></td>
            <td className="py-0.5 text-right align-top text-[10px]" colSpan={2}>
              <span className="purpose-box inline-flex items-center justify-end gap-x-1 whitespace-nowrap px-1 py-0.5">
                <span className="font-semibold">เพื่อ</span>
                {purposeOptions.map((option) => <span key={option}>{option}</span>)}
              </span>
            </td>
          </tr>
          <tr>
            <td className="w-[12px] px-0 py-1 font-semibold">เรียน</td>
            <td className="px-0 py-1" colSpan={5}>
              <span className="document-recipient-options flex flex-wrap gap-x-2 gap-y-1">{recipientRowOne.map((option) => <span key={option}>{option}</span>)}</span>
            </td>
          </tr>
          <tr>
            <td className="w-[12px] px-0 py-1"></td>
            <td className="px-0 py-1" colSpan={5}>
              <span className="document-recipient-options flex flex-wrap gap-x-2 gap-y-1">{recipientRowTwo.map((option) => <span key={option}>{option}</span>)}</span>
            </td>
          </tr>
          <tr>
            <td className="document-topic-box border-l border-r border-t border-black px-2 py-1" colSpan={6}>
              <div className="document-topic-grid">
                <span className="document-topic-label">เรื่อง :</span>
                <span className="document-topic-item document-topic-debtor">ลูกหนี้กลุ่ม / ราย <span className="document-topic-line document-topic-name">{debtor?.debtorName || "........................"}</span></span>
                <span className="document-topic-item">Port <span className="document-topic-line document-topic-short">{debtor?.portfolio || "........"}</span></span>
                <span className="document-topic-item">Client <span className="document-topic-line document-topic-short">{debtor?.customerId || "........"}</span></span>
                <span className="document-topic-item document-topic-transfer">วันรับโอน <span className="document-topic-line document-topic-date">{transferDateDisplay}</span></span>
              </div>
            </td>
          </tr>
          <tr>
            <td className="document-objective-label border-b border-l border-black px-2 py-1 font-semibold whitespace-nowrap">วัตถุประสงค์ :</td>
            <td className="border-b border-r border-black py-1 whitespace-nowrap" colSpan={5}>
              <span className="document-inline-value min-w-[180px] max-w-[420px] align-baseline">{objective !== "-" ? objective : "................................"}</span>
            </td>
          </tr>
          <tr>
            <td className="px-2 py-1" colSpan={6}>
              <div className="document-office-row">
                <span className="font-semibold">ฝ่ายงานที่นำเสนอ :</span>
                <span>{debtor?.department || "พัฒนาสินทรัพย์"}</span>
                <span className="font-semibold">สำนักงาน / กลุ่ม :</span>
                <span>{debtor?.team || "พัฒนาสินทรัพย์ กลุ่มกลาง"}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </header>
  );
}

function SignatureBlock() {
  return (
    <div className="document-signatures mt-4 border border-black p-3 text-center text-[11px]">
      <p className="mb-5 text-left">จึงเรียนมาเพื่อโปรดพิจารณา</p>
      <div className="grid grid-cols-3 gap-5">
        <div className="signature-item">
          <p className="signature-sign-line"></p>
          <p className="signature-name-line">( <span></span> )</p>
          <p>เจ้าหน้าที่ผู้นำเสนอ</p>
          <p>วันที่ ..................................</p>
        </div>
        <div className="signature-item">
          <p className="signature-sign-line"></p>
          <p className="signature-name-line">( <span></span> )</p>
          <p>ผู้จัดการกลุ่มพัฒนาสินทรัพย์ ....</p>
          <p>วันที่ ..................................</p>
        </div>
        <div className="signature-item">
          <p className="signature-sign-line"></p>
          <p className="signature-name-line">( <span></span> )</p>
          <p>ผู้อำนวยการฝ่ายพัฒนาสินทรัพย์</p>
          <p>วันที่ ..................................</p>
        </div>
      </div>
    </div>
  );
}

function DocumentFooter({ page, totalPages }) {
  return (
    <footer className="document-footer mt-3 flex justify-end text-[10px] text-slate-900">
      <span className="text-right">หน้า {page}/{totalPages}</span>
    </footer>
  );
}

function TemplatePage({ children, debtor, recipients, purpose, objective, page, totalPages }) {
  return (
    <article className="print-page bg-white shadow-sm">
      <SummaryPageHeader debtor={debtor} recipients={recipients} purpose={purpose} objective={objective} />
      <main className="document-body border border-black p-2">{children}</main>
      <SignatureBlock />
      <DocumentFooter page={page} totalPages={totalPages} />
    </article>
  );
}

function SummaryPreviewPage({
  debtor,
  reportData,
  debtTemplate,
  onBack,
  onDownloadPdf,
  isDownloadingPdf = false,
  printMode = false,
  extraActions = null,
  infoPanel = null,
  backLabel = "กลับไปแก้ไข",
}) {
  const recipients = findReportValue(reportData, ["เรียน"], "คณะกรรมการพัฒนาสินทรัพย์");
  const purpose = findReportValue(reportData, ["จุดประสงค์"], "พิจารณา");
  const objective = findReportValue(reportData, ["วัตถุประสงค์"], "-");
  const debtDetail = findReportValue(reportData, ["ภาระหนี้"], "-");
  const selectedDebtTemplate = debtTemplate || debtTemplateTypeFromLabel(findReportValue(reportData, ["Template", "ตาราง"], "")) || "previous";
  const negotiation = findReportValue(reportData, ["การเจรจา"], "-");
  const approvalItems = findReportValues(reportData, ["การอนุมัติที่ผ่านมา"]);
  const issue21 = findReportValue(reportData, ["2.1"], "-");
  const issuePaymentMode = findReportValue(reportData, ["รูปแบบการชำระ 2.1"], "");
  const installmentPreviewRows = installmentRowsFromReportData(reportData);
  const opinion31 = findReportValue(reportData, ["ความเห็นผู้นำเสนอ"], "-");
  const reason32 = findReportValue(reportData, ["เหตุผลเพิ่มเติม"], "-");
  const extraFacts = extraSectionsFromReportData(reportData, 1);
  const extraIssues = extraSectionsFromReportData(reportData, 2);
  const extraOpinions = opinionBoxesFromReportData(reportData);
  const loanContracts = loanContractsFromReportData(reportData);
  const factPeople = factPeopleFromReportData(reportData);
  const attachedFiles = reportData
    .filter((entry) => entry.label.includes("ไฟล์แนบ") && entry.value)
    .flatMap((entry) => normalizeMultiValue(entry.value).map((fileName) => ({ group: entry.label, fileName })));
  const opinionPayment = opinionPaymentRowFromReportData(reportData);
  const hasExtraFacts = extraFacts.length > 0;
  const approvalHistoryValue = approvalItems[0] || "";
  const approvalProgressValue = approvalItems[1] || "";
  const dottedValue = (value, fallback = "................") => <span className="document-inline-value">{value || fallback}</span>;
  const issueTextLength = String(issue21 || "").length + extraIssues.reduce((sum, section) => sum + String(section.title || "").length + String(section.detail || "").length, 0);
  const hasInstallmentTable = issuePaymentMode === "ชำระตามงวด" || issuePaymentMode === "ปรับแผนผ่อนชำระ";
  const sectionTwoLoad = issueTextLength + (selectedDebtTemplate === "first" ? 1500 : 0) + (hasInstallmentTable ? installmentPreviewRows.length * 140 : 0);
  const shouldMoveSection14ToPageTwo =
    selectedDebtTemplate !== "previous" ||
    factPeople.length > 0 ||
    loanContracts.length > 1 ||
    String(debtDetail || "").length > 120 ||
    String(negotiation || "").length > 120;
  const shouldMovePaymentSummaryToPageTwo = shouldMoveSection14ToPageTwo;
  const shouldContinueSectionThreeOnPageThree =
    sectionTwoLoad < 850 &&
    extraOpinions.length === 0 &&
    String(opinion31 || "").length < 420 &&
    String(reason32 || "").length < 260;
  const totalPages = shouldContinueSectionThreeOnPageThree ? 3 : 4;
  const sectionTwoContent = (
    <section className="space-y-2">
      <DocumentSectionTitle>2. ประเด็นปัญหา / สิ่งที่ให้พิจารณา</DocumentSectionTitle>
      <h4 className="font-semibold underline">2.1</h4>
      <p className="whitespace-pre-wrap text-[11px]">{issue21}</p>
      {issuePaymentMode && <p className="text-[11px]">รูปแบบการชำระ : {issuePaymentMode}</p>}
      {hasInstallmentTable && <DocumentInstallmentScheduleTable rows={installmentPreviewRows} hideProposal={issuePaymentMode === "ปรับแผนผ่อนชำระ"} />}
      {selectedDebtTemplate === "first" && (
        <div className="space-y-2 text-[11px]">
          <p>
            2.2 - เมื่อลูกหนี้ชำระหนี้ตามข้อ 2.1 ถือเป็นการชำระหนี้เสร็จสิ้น ให้ถอนการยึด / ไถ่ถอนจำนอง
            <span className="document-inline-value">{findReportValue(reportData, ["2.2 ถอนการยึดไถ่ถอนจำนองครั้งเดียว"], "................")}</span>
            คืนให้แก่ลูกหนี้ โดยลูกหนี้เป็นผู้รับผิดชอบค่าใช้จ่ายในการถอนยึด / ไถ่ถอน ทั้งหมด
          </p>
          <p className="font-semibold text-red-600 underline">หรือ</p>
          <p>- เมื่อลูกหนี้ชำระหนี้ตามข้อ 2.1 ครบถ้วนแล้วให้ดำเนินการดังนี้</p>
          <p className="pl-5">
            2.2.1 ถอนการยึด/ ไถ่ถอนจำนอง
            <span className="document-inline-value">{findReportValue(reportData, ["2.2.1 ถอนการยึดไถ่ถอนจำนอง"], "................")}</span>
            คืนให้แก่ลูกหนี้ โดยลูกหนี้เป็นผู้รับผิดชอบค่าใช้จ่ายในการถอนยึด / ไถ่ถอน ทั้งหมด
          </p>
          <p className="pl-5">
            2.2.2 ถอนคำขอเฉลี่ยทรัพย์สืบพบ คดีหมายเลขแดงที่
            <span className="document-inline-value">{findReportValue(reportData, ["2.2.2 คดีหมายเลขแดงที่"], "................")}</span>
            /ถอนคำรับชำระหนี้คดีล้มละลายหมายเลขแดงที่
            <span className="document-inline-value">{findReportValue(reportData, ["2.2.2 คดีล้มละลาย"], "................")}</span>
            (ถ้ามี)
          </p>
          <p className="whitespace-pre-wrap">2.3 {findReportValue(reportData, ["2.3 แนวทางกรณีลูกหนี้ผิดนัดชำระ"], "")}</p>
          <p>2.4 เมื่อลูกหนี้ชำระหนี้เสร็จสิ้น ค่าใช้จ่ายในระบบและค่าใช้จ่ายที่เกิดขึ้นในอนาคต ให้ถือเป็นค่าใช้จ่ายบริษัท</p>
          <p>
            ขออนุมัติยกเว้นการลงนาม
            <span className="document-inline-value">{findReportValue(reportData, ["2.4 ขออนุมัติยกเว้น"], "................")}</span>
            แล้วแต่กรณี
          </p>
          <p>
            2.5 รายงานเพื่อทราบวันครบระยะเวลาบังคับคดีวันที่
            <span className="document-inline-value">{findReportValue(reportData, ["2.5 วันที่"], "................")}</span>
          </p>
        </div>
      )}
      {extraIssues.map((section) => (
        <div key={section.number} className="mt-2">
          <h4 className="underline">{section.number} {section.title}</h4>
          <p className="whitespace-pre-wrap">{section.detail}</p>
        </div>
      ))}
    </section>
  );
  const sectionThreeSummaryNumber = `3.${extraOpinions.length + 3}`;
  const sectionThreeContent = (
    <section className="space-y-3">
      <DocumentSectionTitle>3. ความเห็นผู้นำเสนอ</DocumentSectionTitle>
      <h4 className="font-semibold underline">3.1</h4>
      <p className="whitespace-pre-wrap text-[11px]">{opinion31}</p>
      <PrintTable
        columns={opinionPayment.columns}
        rows={[opinionPayment.row]}
      />
      <h4 className="font-semibold underline">3.2 เหตุผลเพิ่มเติม</h4>
      <p className="whitespace-pre-wrap text-[11px]">{reason32}</p>
      {extraOpinions.map((section) => (
        <div key={section.number}>
          <h4 className="underline">{section.number} {section.title || "ข้อมูลเพิ่มเติม"}</h4>
          <p className="whitespace-pre-wrap">{section.detail}</p>
        </div>
      ))}
      <DebtManagementSummary number={sectionThreeSummaryNumber} reportData={reportData} />
    </section>
  );
  const documentBlocks = [
    {
      key: "section-1-title",
      node: <DocumentSectionTitle>1. เธเนเธญเน€เธ—เนเธเธเธฃเธดเธ / เธเธงเธฒเธกเน€เธเนเธเธกเธฒ</DocumentSectionTitle>,
    },
    {
      key: "section-1-1",
      node: (
        <div className="space-y-2">
          <h4>1.1 เธ เธฒเธฃเธฐเธซเธเธตเนเนเธฅเธฐเธซเธฅเธฑเธเธเธฃเธฐเธเธฑเธ</h4>
          <p className="whitespace-pre-wrap">{debtDetail}</p>
          <DocumentDebtTemplateBlock type={selectedDebtTemplate} reportData={reportData} />
        </div>
      ),
    },
    {
      key: "section-1-2",
      node: (
        <div>
          <h4>1.2 เธเธงเธฒเธกเธเธทเธเธซเธเนเธฒเนเธเธเธฒเธฃเธ”เธณเน€เธเธดเธเธเธ”เธต</h4>
          <CaseProgressPreviewV2 reportData={reportData} />
        </div>
      ),
    },
    {
      key: "section-1-3",
      node: (
        <div>
          <h4>1.3 เธเนเธญเธกเธนเธฅเธฅเธนเธเธซเธเธตเน เธเธนเนเธเนเธณ เนเธฅเธฐเธเธฒเธฃเน€เธเธฃเธเธฒ</h4>
          <p className="whitespace-pre-wrap">{negotiation}</p>
        </div>
      ),
    },
    {
      key: "section-1-4",
      node: (
        <div>
          <h4>1.4 เธเธฒเธฃเธญเธเธธเธกเธฑเธ•เธดเธ—เธตเนเธเนเธฒเธเธกเธฒ</h4>
          <PrintTable
            columns={["เธเธฒเธฃเธญเธเธธเธกเธฑเธ•เธดเธ—เธตเนเธเนเธฒเธเธกเธฒ", "เธเธงเธฒเธกเธเธทเธเธซเธเนเธฒ"]}
            rows={[{ "เธเธฒเธฃเธญเธเธธเธกเธฑเธ•เธดเธ—เธตเนเธเนเธฒเธเธกเธฒ": approvalItems[0] || "เธเธเธช.เธเธฃเธฑเนเธเธ—เธตเน .... เธงเธฑเธเธ—เธตเน ....", "เธเธงเธฒเธกเธเธทเธเธซเธเนเธฒ": approvalItems[1] || "-" }]}
          />
          <div className="mt-2">
            <DocumentPaymentSummaryTable reportData={reportData} />
          </div>
        </div>
      ),
    },
    ...extraFacts.map((section) => ({
      key: `extra-fact-${section.number}`,
      node: (
        <div>
          <h4>{section.number} {section.title}</h4>
          <p className="whitespace-pre-wrap">{section.detail}</p>
        </div>
      ),
    })),
    {
      key: "section-2-title",
      node: <DocumentSectionTitle>2. เธเธฃเธฐเน€เธ”เนเธเธเธฑเธเธซเธฒ / เธชเธดเนเธเธ—เธตเนเนเธซเนเธเธดเธเธฒเธฃเธ“เธฒ</DocumentSectionTitle>,
    },
    {
      key: "section-2-1",
      node: (
        <div className="space-y-2">
          <h4>2.1</h4>
          <p className="whitespace-pre-wrap">{issue21}</p>
          {hasInstallmentTable && <DocumentInstallmentScheduleTable rows={installmentPreviewRows} hideProposal={issuePaymentMode === "ปรับแผนผ่อนชำระ"} />}
        </div>
      ),
    },
    ...extraIssues.map((section) => ({
      key: `extra-issue-${section.number}`,
      node: (
        <div>
          <h4>{section.number} {section.title}</h4>
          <p className="whitespace-pre-wrap">{section.detail}</p>
        </div>
      ),
    })),
    {
      key: "section-3-title",
      node: <DocumentSectionTitle>3. เธเธงเธฒเธกเน€เธซเนเธเธเธนเนเธเธณเน€เธชเธเธญ</DocumentSectionTitle>,
    },
    {
      key: "section-3-1",
      node: (
        <div className="space-y-2">
          <h4>3.1</h4>
          <p className="whitespace-pre-wrap">{opinion31}</p>
          <PrintTable
            columns={["เธเธณเธเธงเธเธฃเธฑเธเธเธณเธฃเธฐ", "% เน€เธเธดเธเธ•เนเธ", "% เธฃเธฒเธเธฒเธเธฃเธฐเน€เธกเธดเธ", "% Day one+Yield", "%Recovery"]}
            rows={[{ "เธเธณเธเธงเธเธฃเธฑเธเธเธณเธฃเธฐ": "3,900", "% เน€เธเธดเธเธ•เนเธ": "72%", "% เธฃเธฒเธเธฒเธเธฃเธฐเน€เธกเธดเธ": "85%", "% Day one+Yield": "110%", "%Recovery": "95%" }]}
          />
        </div>
      ),
    },
    {
      key: "section-3-2",
      node: (
        <div>
          <h4>3.2 เน€เธซเธ•เธธเธเธฅเน€เธเธดเนเธกเน€เธ•เธดเธก</h4>
          <p className="whitespace-pre-wrap">{reason32}</p>
        </div>
      ),
    },
    ...extraOpinions.map((section) => ({
      key: `extra-opinion-${section.number}`,
      node: (
        <div>
          <h4>{section.number} {section.title || "เธเนเธญเธกเธนเธฅเน€เธเธดเนเธกเน€เธ•เธดเธก"}</h4>
          <p className="whitespace-pre-wrap">{section.detail}</p>
        </div>
      ),
    })),
    {
      key: "section-3-summary",
      node: <DebtManagementSummary number={sectionThreeSummaryNumber} reportData={reportData} />,
    },
  ];

  return (
    <main className={`${printMode ? "bg-white p-0" : "min-h-screen bg-[#eef7ff] px-4 py-8 sm:px-6 lg:px-8"} text-slate-900`}>
      <div className={printMode ? "mx-auto max-w-none" : "mx-auto max-w-6xl"}>
        {!printMode && (
        <div className="no-print mb-5 flex flex-col gap-3 rounded-lg border border-[#c8e3f7] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#005fac]">Preview / PDF</p>
            <h1 className="text-xl font-bold text-[#003a70]">ตัวอย่างใบสรุปนำเสนอ</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="h-10 rounded-md border border-[#b9dcf4] bg-white px-4 text-sm font-semibold text-[#005fac]" onClick={onBack}>
              {backLabel}
            </button>
            {extraActions}
            <button
              type="button"
              className="h-10 rounded-md bg-[#005fac] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              onClick={onDownloadPdf || (() => window.print())}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด PDF"}
            </button>
            <button type="button" className="h-10 rounded-md bg-slate-700 px-4 text-sm font-semibold text-white" onClick={() => window.print()}>
              Print
            </button>
          </div>
        </div>
        )}

        {!printMode && infoPanel && <div className="no-print">{infoPanel}</div>}

        {!printMode && attachedFiles.length > 0 && (
          <div className="no-print mb-5 rounded-lg border border-[#c8e3f7] bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-[#003a70]">ไฟล์แนบข้อมูลลูกหนี้</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <span key={`${file.group}-${file.fileName}`} className="rounded-md border border-[#d7eaf8] bg-[#f8fcff] px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold text-[#005fac]">{file.group}: </span>{file.fileName}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="print-document mx-auto space-y-6">
          <TemplatePage debtor={debtor} recipients={recipients} purpose={purpose} objective={objective} page={1} totalPages={totalPages}>
          <section className="space-y-3">
            <DocumentSectionTitle>1. ข้อเท็จจริง / ความเป็นมา</DocumentSectionTitle>
            <div className="space-y-2">
              <h4 className="font-semibold underline">1.1 ภาระหนี้และหลักประกัน</h4>
              <p className="whitespace-pre-wrap text-[11px]">{debtDetail}</p>
              <DocumentDebtTemplateBlock type={selectedDebtTemplate} reportData={reportData} />
              <PrintTable
                columns={["เลขบัญชี", "หนี้ตาม", "ภาระหนี้", "ต้นทุน", "หลักประกัน / ผู้ค้ำประกัน", "สถานะบังคับคดี", "หมายเหตุ"]}
                rows={[
                  { "เลขบัญชี": debtor?.customerId || "-", "หนี้ตาม": "พิพากษา", "ภาระหนี้": formatCurrency(debtor?.balance || 0), "ต้นทุน": "Day One + Yield", "หลักประกัน / ผู้ค้ำประกัน": "ข้อมูลจากระบบ", "สถานะบังคับคดี": debtor?.legalStatus || "-", "หมายเหตุ": "รอตรวจสอบ" },
                ]}
              />
            </div>
            <div>
              <h4 className="font-semibold underline">1.2 ความคืบหน้าในการดำเนินคดี</h4>
              <CaseProgressPreviewV2 reportData={reportData} />
            </div>
            <div>
              <h4 className="font-semibold underline">1.3 ข้อมูลลูกหนี้ ผู้ค้ำ และการเจรจา</h4>
              {factPeople.length > 0 && (
                <table className="document-compact-table mb-2 w-full table-fixed border-collapse">
                  <thead>
                    <tr>
                      {["ประเภท", "ชื่อ", "อายุ", "ที่อยู่", "รายได้", "รายจ่าย", "หมายเหตุ"].map((heading) => (
                        <th key={heading} className="border border-black px-1 py-1 text-center font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {factPeople.map((person, index) => (
                      <tr key={index}>
                        <td className="border border-black px-1 py-1">{person.type || "\u00A0"}</td>
                        <td className="border border-black px-1 py-1">{person.name || "\u00A0"}</td>
                        <td className="border border-black px-1 py-1">{person.age || "\u00A0"}</td>
                        <td className="border border-black px-1 py-1">{person.address || "\u00A0"}</td>
                        <td className="border border-black px-1 py-1 text-right">{person.income || "\u00A0"}</td>
                        <td className="border border-black px-1 py-1 text-right">{person.expense || "\u00A0"}</td>
                        <td className="border border-black px-1 py-1">{person.note || "\u00A0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="whitespace-pre-wrap text-[11px]">{negotiation}</p>
            </div>
            {!shouldMoveSection14ToPageTwo && (
              <div>
                <h4 className="font-semibold underline">1.4 การอนุมัติที่ผ่านมา</h4>
                <PrintTable
                  columns={["การอนุมัติที่ผ่านมา", "ความคืบหน้า"]}
                  rows={[{ "การอนุมัติที่ผ่านมา": approvalHistoryValue, "ความคืบหน้า": approvalProgressValue }]}
                />
                <div className="mt-2">
                  <DocumentPaymentSummaryTable reportData={reportData} />
                </div>
              </div>
            )}
          </section>
          </TemplatePage>

          <TemplatePage debtor={debtor} recipients={recipients} purpose={purpose} objective={objective} page={2} totalPages={totalPages}>
          <section className="space-y-3">
            <DocumentSectionTitle>1. ข้อเท็จจริง / ความเป็นมา (ต่อ)</DocumentSectionTitle>
            {shouldMoveSection14ToPageTwo && (
              <div>
                <h4 className="font-semibold underline">1.4 การอนุมัติที่ผ่านมา</h4>
                <PrintTable
                  columns={["การอนุมัติที่ผ่านมา", "ความคืบหน้า"]}
                  rows={[{ "การอนุมัติที่ผ่านมา": approvalHistoryValue, "ความคืบหน้า": approvalProgressValue }]}
                />
                <div className="mt-2">
                  <h4 className="font-semibold underline">สรุปผลการชำระหนี้</h4>
                  <DocumentPaymentSummaryTable reportData={reportData} />
                </div>
              </div>
            )}
            {shouldMovePaymentSummaryToPageTwo && !shouldMoveSection14ToPageTwo && (
              <div>
                <h4 className="font-semibold underline">1.4 สรุปผลการชำระหนี้</h4>
                <DocumentPaymentSummaryTable reportData={reportData} />
              </div>
            )}
            <div className="space-y-1 text-[11px]">
              <h4>1.5 ผลการสืบทรัพย์</h4>
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                {checkboxText(["ไม่พบทรัพย์", "พบทรัพย์ (ระบุ)", "อื่นๆ"], findReportValue(reportData, ["1.5 ผลการสืบทรัพย์"], "")).map((option) => (
                  <span key={option}>{option}</span>
                ))}
              </p>
              <p>
                อื่นๆ {dottedValue(findReportValue(reportData, ["1.5 สาเหตุอื่นๆ"], ""))}
                <span className="mx-2">ข้อมูลทรัพย์สินอื่น {dottedValue(findReportValue(reportData, ["1.5 ข้อมูลทรัพย์สินอื่น"], ""))}</span>
                ราคาประเมินรวม {dottedValue(findReportValue(reportData, ["1.5 ราคาประเมินรวม"], ""))} บาท
              </p>
              <h4>1.6 ผลการตรวจสอบข้อมูลภาระหนี้อื่น</h4>
              <p>
                ตามแบบยืนยันภาระหนี้เกณฑ์สิทธิ์ ลว. {dottedValue(findReportValue(reportData, ["1.6 ตามแบบยืนยัน"], ""))}
                <span className="mx-2 inline-flex gap-x-3">
                  {checkboxText(["ไม่พบ", "พบ"], findReportValue(reportData, ["1.6 ผลตรวจสอบ"], "")).map((option) => (
                    <span key={option}>{option}</span>
                  ))}
                </span>
                พบรวม {dottedValue(findReportValue(reportData, ["1.6 พบรวมกี่บัญชี"], ""))} บัญชี
              </p>
              <h4>1.7 ดำเนินการตามกฎหมาย ปปง. แล้ว และการลงนามในสัญญาปรับปรุงโครงสร้างหนี้ตามคำสั่งบริษัท</h4>
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                {checkboxText(["ครบถ้วน", "ไม่ครบถ้วน และนำเสนอครั้งนี้"], findReportValue(reportData, ["1.7 สถานะ"], "")).map((option) => (
                  <span key={option}>{option}</span>
                ))}
              </p>
              <p>เหตุผลประกอบการพิจารณา {dottedValue(findReportValue(reportData, ["1.7 เหตุผล"], ""))}</p>
              <h4>1.8 ประมาณการค่าใช้จ่ายทั้งหมด</h4>
              <p>
                รวม {dottedValue(findReportValue(reportData, ["1.8 ค่าใช้จ่ายทั้งหมด"], ""))} บาท
                <span className="mx-2">แบ่งเป็นค่าใช้จ่ายในระบบ {dottedValue(findReportValue(reportData, ["1.8 แบ่งเป็น"], ""))} บาท</span>
                และค่าใช้จ่ายในอนาคตรวม {dottedValue(findReportValue(reportData, ["1.8 ค่าใช้จ่ายในอนาคตรวม"], ""))} บาท
              </p>
              <p>รายละเอียดค่าใช้จ่ายในอนาคต {dottedValue(findReportValue(reportData, ["1.8 รายละเอียดค่าใช้จ่ายในอนาคต"], ""))}</p>
            </div>
            {hasExtraFacts && (
              <div>
                <h4 className="font-semibold underline">หัวข้อเพิ่มเติม</h4>
                <div className="space-y-2 text-[11px]">
                  {extraFacts.map((section) => (
                    <div key={section.number}>
                      <h4 className="underline">{section.number} {section.title}</h4>
                      <p className="whitespace-pre-wrap">{section.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          </TemplatePage>

          <TemplatePage debtor={debtor} recipients={recipients} purpose={purpose} objective={objective} page={3} totalPages={totalPages}>
            {sectionTwoContent}
            {shouldContinueSectionThreeOnPageThree && <div className="mt-4">{sectionThreeContent}</div>}
          </TemplatePage>

          {!shouldContinueSectionThreeOnPageThree && (
            <TemplatePage debtor={debtor} recipients={recipients} purpose={purpose} objective={objective} page={4} totalPages={totalPages}>
              {sectionThreeContent}
            </TemplatePage>
          )}
        </div>
      </div>
    </main>
  );
}

function SummaryFormPage({ debtor, onBack, onCreated }) {
  const [activeStep, setActiveStep] = useState("heading");
  const [extraSections, setExtraSections] = useState({
    heading: [],
    facts: [],
    issues: [],
    opinion: [],
  });
  const [confirmedData, setConfirmedData] = useState(null);
  const [showOtherRecipient, setShowOtherRecipient] = useState(false);
  const [debtTemplate, setDebtTemplate] = useState("");
  const [caseSelections, setCaseSelections] = useState({
    noCase: false,
    civil: false,
    preferential: false,
    bankruptcy: false,
  });
  const [loanContracts, setLoanContracts] = useState([{ id: "loan-1" }]);
  const [factPeople, setFactPeople] = useState([
    { id: "debtor-1", role: "ลูกหนี้" },
    { id: "guarantor-1", role: "ผู้ค้ำ" },
  ]);
  const [formValues, setFormValues] = useState({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [confirmedPayload, setConfirmedPayload] = useState(null);
  const [uploadGroups, setUploadGroups] = useState({ debtor: [], amlo: [], expense: [] });
  const [uploadProgress, setUploadProgress] = useState({ debtor: 0, amlo: 0, expense: 0 });
  const [uploadingGroups, setUploadingGroups] = useState({ debtor: false, amlo: false, expense: false });
  const [issuePaymentMode, setIssuePaymentMode] = useState("");
  const [installmentRows, setInstallmentRows] = useState({
    custom: [
      { id: "custom-1", period: "", month: "", amount: "", proposal: "" },
      { id: "custom-2", period: "", month: "", amount: "", proposal: "" },
    ],
  });
  const [opinionBoxes, setOpinionBoxes] = useState([]);
  const steps = [
    { key: "heading", number: 0, label: "หัวข้อใบสรุปนำเสนอ" },
    { key: "facts", number: 1, label: "ข้อเท็จจริง" },
    { key: "issues", number: 2, label: "ประเด็นปัญหา / สิ่งที่ให้พิจารณา" },
    { key: "opinion", number: 3, label: "ความเห็นผู้นำเสนอ" },
  ];

  const activeIndex = steps.findIndex((step) => step.key === activeStep);
  const extraStart = { heading: 1, facts: 9, issues: 2, opinion: 4 };
  const stepPrefix = { heading: "0", facts: "1", issues: "2", opinion: "3" };
  const getExtraStart = (stepKey) => (stepKey === "issues" && debtTemplate === "first" ? 6 : extraStart[stepKey]);

  const handleSummaryValueChange = (event) => {
    const element = event.target;
    const label = element.dataset?.summaryLabel;
    if (!label) return;

    setFormValues((current) => {
      if (element.type === "checkbox") {
        if (element.dataset.summarySingle === "true") {
          document.querySelectorAll(`[data-summary-label="${CSS.escape(label)}"][data-summary-single="true"]`).forEach((input) => {
            if (input !== element) input.checked = false;
          });
          return {
            ...current,
            [label]: element.checked ? [element.value] : [],
            ...(label === "1.5 ผลการสืบทรัพย์" && element.value !== "อื่นๆ" ? { "1.5 สาเหตุอื่นๆ": "" } : {}),
          };
        }
        const next = new Set(normalizeMultiValue(current[label]));
        if (element.checked) next.add(element.value);
        else next.delete(element.value);
        return { ...current, [label]: Array.from(next) };
      }

      if (element.type === "file") {
        return {
          ...current,
          [label]: Array.from(element.files ?? []).map((file) => file.name).join(", "),
        };
      }

      return { ...current, [label]: element.value || "" };
    });
  };

  const handleUploadFiles = (event, group = "debtor", summaryLabel = "ไฟล์แนบข้อมูลลูกหนี้") => {
    const files = Array.from(event.target.files ?? []).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}`,
      name: file.name,
      size: file.size,
    }));

    setUploadProgress((current) => ({ ...current, [group]: files.length ? 12 : 0 }));
    setUploadingGroups((current) => ({ ...current, [group]: files.length > 0 }));

    if (!files.length) return;

    window.setTimeout(() => setUploadProgress((current) => ({ ...current, [group]: 48 })), 180);
    window.setTimeout(() => setUploadProgress((current) => ({ ...current, [group]: 82 })), 380);
    window.setTimeout(() => {
      setUploadGroups((current) => {
        const currentGroup = current[group] ?? [];
        const nextGroupFiles = [...currentGroup, ...files];
        const nextGroups = { ...current, [group]: nextGroupFiles };
        const allFilesForLabel = nextGroupFiles;
        setFormValues((currentValues) => ({
          ...currentValues,
          [summaryLabel]: allFilesForLabel.map((file) => file.name).join(", "),
        }));
        return nextGroups;
      });
      setUploadProgress((current) => ({ ...current, [group]: 0 }));
    }, 620);
    window.setTimeout(() => {
      setUploadingGroups((current) => ({ ...current, [group]: false }));
      event.target.value = "";
    }, 850);
  };

  const collectFormValues = () => ({
    ...collectVisibleSummaryValues(formValues),
    "ไฟล์แนบข้อมูลลูกหนี้": (uploadGroups.debtor ?? []).map((file) => file.name).join(", "),
    "ไฟล์แนบ ปปง.": (uploadGroups.amlo ?? []).map((file) => file.name).join(", "),
    "ไฟล์แนบค่าใช้จ่าย": (uploadGroups.expense ?? []).map((file) => file.name).join(", "),
    "รูปแบบการชำระ 2.1": issuePaymentMode,
  });

  const collectReportData = () => reportEntriesFromValues(collectFormValues());

  const showPreview = () => {
    const values = collectFormValues();
    const reportData = reportEntriesFromValues(values);
    const payload = buildPdfPayload(values, reportData);
    setConfirmedPayload(payload);
    setConfirmedData(reportData);
  };

  const buildPdfPayload = (values, reportData) => {
    const payload = buildPresentationSummaryPayload({
      debtor,
      values,
      debtTemplate,
      caseSelections,
      installmentRows,
    });

    return {
      ...payload,
      __preview: {
        debtor,
        reportData,
        debtTemplate,
      },
    };
  };

  const downloadSummaryPdf = async (payload) => {
    setIsGeneratingPdf(true);
    await downloadPresentationSummaryPdf(payload);
  };

  const addExtraSection = () => {
    setExtraSections((current) => {
      const nextNumber = getExtraStart(activeStep) + current[activeStep].length;
      return {
        ...current,
        [activeStep]: [
          ...current[activeStep],
          { id: `${activeStep}-${Date.now()}`, number: `${stepPrefix[activeStep]}.${nextNumber}`, saved: false, editing: true },
        ],
      };
    });
  };

  const updateExtraSection = (id, changes) => {
    setExtraSections((current) => ({
      ...current,
      [activeStep]: current[activeStep].map((section) =>
        section.id === id ? { ...section, ...changes } : section,
      ),
    }));
  };

  const removeExtraSection = (id) => {
    setExtraSections((current) => ({
      ...current,
      [activeStep]: current[activeStep].filter((section) => section.id !== id),
    }));
  };

  const addLoanContract = () => {
    setLoanContracts((current) => [...current, { id: `loan-${Date.now()}` }]);
  };

  const removeLoanContract = (id) => {
    setLoanContracts((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
  };

  const addFactPerson = (role) => {
    setFactPeople((current) => [...current, { id: `${role}-${Date.now()}`, role }]);
  };

  const removeFactPerson = (id) => {
    setFactPeople((current) => {
      const target = current.find((person) => person.id === id);
      if (!target) return current;
      const sameRoleCount = current.filter((person) => person.role === target.role).length;
      if (sameRoleCount <= 1) return current;
      return current.filter((person) => person.id !== id);
    });
  };

  const addInstallmentRow = () => {
    setInstallmentRows((current) => ({
      ...current,
      custom: [
        ...current.custom,
        { id: `custom-${Date.now()}`, period: "", month: "", amount: "", proposal: "" },
      ],
    }));
  };

  const updateInstallmentRow = (id, field, value) => {
    setInstallmentRows((current) => ({
      ...current,
      custom: current.custom.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    }));
  };

  const removeInstallmentRow = (id) => {
    setInstallmentRows((current) => ({
      ...current,
      custom: current.custom.filter((row) => row.id !== id),
    }));
  };

  const addOpinionBox = () => {
    setOpinionBoxes((current) => [
      ...current,
      { id: `opinion-${Date.now()}`, number: `3.${current.length + 3}`, saved: false, editing: true },
    ]);
  };

  const updateOpinionBox = (id, changes) => {
    setOpinionBoxes((current) =>
      current.map((box) => (box.id === id ? { ...box, ...changes } : box)),
    );
  };

  const removeOpinionBox = (id) => {
    setOpinionBoxes((current) =>
      current.filter((box) => box.id !== id).map((box, index) => ({ ...box, number: `3.${index + 3}` })),
    );
  };

  const goPrevious = () => {
    setActiveStep(steps[Math.max(activeIndex - 1, 0)].key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    setActiveStep(steps[Math.min(activeIndex + 1, steps.length - 1)].key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmCreateSummary = async () => {
    const values = collectFormValues();
    const reportData = reportEntriesFromValues(values);
    const payload = buildPdfPayload(values, reportData);
    const missing = [];
    if (!payload.objective) missing.push("วัตถุประสงค์");
    if (!payload.purposeFor.length) missing.push("จุดประสงค์เพื่อ");
    if (!payload.recipients.length) missing.push("เรียน");

    if (missing.length) {
      alert(`กรุณากรอก/เลือกข้อมูลจำเป็นก่อนสร้าง PDF: ${missing.join(", ")}`);
      return;
    }

    const approved = window.confirm("ยืนยันการสร้างใบสรุปนำเสนอและดาวน์โหลด PDF ที่ตรงกับหน้า preview หรือไม่?");
    if (!approved) return;

    try {
      await downloadSummaryPdf(payload);

      const draft = {
        id: `draft-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: "pending",
        debtor,
        payload,
        reportData,
      };
      saveSummaryDraft(draft);
      onCreated?.(draft);
    } catch (error) {
      alert(`สร้าง PDF ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  summaryFormValueSnapshot = formValues;
  const assetSearchSelections = normalizeMultiValue(formValues["1.5 ผลการสืบทรัพย์"]);
  const assetSearchOtherSelected = assetSearchSelections.includes("อื่นๆ");
  const otherDebtFound = normalizeMultiValue(formValues["1.6 ผลตรวจสอบภาระหนี้อื่น"]).includes("พบ");

  if (confirmedData) {
    return (
      <SummaryPreviewPage
        debtor={debtor}
        reportData={confirmedData}
        debtTemplate={debtTemplate}
        onBack={() => setConfirmedData(null)}
        onDownloadPdf={async () => {
          if (!confirmedPayload) return;
          try {
            await downloadSummaryPdf(confirmedPayload);
          } catch (error) {
            alert(`ดาวน์โหลด PDF ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`);
          } finally {
            setIsGeneratingPdf(false);
          }
        }}
        isDownloadingPdf={isGeneratingPdf}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#eef7ff] text-slate-900 lg:flex">
      <aside className="border-b border-[#c8e3f7] bg-white lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-[#d7eaf8] px-5 py-6">
          <button
            type="button"
            className="mb-5 inline-flex h-10 items-center gap-2 rounded-md border border-[#b9dcf4] bg-white px-4 text-sm font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            กลับหน้าค้นหา
          </button>
          <p className="text-sm font-semibold text-[#005fac]">Presentation Summary Form</p>
          <h1 className="mt-1 text-xl font-bold text-[#003a70]">สร้างใบสรุปนำเสนอ</h1>
          {debtor && <p className="mt-2 text-sm text-slate-500">{debtor.customerId} • {debtor.debtorName}</p>}
        </div>

        <nav className="space-y-2 p-4">
          {steps.map((step) => (
            <button
              key={step.key}
              type="button"
              className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-semibold transition ${
                activeStep === step.key ? "bg-[#005fac] text-white shadow-sm" : "text-slate-700 hover:bg-[#eef7ff] hover:text-[#005fac]"
              }`}
              onClick={() => setActiveStep(step.key)}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${activeStep === step.key ? "bg-white text-[#005fac]" : "bg-[#e6f3fc] text-[#005fac]"}`}>
                {step.number}
              </span>
              {step.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8" onChange={handleSummaryValueChange}>
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="overflow-hidden rounded-lg border border-[#b9dcf4] bg-white shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-[#004b93] via-[#0b73bb] to-[#f18a1b]" />
            <div className="px-5 py-5">
              <p className="text-sm font-semibold text-[#005fac]">แบบฟอร์มจากไฟล์ใบสรุปนำเสนอ</p>
              <h2 className="mt-1 text-2xl font-bold text-[#003a70]">ใบสรุปนำเสนอ</h2>
            </div>
          </header>

          {activeStep === "heading" && (
          <SectionCard title="0. หัวข้อใบสรุปนำเสนอ">
            <div className="space-y-5">
              <CheckGroup label="จุดประสงค์เพื่อ" options={["ทราบ", "สัตยาบัน", "พิจารณา"]} single />
              <div>
                <p className="text-sm font-medium text-slate-700">เรียน</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {["คณะกรรมการบริษัท", "คณะกรรมการบริหาร", "คณะกรรมการพัฒนาสินทรัพย์", "คณะอนุกรรมการพัฒนาสินทรัพย์"].map((option) => (
                    <label key={option} className="inline-flex items-center gap-2 rounded-md border border-[#d7eaf8] bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#005fac]"
                        data-summary-label="เรียน"
                        data-summary-single="true"
                        value={option}
                        defaultChecked={normalizeMultiValue(formValues["เรียน"]).includes(option)}
                        onChange={() => setShowOtherRecipient(false)}
                      />
                      {option}
                    </label>
                  ))}
                  <label className="inline-flex items-center gap-2 rounded-md border border-[#d7eaf8] bg-white px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[#005fac]"
                      data-summary-label="เรียน"
                      data-summary-single="true"
                      value="อื่นๆ"
                      defaultChecked={normalizeMultiValue(formValues["เรียน"]).includes("อื่นๆ")}
                      onChange={(event) => setShowOtherRecipient(event.target.checked)}
                    />
                    อื่นๆ
                  </label>
                </div>
                {showOtherRecipient && <Field label="เรียน อื่นๆ" placeholder="ระบุผู้รับเรื่อง" className="mt-3 max-w-xl" />}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ReadOnlyInfo label="ลูกหนี้กลุ่ม/ราย" value={debtor?.debtorName ?? "บริษัทตัวอย่าง จำกัด"} />
                <ReadOnlyInfo label="Port" value={debtor?.portfolio ?? "SCB43"} />
                <ReadOnlyInfo label="Client" value={debtor?.customerId ?? "C-100284"} />
                <ReadOnlyInfo label="วันนัดรับโอน" value={transferDateDisplay} />
                <Field label="วัตถุประสงค์" placeholder="กรอกวัตถุประสงค์ของเรื่อง" className="xl:col-span-2" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyInfo label="ฝ่ายงานที่นำเสนอ" value={debtor?.department ?? "พัฒนาสินทรัพย์"} />
                <ReadOnlyInfo label="สำนักงาน / กลุ่ม" value={debtor?.team ?? "พัฒนาสินทรัพย์ กลุ่มกลาง"} />
              </div>
            </div>
          </SectionCard>
          )}

          {activeStep === "facts" && (
            <>
              <SectionCard title="1.1 ภาระหนี้และหลักประกัน">
                <div className="space-y-5">
                  <Field label="รายละเอียดภาระหนี้และหลักประกัน" type="textarea" placeholder="กรอกข้อเท็จจริงเพิ่มเติม" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">เลือก template ตาราง</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {[
                        ["first", "ประนอมหนี้ครั้งแรก"],
                        ["previous", "เคยประนอมหนี้แล้ว"],
                        ["remaining", "ประนอมหนี้ส่วนที่เหลือจากการขายทอด แต่หลักประกันยังไม่ตัดชำระ"],
                      ].map(([value, label]) => (
                        <label key={value} className="inline-flex items-center gap-2 rounded-md border border-[#d7eaf8] bg-white px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-[#005fac]"
                            checked={debtTemplate === value}
                            data-summary-label="Template ตารางภาระหนี้และหลักประกัน"
                            value={label}
                            onChange={(event) => setDebtTemplate(event.target.checked ? value : "")}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  {debtTemplate && <DebtTemplateTable type={debtTemplate} />}
                </div>
              </SectionCard>

              <SectionCard title="1.2 ความคืบหน้าในการดำเนินคดี">
                <div className="space-y-5">
                  {[
                    ["noCase", "ยังไม่มีการดำเนินคดี"],
                    ["civil", "คดีแพ่ง"],
                    ["preferential", "คดีบุริมสิทธิ"],
                    ["bankruptcy", "คดีล้มละลาย"],
                  ].map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-2 rounded-md border border-[#d7eaf8] bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#005fac]"
                        data-summary-label="ความคืบหน้าในการดำเนินคดี"
                        value={label}
                        checked={caseSelections[key]}
                        onChange={(event) => setCaseSelections((current) => ({ ...current, [key]: event.target.checked }))}
                      />
                      {label}
                    </label>
                  ))}

                  {caseSelections.noCase && (
                    <div className="space-y-3 rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
                      {loanContracts.map((contract, index) => (
                        <div key={contract.id} className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                          <Field label={`สัญญากู้ ${index + 1}`} placeholder="ระบุเลขที่สัญญากู้" />
                          <Field label={`วันที่สัญญากู้ ${index + 1}`} type="date" />
                          <button
                            type="button"
                            className="mt-7 h-10 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => removeLoanContract(contract.id)}
                            disabled={loanContracts.length <= 1}
                          >
                            ลบ
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="h-9 rounded-md border border-[#b9dcf4] bg-white px-3 text-xs font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
                        onClick={addLoanContract}
                      >
                        + เพิ่มสัญญากู้
                      </button>
                    </div>
                  )}

                  {caseSelections.civil && (
                    <div className="space-y-4 rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Field label="คดีแพ่ง คดีหมายเลขดำที่" />
                        <Field label="วันที่ฟ้อง" type="date" />
                        <Field label="คดีแพ่ง คดีหมายเลขแดงที่" />
                        <Field label="วันที่พิพากษา" type="date" />
                      </div>
                      <CheckGroup label="สถานะการสวมสิทธิ" options={["ศาลอนุญาตให้สวมสิทธิแล้ว", "ศาลยังไม่อนุญาตให้สวมสิทธิ"]} />
                    </div>
                  )}

                  {caseSelections.preferential && (
                    <div className="space-y-4 rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="คดีบุริมสิทธิ คดีหมายเลขแดงที่" />
                        <Field label="โจทก์" />
                      </div>
                      <CheckGroup label="สถานะคดีบุริมสิทธิ" options={["ยังไม่ยื่นบุริมสิทธิ", "ยื่นบุริมสิทธิแล้ว (สวมสิทธิ)", "ยื่นบุริมสิทธิแล้ว (ยังไม่สวมสิทธิ)", "ศาลมีคำสั่งให้ได้รับชำระหนี้บุริมสิทธิแล้ว", "ยังไม่มีคำสั่งให้ได้รับชำระหนี้บุริมสิทธิ"]} />
                    </div>
                  )}

                  {caseSelections.bankruptcy && (
                    <div className="space-y-4 rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
                      <CheckGroup label="ผลตรวจสอบคดีล้มละลาย" options={["พบ", "ไม่พบ"]} single />
                      <BankruptcyTable />
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="1.3 ข้อมูลลูกหนี้ ผู้ค้ำ และการเจรจา">
                <div className="space-y-5">
                  <PersonInfoTable title="ตารางข้อมูลลูกหนี้" role="ลูกหนี้" people={factPeople} onAddRow={addFactPerson} onRemoveRow={removeFactPerson} />
                  <PersonInfoTable title="ตารางข้อมูลผู้ค้ำ" role="ผู้ค้ำ" people={factPeople} onAddRow={addFactPerson} onRemoveRow={removeFactPerson} />

                  <Field label="การเจรจา" type="textarea" />
                  <UploadBox
                    title="Upload file ประกอบข้อมูลลูกหนี้"
                    description="รองรับไฟล์เอกสารหรือรูปภาพประกอบข้อมูลลูกหนี้"
                    files={uploadGroups.debtor}
                    progress={uploadProgress.debtor}
                    isUploading={uploadingGroups.debtor}
                    onChange={(event) => handleUploadFiles(event, "debtor", "ไฟล์แนบข้อมูลลูกหนี้")}
                  />
                </div>
              </SectionCard>

              <SectionCard title="1.4 การอนุมัติที่ผ่านมา">
                <div className="space-y-5">
                  <ApprovalHistoryTable />
                  <div>
                    <p className="mb-3 text-sm font-medium text-slate-700">สรุปผลการชำระหนี้</p>
                    <PaymentSummaryTable />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="1.5 ผลการสืบทรัพย์">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">ผลการสืบทรัพย์</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {["ไม่พบทรัพย์", "พบทรัพย์ (ระบุ)", "อื่นๆ"].map((option) => (
                        <label key={option} className="inline-flex items-center gap-2 rounded-md border border-[#d7eaf8] bg-white px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-[#005fac]"
                            data-summary-label="1.5 ผลการสืบทรัพย์"
                            data-summary-single="true"
                            value={option}
                            defaultChecked={assetSearchSelections.includes(option)}
                          />
                          {option}
                          {option === "อื่นๆ" && assetSearchOtherSelected && (
                            <input
                              data-summary-label="1.5 สาเหตุอื่นๆ"
                              className="ml-1 w-64 border-0 border-b border-dotted border-slate-500 bg-transparent px-1 text-sm outline-none focus:border-[#005fac]"
                              defaultValue={formValues["1.5 สาเหตุอื่นๆ"] ?? ""}
                              placeholder="ระบุสาเหตุ"
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="ข้อมูลทรัพย์สินอื่น" summaryLabel="1.5 ข้อมูลทรัพย์สินอื่น" placeholder="ระบุข้อมูลทรัพย์สินอื่น" />
                    <Field label="ราคาประเมินรวม" summaryLabel="1.5 ราคาประเมินรวม" type="number" placeholder="บาท" />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="1.6 ผลการตรวจสอบข้อมูลภาระหนี้อื่น">
                <div className="space-y-4">
                  <Field label="ตามแบบยืนยันภาระหนี้เกณฑ์สิทธิ์ ลว." summaryLabel="1.6 ตามแบบยืนยันภาระหนี้เกณฑ์สิทธิ์ ลว." type="plainText" className="max-w-sm" />
                  <CheckGroup label="ผลการตรวจสอบข้อมูลภาระหนี้อื่น" summaryLabel="1.6 ผลตรวจสอบภาระหนี้อื่น" options={["ไม่พบ", "พบ"]} single />
                  {otherDebtFound && (
                    <Field label="พบรวมกี่บัญชี" summaryLabel="1.6 พบรวมกี่บัญชี" type="number" className="max-w-sm" />
                  )}
                </div>
              </SectionCard>

              <SectionCard title="1.7 ดำเนินการตามกฎหมาย ปปง. แล้ว และการลงนามในสัญญาปรับปรุงโครงสร้างหนี้ตามคำสั่งบริษัท">
                <div className="space-y-4">
                  <CheckGroup label="สถานะการดำเนินการ" summaryLabel="1.7 สถานะการดำเนินการตามกฎหมาย ปปง." options={["ครบถ้วน", "ไม่ครบถ้วน และนำเสนอครั้งนี้"]} single />
                  <Field label="เหตุผลประกอบการพิจารณา" summaryLabel="1.7 เหตุผลประกอบการพิจารณา" type="textarea" />
                  <UploadBox
                    title="Upload file ปปง. / สัญญาปรับปรุงโครงสร้างหนี้"
                    description="รองรับไฟล์เอกสารประกอบการดำเนินการตามกฎหมาย ปปง."
                    files={uploadGroups.amlo}
                    progress={uploadProgress.amlo}
                    isUploading={uploadingGroups.amlo}
                    onChange={(event) => handleUploadFiles(event, "amlo", "ไฟล์แนบ ปปง.")}
                  />
                </div>
              </SectionCard>

              <SectionCard title="1.8 ประมาณการค่าใช้จ่ายทั้งหมด">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="ค่าใช้จ่ายทั้งหมด" summaryLabel="1.8 ค่าใช้จ่ายทั้งหมด" type="number" />
                  <Field label="แบ่งเป็นค่าใช้จ่ายในระบบ" summaryLabel="1.8 แบ่งเป็นค่าใช้จ่ายในระบบ" type="number" />
                  <Field label="ค่าใช้จ่ายในอนาคตรวม" summaryLabel="1.8 ค่าใช้จ่ายในอนาคตรวม" type="number" />
                  <Field label="รายละเอียดค่าใช้จ่ายในอนาคต" summaryLabel="1.8 รายละเอียดค่าใช้จ่ายในอนาคต" type="textarea" className="md:col-span-3" />
                  <div className="md:col-span-3">
                    <UploadBox
                      title="Upload file ค่าใช้จ่าย"
                      description="รองรับไฟล์เอกสารแนบท้ายรายละเอียดค่าใช้จ่าย"
                      files={uploadGroups.expense}
                      progress={uploadProgress.expense}
                      isUploading={uploadingGroups.expense}
                      onChange={(event) => handleUploadFiles(event, "expense", "ไฟล์แนบค่าใช้จ่าย")}
                    />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeStep === "issues" && (
            <>
              <SectionCard title="2.1 ประเด็นปัญหา / สิ่งที่ให้พิจารณา">
                <div className="space-y-5">
                  <Field label="2.1 ประเด็นปัญหา / สิ่งที่ให้พิจารณา" type="textarea" placeholder="กรอก free text" />
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">รูปแบบการชำระ</p>
                    <div className="flex flex-wrap gap-3">
                      {["ชำระเต็มจำนวน", "ชำระตามงวด", "ปรับแผนผ่อนชำระ"].map((option) => (
                        <label key={option} className="inline-flex items-center gap-2 rounded-md border border-[#d7eaf8] bg-white px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-[#005fac]"
                            checked={issuePaymentMode === option}
                            onChange={(event) => setIssuePaymentMode(event.target.checked ? option : "")}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                  {(issuePaymentMode === "ชำระตามงวด" || issuePaymentMode === "ปรับแผนผ่อนชำระ") && (
                    <div>
                      <p className="mb-3 text-sm font-medium text-slate-700">
                        {issuePaymentMode === "ปรับแผนผ่อนชำระ" ? "ตารางปรับแผนผ่อนชำระ" : "ตารางผ่อนชำระตามงวด"}
                      </p>
                      <InstallmentScheduleTable
                        rows={installmentRows}
                        onAddRow={addInstallmentRow}
                        onUpdateRow={updateInstallmentRow}
                        onRemoveRow={removeInstallmentRow}
                        hideProposal={issuePaymentMode === "ปรับแผนผ่อนชำระ"}
                      />
                    </div>
                  )}
                </div>
              </SectionCard>

              {debtTemplate === "first" && (
                <>
                  <SectionCard title="2.2 เงื่อนไขเมื่อชำระหนี้ตามข้อ 2.1 เสร็จสิ้น">
                    <div className="space-y-4 text-sm text-slate-800">
                      <div className="space-y-2">
                        <p>- เมื่อลูกหนี้ชำระหนี้ตามข้อ 2.1 ถือเป็นการชำระหนี้เสร็จสิ้น ให้ถอนการยึด / ไถ่ถอนจำนองคืนให้แก่ลูกหนี้ โดยลูกหนี้เป็นผู้รับผิดชอบค่าใช้จ่ายในการถอนยึด / ไถ่ถอน ทั้งหมด</p>
                        <Field label="ถอนการยึด / ไถ่ถอนจำนอง" summaryLabel="2.2 ถอนการยึดไถ่ถอนจำนองครั้งเดียว" className="max-w-xl" />
                      </div>
                      <p className="font-semibold text-red-600 underline">หรือ</p>
                      <p>- เมื่อลูกหนี้ชำระหนี้ตามข้อ 2.1 ครบถ้วนแล้วให้ดำเนินการดังนี้</p>
                      <div className="space-y-4 rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
                        <Field
                          label="2.2.1 ถอนการยึด/ ไถ่ถอนจำนองคืนให้แก่ลูกหนี้ โดยลูกหนี้เป็นผู้รับผิดชอบค่าใช้จ่ายในการถอนยึด / ไถ่ถอน ทั้งหมด"
                          summaryLabel="2.2.1 ถอนการยึดไถ่ถอนจำนอง"
                        />
                        <div>
                          <p className="mb-2 text-sm font-medium text-slate-800">
                            2.2.2 ถอนคำขอเฉลี่ยทรัพย์สืบพบ คดีหมายเลขแดงที่/ถอนคำรับชำระหนี้คดีล้มละลายหมายเลขแดงที่(ถ้ามี)
                          </p>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="คดีหมายเลขแดงที่" summaryLabel="2.2.2 คดีหมายเลขแดงที่" />
                            <Field label="คดีล้มละลายหมายเลขแดงที่" summaryLabel="2.2.2 คดีล้มละลายหมายเลขแดงที่" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                  <SectionCard title="2.3 แนวทางกรณีลูกหนี้ผิดนัดชำระ">
                    <Field
                      label="รายละเอียดแนวทางกรณีลูกหนี้ผิดนัดชำระ"
                      summaryLabel="2.3 แนวทางกรณีลูกหนี้ผิดนัดชำระ"
                      type="textarea"
                    />
                  </SectionCard>
                  <SectionCard title="2.4 ค่าใช้จ่ายในระบบและอนาคตหลังรับชำระเสร็จสิ้น">
                    <div className="space-y-4 text-sm text-slate-800">
                      <p>เมื่อลูกหนี้ชำระหนี้เสร็จสิ้น ค่าใช้จ่ายในระบบและค่าใช้จ่ายที่เกิดขึ้นในอนาคต ให้ถือเป็นค่าใช้จ่ายบริษัท</p>
                      <Field label="ขออนุมัติยกเว้นการลงนาม" summaryLabel="2.4 ขออนุมัติยกเว้นการลงนาม" className="max-w-xl" />
                    </div>
                  </SectionCard>
                  <SectionCard title="2.5 รายงานเพื่อทราบวันครบระยะเวลาบังคับคดี">
                    <Field label="วันที่ครบระยะเวลาบังคับคดี" summaryLabel="2.5 วันที่ครบระยะเวลาบังคับคดี" className="max-w-sm" />
                  </SectionCard>
                </>
              )}
            </>
          )}

          {activeStep === "opinion" && (
            <>
              <SectionCard title="3.1 ความเห็นผู้นำเสนอ">
                <div className="space-y-5">
                  <Field label="ความเห็นผู้นำเสนอ" type="textarea" />
                  <OpinionPaymentTable />
                </div>
              </SectionCard>

              <SectionCard title="3.2 เหตุผลเพิ่มเติม">
                <Field label="เหตุผลเพิ่มเติม" type="textarea" />
              </SectionCard>

              {opinionBoxes.length > 0 && (
                <SectionCard title="กล่องเพิ่มข้อมูล">
                  <div className="space-y-4">
                    {opinionBoxes.map((box) => (
                    <div key={box.id} className="rounded-md border border-[#d7eaf8] bg-[#f8fcff] p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-[#003a70]">{box.number} ข้อมูลเพิ่มเติม</p>
                      </div>
                      <Field label={`${box.number} ชื่อหัวข้อ`} placeholder="ระบุชื่อหัวข้อ" disabled={!box.editing} />
                      <Field label={`${box.number} รายละเอียด`} type="textarea" disabled={!box.editing} />
                      <div className="mt-3 flex justify-end gap-2">
                        {box.editing ? (
                          <button
                            type="button"
                            className="h-9 rounded-md bg-[#1a9b63] px-3 text-xs font-semibold text-white"
                            onClick={() => updateOpinionBox(box.id, { saved: true, editing: false })}
                          >
                            บันทึก
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="h-9 rounded-md border border-[#b9dcf4] bg-white px-3 text-xs font-semibold text-[#005fac]"
                            onClick={() => updateOpinionBox(box.id, { editing: true })}
                          >
                            แก้ไข
                          </button>
                        )}
                        <button
                          type="button"
                          className="h-9 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700"
                          onClick={() => removeOpinionBox(box.id)}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  className="h-10 rounded-md border border-[#b9dcf4] bg-white px-4 text-sm font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
                  onClick={addOpinionBox}
                >
                  + เพิ่มกล่องข้อมูล {`3.${opinionBoxes.length + 3}`}
                </button>
              </div>

              <SectionCard title={`${`3.${opinionBoxes.length + 3}`} สรุปภาพรวมการบริหารหนี้`}>
                <DebtManagementSummary number={`3.${opinionBoxes.length + 3}`} editable />
              </SectionCard>
            </>
          )}

          {activeStep !== "heading" && activeStep !== "opinion" && extraSections[activeStep].map((section) => (
            <SectionCard key={section.id} title={`${section.number} หัวข้อเพิ่มเติม`}>
              <div className={`grid gap-4 md:grid-cols-2 ${section.editing ? "" : "opacity-70"}`}>
                <Field label={`${section.number} ชื่อหัวข้อ`} placeholder="ระบุชื่อหัวข้อ" disabled={!section.editing} />
                <Field label={`${section.number} รายละเอียด`} type="textarea" className="md:col-span-2" placeholder="กรอก free text" disabled={!section.editing} />
                {section.saved && !section.editing && (
                  <p className="md:col-span-2 text-xs font-medium text-green-700">บันทึกหัวข้อนี้แล้ว</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {section.editing ? (
                  <button
                    type="button"
                    className="h-9 rounded-md bg-[#1a9b63] px-3 text-xs font-semibold text-white transition hover:bg-[#137a4e]"
                    onClick={() => updateExtraSection(section.id, { saved: true, editing: false })}
                  >
                    บันทึก
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-9 rounded-md border border-[#b9dcf4] bg-white px-3 text-xs font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
                    onClick={() => updateExtraSection(section.id, { editing: true })}
                  >
                    แก้ไข
                  </button>
                )}
                <button
                  type="button"
                  className="h-9 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  onClick={() => removeExtraSection(section.id)}
                >
                  ลบ
                </button>
              </div>
            </SectionCard>
          ))}

          <div className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm shadow-blue-100/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {activeStep !== "heading" && activeStep !== "opinion" ? (
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[#b9dcf4] bg-white px-4 text-sm font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
                  onClick={addExtraSection}
                >
                  + เพิ่มหัวข้อ {stepPrefix[activeStep]}.{getExtraStart(activeStep) + extraSections[activeStep].length}
                </button>
              ) : (
                <span className="text-sm text-slate-500">
                  {activeStep === "heading" ? "ตรวจสอบหัวข้อใบสรุปนำเสนอ แล้วกดไปขั้นตอนถัดไป" : "ตรวจสอบความเห็นผู้นำเสนอ แล้วกดยืนยันเมื่อข้อมูลครบถ้วน"}
                </span>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="h-10 rounded-md border border-[#b9dcf4] bg-white px-4 text-sm font-semibold text-[#005fac] transition hover:bg-[#eef7ff]"
                  onClick={showPreview}
                >
                  ดูพรีวิว
                </button>
                {activeIndex > 0 && (
                  <button
                    type="button"
                    className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={goPrevious}
                  >
                    ย้อนกลับ
                  </button>
                )}
                {activeIndex < steps.length - 1 ? (
                  <button
                    type="button"
                    className="h-10 rounded-md bg-[#005fac] px-4 text-sm font-semibold text-white transition hover:bg-[#004b93]"
                    onClick={goNext}
                  >
                    ไปขั้นตอนถัดไป
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-10 rounded-md bg-[#1a9b63] px-4 text-sm font-semibold text-white transition hover:bg-[#137a4e] disabled:cursor-not-allowed disabled:bg-slate-400"
                    onClick={confirmCreateSummary}
                    disabled={isGeneratingPdf}
                  >
                    {isGeneratingPdf ? "กำลังสร้าง PDF..." : "ยืนยันการสร้างใบสรุปนำเสนอ"}
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

function App() {
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [currentPage, setCurrentPage] = useState("search");
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);

  const filteredDebtors = useMemo(() => {
    return debtors.filter((debtor) =>
      filterFields.every((field) => {
        const filterValue = appliedFilters[field.name].trim().toLowerCase();
        if (!filterValue) return true;

        return String(debtor[field.name] ?? "")
          .toLowerCase()
          .includes(filterValue);
      }),
    );
  }, [appliedFilters]);

  const handleFilterChange = (name, value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const openDebtorPage = (page, debtor) => {
    setSelectedDebtor(debtor);
    setCurrentPage(page);
  };

  const handleMenuClick = (page) => {
    setCurrentPage(page);
  };

  const pageDetails = {
    executiveSummary: {
      title: "บทสรุปผู้บริหาร",
      description: "หน้าสำหรับสรุปข้อมูลสำคัญของลูกหนี้ในมุมมองผู้บริหาร",
    },
    debtorDetail: {
      title: "รายละเอียดลูกหนี้",
      description: "หน้าข้อมูลโดยรวมจากรายการที่เลือก สามารถต่อยอดรายละเอียดเชิงลึกได้",
    },
    caseHistory: {
      title: "ประวัติคดีความ",
      description: "หน้าสำหรับแสดงลำดับเหตุการณ์และข้อมูลคดีความที่เกี่ยวข้อง",
    },
    debtRestructure: {
      title: "การปรับโครงสร้างหนี้",
      description: "หน้าสำหรับติดตามเงื่อนไขและแผนการปรับโครงสร้างหนี้",
    },
    collateralDetail: {
      title: "รายละเอียดหลักประกัน",
      description: "หน้าสำหรับแสดงข้อมูลหลักประกัน มูลค่า และสถานะการประเมิน",
    },
    presentationSummary: {
      title: "สร้างใบสรุปนำเสนอ",
      description: "หน้าสำหรับจัดทำใบสรุปนำเสนอของลูกหนี้ที่เลือก",
    },
    presentationSlide: {
      title: "สร้างสไลด์นำเสนอ",
      description: "หน้าสำหรับจัดทำสไลด์นำเสนอของลูกหนี้ที่เลือก",
    },
  };

  if (currentPage === "presentationSummary") {
    return (
      <SummaryFormPage
        debtor={selectedDebtor}
        onBack={() => setCurrentPage("search")}
        onCreated={(draft) => {
          setSelectedDraft(draft);
          setCurrentPage("pendingApproval");
        }}
      />
    );
  }

  if (currentPage === "presentationSlide") {
    return <SlideBuilderPage debtor={selectedDebtor} draft={selectedDraft || readSavedDraft(selectedDebtor)} onBack={() => setCurrentPage("pendingApproval")} />;
  }

  if (currentPage === "approvalReview") {
    return (
      <ApprovalReviewPage
        draft={selectedDraft || readSavedDraft()}
        onBack={() => setCurrentPage("pendingApproval")}
        onDraftUpdate={setSelectedDraft}
        onCreateSlide={(draft) => {
          setSelectedDraft(draft);
          setSelectedDebtor(draft?.debtor ?? null);
          setCurrentPage("presentationSlide");
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#eef7ff] text-slate-900 lg:flex">
        <aside className="border-b border-[#c8e3f7] bg-white shadow-sm shadow-blue-100/60 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-[#d7eaf8] px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#004b93] text-white">
                <Home size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#003a70]">เมนูการจัดทำข้อมูล</p>
                <p className="text-xs text-slate-500">Presentation Summary</p>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible lg:p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.key;

              return (
                <button
                  key={item.label}
                  className={`flex h-11 shrink-0 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition lg:w-full ${
                    isActive
                      ? "bg-[#005fac] text-white shadow-sm"
                      : "text-slate-700 hover:bg-[#eef7ff] hover:text-[#005fac]"
                  }`}
                  type="button"
                  onClick={() => handleMenuClick(item.key)}
                >
                  <Icon size={18} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
        <header className="mb-7 overflow-hidden rounded-lg border border-[#b9dcf4] bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-[#004b93] via-[#0b73bb] to-[#f18a1b]" />
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-20 items-center justify-center rounded-md bg-[#004b93] text-xl font-bold tracking-wide text-white shadow-sm">
                BAM
              </div>
              <div>
                <p className="text-sm font-semibold text-[#005fac]">Bangkok Commercial Asset Management</p>
                <h1 className="mt-1 text-2xl font-bold text-[#003a70] sm:text-3xl">
                  ระบบจัดการใบสรุปนำเสนอ
                </h1>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600">ข้อมูลสำหรับค้นหาและจัดทำเอกสารนำเสนอ</p>
          </div>
        </header>

        {currentPage === "search" ? (
          <>
        <form
          className="rounded-lg border border-[#c8e3f7] bg-white p-5 shadow-sm shadow-blue-100/60"
          onSubmit={handleSearch}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#003a70]">ตัวกรองการค้นหา</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {filterFields.map((field) => (
              <FilterField
                key={field.name}
                field={field}
                value={filters[field.name]}
                onChange={handleFilterChange}
              />
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-md border border-[#b9dcf4] bg-white px-5 text-sm font-semibold text-[#005fac] transition hover:bg-[#eef7ff] focus:outline-none focus:ring-2 focus:ring-[#9ed4f5]"
              onClick={handleClearFilters}
            >
              ล้างค่า
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[#005fac] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004b93] focus:outline-none focus:ring-2 focus:ring-[#9ed4f5]"
            >
              <Search size={18} />
              ค้นหา
            </button>
          </div>
        </form>

        <section className="mt-6 overflow-hidden rounded-lg border border-[#c8e3f7] bg-white shadow-sm shadow-blue-100/60">
          <div className="flex flex-col gap-2 border-b border-[#d7eaf8] bg-[#f8fcff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#003a70]">ผลการค้นหา</h2>
              <p className="mt-1 text-sm text-slate-500">พบข้อมูลทั้งหมด {filteredDebtors.length} รายการ</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#d7eaf8]">
              <thead className="bg-[#e6f3fc]">
                <tr>
                  {["รหัสลูกค้า", "ชื่อลูกหนี้", "ชื่อพอร์ตโฟลิโอ", "ยอดหนี้คงเหลือ", "สถานะทางกฎหมาย", "จัดการ"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#335f82]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7f2fb] bg-white">
                {filteredDebtors.map((debtor) => {
                  const savedDraft = readSavedDraft(debtor.customerId);
                  return (
                  <tr
                    key={debtor.customerId}
                    className="cursor-pointer transition hover:bg-[#f0f8ff]"
                    onClick={() => openDebtorPage("debtorDetail", debtor)}
                    onDoubleClick={() => openDebtorPage("debtorDetail", debtor)}
                    title="คลิกเพื่อเปิดหน้ารายละเอียดลูกหนี้"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-900">
                      {debtor.customerId}
                    </td>
                    <td className="min-w-64 px-5 py-4 text-sm text-slate-800">{debtor.debtorName}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                      {debtor.portfolio}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(debtor.balance)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${legalStatusStyles[debtor.legalStatus]}`}>
                        {debtor.legalStatus}
                      </span>
                    </td>
                    <td className="min-w-64 px-5 py-4">
                      <div className="flex flex-col items-start gap-2">
                        <button
                          type="button"
                          className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#9ed4f5] ${
                            savedDraft
                              ? "cursor-not-allowed bg-slate-200 text-slate-500"
                              : "bg-[#005fac] text-white hover:bg-[#004b93]"
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!savedDraft) openDebtorPage("presentationSummary", debtor);
                          }}
                          disabled={Boolean(savedDraft)}
                        >
                          <FileText size={16} />
                          {savedDraft ? "สร้างใบสรุปแล้ว" : "สร้างใบสรุปนำเสนอ"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {filteredDebtors.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={6}>
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#d7eaf8] bg-[#f8fcff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              แสดง {filteredDebtors.length ? `1-${filteredDebtors.length}` : "0"} จาก {filteredDebtors.length} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button className="inline-flex h-9 items-center gap-1 rounded-md border border-[#b9dcf4] bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-[#eef7ff]">
                <ChevronLeft size={16} />
                Back
              </button>
              <button className="h-9 min-w-9 rounded-md bg-[#005fac] px-3 text-sm font-semibold text-white">1</button>
              <button className="inline-flex h-9 items-center gap-1 rounded-md border border-[#b9dcf4] bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-[#eef7ff]">
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
          </>
        ) : currentPage === "pendingApproval" ? (
          <PendingApprovalPage
            onReviewDraft={(draft) => {
              setSelectedDraft(draft);
              setCurrentPage("approvalReview");
            }}
            onCreateSlide={(draft) => {
              setSelectedDraft(draft);
              setSelectedDebtor(draft?.debtor ?? null);
              setCurrentPage("presentationSlide");
            }}
          />
        ) : (
          <PlaceholderPage
            title={pageDetails[currentPage]?.title ?? "หน้าข้อมูล"}
            description={pageDetails[currentPage]?.description ?? "หน้าสำหรับแสดงรายละเอียดเพิ่มเติม"}
            debtor={selectedDebtor}
            onBack={() => setCurrentPage("search")}
          />
        )}
          </div>
        </div>
    </main>
  );
}

const pdfPreviewPayload = window.__PDF_PREVIEW_PAYLOAD__;

createRoot(document.getElementById("root")).render(
  pdfPreviewPayload ? (
    <SummaryPreviewPage
      debtor={pdfPreviewPayload.debtor}
      reportData={pdfPreviewPayload.reportData ?? []}
      debtTemplate={pdfPreviewPayload.debtTemplate}
      printMode
    />
  ) : (
    <App />
  ),
);

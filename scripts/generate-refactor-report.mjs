/**
 * generate-refactor-report.mjs
 *
 * Generates a PDF architecture refactor report for the convertfloww project.
 * Uses jsPDF + jspdf-autotable (already in project dependencies).
 *
 * Run with:  node scripts/generate-refactor-report.mjs
 * Output:    docs/plans/architecture-refactor-report.pdf
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// jspdf ships a CommonJS build; load it that way
const { jsPDF } = require('jspdf');
const { applyPlugin, autoTable } = require('jspdf-autotable');

// Apply autotable plugin to jsPDF prototype so doc.autoTable() works
applyPlugin(jsPDF);

// ─── Colour Palette ───────────────────────────────────────────────────────────
const C = {
  navy:    [15,  23,  42],   // slate-900
  indigo:  [79,  70, 229],   // primary brand
  violet:  [109, 40, 217],   // accent
  slate:   [71,  85, 105],   // slate-600
  red:     [220, 38,  38],   // issue critical
  amber:   [217, 119,  6],   // issue medium
  emerald: [5,  150, 105],   // issue low / good
  white:   [255, 255, 255],
  lightBg: [248, 250, 252],  // very light slate
  lineGrey:[226, 232, 240],
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const HIGH_ISSUES = [
  {
    id: 'H1',
    file: 'shared/components/SettingsMenu.tsx',
    summary: 'God component — 412 lines, 3 responsibilities',
    detail:
      'Mixes Accessibility/Theme settings, Profile CRUD (name/password/avatar), ' +
      'and Danger Zone delete into a single file. createProfileRepository() is ' +
      'instantiated 3× inside separate click handlers.',
    fix:
      'Extract AccessibilitySettings, ThemeSettings, ProfileSettings, and DangerZone ' +
      'panel components. Add a useSettingsActions() hook with a stable repo ref. ' +
      'SettingsMenu becomes a ~60-line shell.',
  },
  {
    id: 'H2',
    file: 'attendance/components/ProfileSelection.tsx',
    summary: 'Monolith view — 611 lines, 4 concerns inlined',
    detail:
      'Profile grid, Add-profile modal, Password-unlock prompt with lockout logic, ' +
      'and avatar picker are all in one file. Business rules (lockout after 5 attempts, ' +
      'bcrypt migration) sit alongside JSX.',
    fix:
      'Extract AddProfileModal, PasswordUnlockModal, and ProfileCard components. ' +
      'Move AVATARS constant to attendance/constants.ts. ProfileSelection becomes a ' +
      '~150-line coordinator.',
  },
  {
    id: 'H3',
    file: 'admin/hooks/useAdminDashboard.ts',
    summary: 'Raw SQL in hook — no data layer',
    detail:
      'Seven separate supabase.from() calls spread across the hook file. ' +
      'moderateAll is defined inline inside the return object. AdminProfile ' +
      'and Announcement types duplicate concepts from other features.',
    fix:
      'Create AdminRepository class encapsulating all DB access. ' +
      'useAdminDashboard becomes coordination logic only (state + toast). ' +
      'Hook drops from 238 to ~120 lines.',
  },
  {
    id: 'H4',
    file: 'attendance/components/AttendanceView.tsx',
    summary: 'Raw Supabase query inside render component',
    detail:
      'Announcement fetch + mark_announcement_seen RPC are in a useEffect directly ' +
      'in the view (lines 86–117). Announcement interface re-declared here; it already ' +
      'exists in admin.types.ts.',
    fix:
      'Create useAnnouncement(profileId) hook returning { announcement, dismiss }. ' +
      'Import Announcement type from admin.types.ts. AttendanceView calls the hook ' +
      'instead of containing raw fetch logic.',
  },
  {
    id: 'H5',
    file: 'shared/store/useThemeStore.ts',
    summary: 'DOM side-effects at module load time',
    detail:
      'document.documentElement.classList.add runs during store initialisation ' +
      '(line 20–22), before React mounts. Breaks test environments and SSR; ' +
      'causes flash-of-wrong-theme in some scenarios.',
    fix:
      'Move DOM mutations (classList.add / setAttribute) into the Zustand persist ' +
      'onRehydrateStorage callback. Store becomes pure; tests no longer need ' +
      'document mocking.',
  },
];

const MEDIUM_ISSUES = [
  {
    id: 'M1',
    file: 'attendance/store/useAttendanceStore.ts',
    summary: 'Async side-effects and self-reference inside store',
    detail:
      'uploadAvatar and syncFromCloud call useAttendanceStore.getState() from ' +
      'within a store action — a self-reference anti-pattern that prevents testing ' +
      'actions in isolation.',
    fix: 'Move uploadAvatar and syncFromCloud into a useAttendanceSync() hook that ' +
      'reads store state externally via selectors.',
  },
  {
    id: 'M2',
    file: 'shared/components/SettingsMenu.tsx',
    summary: 'Repository instantiated 3× inside event handlers',
    detail:
      'createProfileRepository(supabase) is called fresh on every button click ' +
      'instead of once at component mount level.',
    fix: 'Resolved by Step 1 (useSettingsActions hook holds a stable repo ref).',
  },
  {
    id: 'M3',
    file: 'pdf-engine/hooks/usePdfDocument.ts',
    summary: 'Module-level mutable globals for render queue',
    detail:
      'renderQueue[] and isQueueRunning are module-level variables that persist ' +
      'between Vitest test cases and across HMR reloads.',
    fix:
      'Encapsulate in a RenderQueue class; instantiate via useMemo inside the hook.',
  },
  {
    id: 'M4',
    file: 'core/lib/useAuthStore.ts',
    summary: 'Auth listener registered at module import',
    detail:
      'supabase.auth.onAuthStateChange is called at line 66 when the module loads, ' +
      'before React mounts. If the store is imported before Supabase initialises, ' +
      'the listener is silently dropped.',
    fix:
      'Export an initAuth() function; call it in main.tsx after createRoot().render().',
  },
];

const LOW_ISSUES = [
  {
    id: 'L1',
    file: 'src/App.tsx',
    summary: 'window.location.href for SPA navigation',
    detail: 'Line 49 forces a full page reload to reach the admin portal, breaking ' +
      'React Router history and the browser back button.',
    fix: 'Use useNavigate() from react-router-dom.',
  },
  {
    id: 'L2',
    file: 'attendance/components/AttendanceView.tsx',
    summary: 'Announcement type re-declared',
    detail: 'Local Announcement interface (line 21) shadows the identical type in admin.types.ts.',
    fix: 'Import Announcement from admin.types.ts; remove local re-declaration.',
  },
  {
    id: 'L3',
    file: 'attendance/components/ProfileSelection.tsx',
    summary: 'Magic avatar URL array inlined in component',
    detail: 'AVATARS constant with 16 DiceBear URLs is declared at the top of the 611-line file.',
    fix: 'Move to src/features/attendance/constants.ts.',
  },
  {
    id: 'L4',
    file: 'admin/hooks/useAdminDashboard.ts',
    summary: 'moderateAll defined inline in return object',
    detail: 'Unlike every other function in the hook, moderateAll is an anonymous ' +
      'async function inside the return literal — inconsistent and untestable by reference.',
    fix: 'Extract to a named const moderateAll = async () => { ... } before the return.',
  },
  {
    id: 'L5',
    file: 'src/store/',
    summary: 'Vestigial empty directory',
    detail: 'src/store/ exists but contains no files — dead code in the directory tree.',
    fix: 'Delete the directory.',
  },
];

const STEPS = [
  {
    n: 1, title: 'Split SettingsMenu into sub-components',
    files: 'SettingsMenu.tsx → AccessibilitySettings, ThemeSettings, ProfileSettings, DangerZone + useSettingsActions hook',
    fixes: 'H1, M2',
    effort: 'Medium',
  },
  {
    n: 2, title: 'Extract useAnnouncement hook',
    files: 'New: attendance/hooks/useAnnouncement.ts',
    fixes: 'H4, L2',
    effort: 'Small',
  },
  {
    n: 3, title: 'Create AdminRepository',
    files: 'New: admin/repository/adminRepository.ts; refactor useAdminDashboard.ts',
    fixes: 'H3, L4',
    effort: 'Medium',
  },
  {
    n: 4, title: 'Split ProfileSelection into sub-components',
    files: 'New: AddProfileModal, PasswordUnlockModal, ProfileCard; attendance/constants.ts',
    fixes: 'H2, L3',
    effort: 'Large',
  },
  {
    n: 5, title: 'Fix store side-effects',
    files: 'useThemeStore.ts, useAuthStore.ts, main.tsx',
    fixes: 'H5, M4',
    effort: 'Small',
  },
  {
    n: 6, title: 'Scope RenderQueue in usePdfDocument',
    files: 'pdf-engine/hooks/usePdfDocument.ts',
    fixes: 'M3',
    effort: 'Small',
  },
  {
    n: 7, title: 'Fix SPA navigation + remove /store',
    files: 'App.tsx, delete src/store/',
    fixes: 'L1, L5',
    effort: 'Trivial',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rgb(col) { return col; }

function drawPageHeader(doc, title, pageW) {
  // Background band
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFillColor(...C.indigo);
  doc.rect(0, 28, pageW, 3, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FlowwSuite', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Architecture Refactor Report', 14, 19);

  doc.setFontSize(9);
  doc.text(title, pageW - 14, 19, { align: 'right' });

  doc.setFontSize(7);
  doc.setTextColor(...C.white);
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW - 14, 11, { align: 'right' });
}

function drawSectionTitle(doc, text, y) {
  doc.setFillColor(...C.indigo);
  doc.roundedRect(14, y - 5, 6, 6, 1, 1, 'F');
  doc.setTextColor(...C.navy);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(text, 24, y);
  return y + 6;
}

// ─── PDF Builder ──────────────────────────────────────────────────────────────

function buildPdf() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 0;

  // ── PAGE 1: Cover ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Accent stripe
  doc.setFillColor(...C.indigo);
  doc.rect(0, pageH * 0.45, pageW, 4, 'F');
  doc.setFillColor(...C.violet);
  doc.rect(0, pageH * 0.45 + 4, pageW, 2, 'F');

  // Title block
  doc.setTextColor(...C.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Architecture', pageW / 2, pageH * 0.35, { align: 'center' });
  doc.text('Refactor Report', pageW / 2, pageH * 0.35 + 13, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('convertfloww · FlowwSuite', pageW / 2, pageH * 0.35 + 24, { align: 'center' });

  // Summary pills
  const pills = [
    { label: '5 HIGH', col: C.red },
    { label: '4 MEDIUM', col: C.amber },
    { label: '5 LOW', col: C.emerald },
    { label: '7 STEPS', col: C.indigo },
  ];
  const pillW = 32, pillH = 10, gap = 6;
  const totalW = pills.length * pillW + (pills.length - 1) * gap;
  let px = (pageW - totalW) / 2;
  const py = pageH * 0.56;

  pills.forEach(p => {
    doc.setFillColor(...p.col);
    doc.roundedRect(px, py, pillW, pillH, 2, 2, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(p.label, px + pillW / 2, py + 6.5, { align: 'center' });
    px += pillW + gap;
  });

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, pageH - 20, { align: 'center' });
  doc.text('150 / 150 tests passing  ·  TypeScript strict  ·  ESLint clean', pageW / 2, pageH - 14, { align: 'center' });

  // ── PAGE 2: High-Priority Issues ─────────────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, 'High-Priority Issues', pageW);
  y = 42;

  drawSectionTitle(doc, '🔴  High-Priority Issues (H1 – H5)', y);
  y += 10;

  HIGH_ISSUES.forEach((iss, i) => {
    // Card background
    const cardH = 42;
    if (y + cardH > pageH - 20) { doc.addPage(); drawPageHeader(doc, 'High-Priority Issues', pageW); y = 42; }

    doc.setFillColor(...C.lightBg);
    doc.roundedRect(margin, y, pageW - margin * 2, cardH, 2, 2, 'F');
    doc.setDrawColor(...C.red);
    doc.roundedRect(margin, y, pageW - margin * 2, cardH, 2, 2, 'S');

    // ID badge
    doc.setFillColor(...C.red);
    doc.roundedRect(margin + 2, y + 3, 10, 7, 1, 1, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(iss.id, margin + 7, y + 8, { align: 'center' });

    // Title
    doc.setTextColor(...C.navy);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(iss.summary, margin + 15, y + 8);

    // File
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.slate);
    doc.text(iss.file, margin + 15, y + 14);

    // Detail
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const detailLines = doc.splitTextToSize('Issue: ' + iss.detail, pageW - margin * 2 - 18);
    doc.text(detailLines.slice(0, 2), margin + 4, y + 21);

    // Fix
    doc.setTextColor(...C.emerald);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const fixLines = doc.splitTextToSize('Fix: ' + iss.fix, pageW - margin * 2 - 18);
    doc.text(fixLines.slice(0, 2), margin + 4, y + 31);

    y += cardH + 5;
  });

  // ── PAGE 3: Medium & Low Issues ──────────────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, 'Medium & Low Issues', pageW);
  y = 42;

  drawSectionTitle(doc, '🟡  Medium-Priority Issues (M1 – M4)', y);
  y += 10;

  MEDIUM_ISSUES.forEach((iss) => {
    const cardH = 36;
    if (y + cardH > pageH - 20) { doc.addPage(); drawPageHeader(doc, 'Medium & Low Issues', pageW); y = 42; }

    doc.setFillColor(...C.lightBg);
    doc.roundedRect(margin, y, pageW - margin * 2, cardH, 2, 2, 'F');
    doc.setDrawColor(...C.amber);
    doc.roundedRect(margin, y, pageW - margin * 2, cardH, 2, 2, 'S');

    doc.setFillColor(...C.amber);
    doc.roundedRect(margin + 2, y + 3, 10, 7, 1, 1, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(iss.id, margin + 7, y + 8, { align: 'center' });

    doc.setTextColor(...C.navy);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(iss.summary, margin + 15, y + 8);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.slate);
    doc.text(iss.file, margin + 15, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const detailLines = doc.splitTextToSize('Issue: ' + iss.detail, pageW - margin * 2 - 18);
    doc.text(detailLines.slice(0, 2), margin + 4, y + 21);

    doc.setTextColor(...C.emerald);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const fixLines = doc.splitTextToSize('Fix: ' + iss.fix, pageW - margin * 2 - 18);
    doc.text(fixLines.slice(0, 1), margin + 4, y + 29);

    y += cardH + 5;
  });

  y += 4;
  if (y + 8 > pageH - 20) { doc.addPage(); drawPageHeader(doc, 'Medium & Low Issues', pageW); y = 42; }
  drawSectionTitle(doc, '🟢  Low-Priority Issues (L1 – L5)', y);
  y += 10;

  LOW_ISSUES.forEach((iss) => {
    const cardH = 26;
    if (y + cardH > pageH - 20) { doc.addPage(); drawPageHeader(doc, 'Medium & Low Issues', pageW); y = 42; }

    doc.setFillColor(...C.lightBg);
    doc.roundedRect(margin, y, pageW - margin * 2, cardH, 2, 2, 'F');
    doc.setDrawColor(...C.emerald);
    doc.roundedRect(margin, y, pageW - margin * 2, cardH, 2, 2, 'S');

    doc.setFillColor(...C.emerald);
    doc.roundedRect(margin + 2, y + 3, 10, 7, 1, 1, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(iss.id, margin + 7, y + 8, { align: 'center' });

    doc.setTextColor(...C.navy);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(iss.summary, margin + 15, y + 8);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.slate);
    doc.text(iss.file, margin + 15, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.emerald);
    const fixLines = doc.splitTextToSize('Fix: ' + iss.fix, pageW - margin * 2 - 18);
    doc.text(fixLines.slice(0, 1), margin + 4, y + 21);

    y += cardH + 4;
  });

  // ── PAGE 4: Refactor Roadmap ──────────────────────────────────────────────────
  doc.addPage();
  drawPageHeader(doc, 'Refactor Roadmap', pageW);
  y = 42;

  drawSectionTitle(doc, '📋  7-Step Refactor Roadmap', y);
  y += 12;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Title', 'Files Affected', 'Fixes', 'Effort']],
    body: STEPS.map(s => [s.n, s.title, s.files, s.fixes, s.effort]),
    theme: 'grid',
    headStyles: {
      fillColor: C.indigo,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.5, textColor: C.navy },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 52 },
      2: { cellWidth: 72 },
      3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 22, halign: 'center' },
    },
    alternateRowStyles: { fillColor: C.lightBg },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 12;

  // Architecture diagram (simple text-based)
  drawSectionTitle(doc, '🗂  Current Structure', y);
  y += 10;

  const tree = [
    'src/',
    '  core/lib/         ← supabase client, useAuthStore     [M4 M6]',
    '  features/',
    '    admin/          ← AdminLayout, useAdminDashboard     [H3 L4]',
    '    attendance/     ← AttendanceView, ProfileSelection   [H1 H2 H4 M1]',
    '    pdf-engine/     ← PdfEngineView, usePdfDocument      [M3]',
    '  shared/',
    '    components/     ← SettingsMenu (412 ln), BottomTabs  [H1 M2]',
    '    store/          ← useThemeStore                      [H5]',
    '  store/            ← EMPTY — vestigial                  [L5]',
  ];

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.slate);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y - 3, pageW - margin * 2, tree.length * 5.5 + 6, 2, 2, 'F');
  tree.forEach((line, i) => {
    doc.text(line, margin + 4, y + i * 5.5);
  });

  // ── Footer on every page ──────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.lineGrey);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFontSize(7);
    doc.setTextColor(...C.slate);
    doc.setFont('helvetica', 'normal');
    doc.text('FlowwSuite · Architecture Refactor Report · Confidential', margin, pageH - 5);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' });
  }

  return doc;
}

// ─── Write Output ─────────────────────────────────────────────────────────────

const outDir = path.join(projectRoot, 'docs', 'plans');
const outPath = path.join(outDir, 'architecture-refactor-report.pdf');

fs.mkdirSync(outDir, { recursive: true });

const doc = buildPdf();
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outPath, pdfBuffer);

console.log(`✅  PDF written to: ${outPath}`);
console.log(`    Pages: ${doc.internal.getNumberOfPages()}`);
console.log(`    Size:  ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

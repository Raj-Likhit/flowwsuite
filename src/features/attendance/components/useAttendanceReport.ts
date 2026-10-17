import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { calculateAttendanceMetrics } from '../utils/attendanceCalculations';

export const sanitizeReportFilename = (name: string): string => {
    const cleanName = name
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 50);
    return `${cleanName || 'student'}_attendance_report.pdf`;
};

export const sanitizePdfText = (str: string): string => {
    // Replace WinAnsi-unsupported glyphs with safe ASCII equivalents
    return str
        .replace(/[✓✔]/g, '[OK]')
        .replace(/[⚠⚡]/g, '[!]')
        .replace(/[—–]/g, '-')
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'");
};

export const useAttendanceReport = () => {
    const activeProfile = useAttendanceStore(state => state.activeProfile);

    const generateReport = async () => {
        if (!activeProfile) return;

        try {
            const doc = new jsPDF();
            const { name, attended, total, logs, targetGoal } = activeProfile;
            const goal = targetGoal ?? 75;
            const metrics = calculateAttendanceMetrics(attended, total, goal);

            // ── Header ──────────────────────────────────────────────────
            doc.setFillColor(31, 38, 52);
            doc.rect(0, 0, 210, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Attendance Report', 20, 22);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, 33);

            // ── Student Info ─────────────────────────────────────────────
            doc.setTextColor(31, 38, 52);
            doc.setFontSize(15);
            doc.setFont('helvetica', 'bold');
            doc.text(`Student: ${sanitizePdfText(name)}`, 20, 60);

            // ── Summary Stats ────────────────────────────────────────────
            const statusText = metrics.isSafe ? 'On Track (Safe Zone)' : 'Needs Attention (Danger Zone)';
            const recoveryText = metrics.isSafe
                ? `${metrics.safeToSkip} class${metrics.safeToSkip === 1 ? '' : 'es'}`
                : (metrics.recoveryImpossible ? 'Recovery Impossible' : `${metrics.classesNeeded} class${metrics.classesNeeded === 1 ? '' : 'es'}`);

            autoTable(doc, {
                startY: 70,
                head: [['Metric', 'Value']],
                body: [
                    ['Total Sessions', total.toString()],
                    ['Attended Sessions', attended.toString()],
                    ['Attendance Percentage', `${metrics.percentage.toFixed(1)}%`],
                    ['Target Goal', `${metrics.targetGoal}%`],
                    ['Status', statusText],
                    [metrics.isSafe ? 'Safe to Miss' : 'Classes to Reach Goal', recoveryText],
                ],
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: [80, 80, 100] },
                    1: { halign: 'right' },
                },
            });

            // ── Daily Activity Summary ───────────────────────────────────
            if (logs && logs.length > 0) {
                // Group logs by calendar date (oldest → newest order)
                const dayMap = new Map<string, { attended: number; total: number }>();
                [...logs].reverse().forEach((log) => {
                    const dateKey = new Date(log.timestamp).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    });
                    const existing = dayMap.get(dateKey) ?? { attended: 0, total: 0 };
                    dayMap.set(dateKey, {
                        attended: existing.attended + (log.diffAttended ?? 0),
                        total: existing.total + (log.diffTotal ?? 0),
                    });
                });

                const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? 110;
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(31, 38, 52);
                doc.text('Daily Activity', 20, finalY + 14);

                autoTable(doc, {
                    startY: finalY + 20,
                    head: [['Date', 'Classes Attended', 'Total Classes Added']],
                    body: Array.from(dayMap.entries()).map(([date, delta]) => [
                        date,
                        delta.attended > 0 ? `+${delta.attended}` : String(delta.attended),
                        delta.total > 0 ? `+${delta.total}` : String(delta.total),
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [99, 91, 255], fontStyle: 'bold' },
                    columnStyles: {
                        0: { cellWidth: 65, fontStyle: 'bold', textColor: [80, 80, 100] },
                        1: { halign: 'center' },
                        2: { halign: 'center' },
                    },
                });
            }

            const filename = sanitizeReportFilename(name);
            doc.save(filename);
            return filename;
        } catch (err) {
            console.error('PDF Generation Failed:', err);
            throw new Error('Failed to generate PDF report. Please try again.');
        }
    };

    return { generateReport };
};

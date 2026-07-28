import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAttendanceStore } from '../store/useAttendanceStore';

export const useAttendanceReport = () => {
    const activeProfile = useAttendanceStore(state => state.activeProfile);

    const generateReport = async () => {
        if (!activeProfile) return;

        try {
            const doc = new jsPDF();
            const { name, attended, total, logs, targetGoal } = activeProfile;
            const percentage = total > 0 ? (attended / total) * 100 : 0;
            const goal = targetGoal ?? 75;
            const isOnTrack = percentage >= goal;

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
            doc.text(`Student: ${name}`, 20, 60);

            // ── Summary Stats ────────────────────────────────────────────
            autoTable(doc, {
                startY: 70,
                head: [['Metric', 'Value']],
                body: [
                    ['Total Sessions', total.toString()],
                    ['Attended Sessions', attended.toString()],
                    ['Attendance Percentage', `${percentage.toFixed(1)}%`],
                    ['Target Goal', `${goal}%`],
                    ['Status', isOnTrack ? '✓ On Track' : '⚠ Needs Improvement'],
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

            doc.save(`${name}_attendance_report.pdf`);
        } catch (err) {
            console.error('PDF Generation Failed:', err);
            throw new Error('Failed to generate PDF report. Please try again.');
        }
    };

    return { generateReport };
};

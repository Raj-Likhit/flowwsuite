import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAttendanceStore } from '../store/useAttendanceStore';

export const useAttendanceReport = () => {
    const { activeProfile } = useAttendanceStore();

    const generateReport = async () => {
        if (!activeProfile) return;

        const doc = new jsPDF();
        const { name, attended, total } = activeProfile;
        const percentage = total > 0 ? (attended / total) * 100 : 0;

        // Header
        doc.setFillColor(31, 38, 52); // Indigo-950 approx
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.text('Attendance Report', 20, 25);

        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 150, 25);

        // Profile Info
        doc.setTextColor(31, 38, 52);
        doc.setFontSize(16);
        doc.text(`Student: ${name}`, 20, 60);

        // Main Stats (Summary)
        autoTable(doc, {
            startY: 70,
            head: [['Metric', 'Value']],
            body: [
                ['Total Sessions', total.toString()],
                ['Attended', attended.toString()],
                ['Attendance Percentage', `${percentage.toFixed(1)}%`],
                ['Status', percentage >= 75 ? 'On Track' : 'Needs Improvement'],
            ],
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
        });

        doc.save(`${name}_attendance_report.pdf`);
    };

    return { generateReport };
};

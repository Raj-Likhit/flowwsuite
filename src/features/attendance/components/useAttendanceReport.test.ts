import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAttendanceReport, sanitizeReportFilename, sanitizePdfText } from './useAttendanceReport';
import { useAttendanceStore } from '../store/useAttendanceStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

vi.mock('jspdf', () => {
    return {
        default: vi.fn().mockImplementation(function (this: any) {
            this.setFillColor = vi.fn();
            this.rect = vi.fn();
            this.setTextColor = vi.fn();
            this.setFontSize = vi.fn();
            this.setFont = vi.fn();
            this.text = vi.fn();
            this.addImage = vi.fn();
            this.save = vi.fn();
            this.lastAutoTable = { finalY: 100 };
            return this;
        }),
    };
});

vi.mock('jspdf-autotable', () => ({
    default: vi.fn(),
}));

describe('useAttendanceReport (Issue #27)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAttendanceStore.setState({
            activeProfile: {
                id: 'p1',
                name: 'Jane Doe',
                attended: 18,
                total: 20,
                targetGoal: 75,
                logs: [
                    { id: 'l1', timestamp: 1600000000000, title: 'Class 1', diffAttended: 1, diffTotal: 1 },
                ],
            },
        });
    });

    describe('sanitizeReportFilename', () => {
        it('cleans special characters and spaces from filenames', () => {
            expect(sanitizeReportFilename('Jane Doe')).toBe('Jane_Doe_attendance_report.pdf');
            expect(sanitizeReportFilename('Student / Name? *')).toBe('Student_Name_attendance_report.pdf');
            expect(sanitizeReportFilename('')).toBe('student_attendance_report.pdf');
            expect(sanitizeReportFilename('___Alex___')).toBe('Alex_attendance_report.pdf');
        });
    });

    describe('sanitizePdfText', () => {
        it('replaces unencodable WinAnsi Unicode symbols with safe ASCII equivalents', () => {
            expect(sanitizePdfText('Status: ✓ Passed')).toBe('Status: [OK] Passed');
            expect(sanitizePdfText('Warning: ⚠ Needs attention')).toBe('Warning: [!] Needs attention');
            expect(sanitizePdfText('Dash: — Test')).toBe('Dash: - Test');
        });
    });

    describe('generateReport', () => {
        it('creates a jsPDF document and saves it with a sanitized filename', async () => {
            const { result } = renderHook(() => useAttendanceReport());
            const filename = await result.current.generateReport();

            expect(filename).toBe('Jane_Doe_attendance_report.pdf');
            expect(jsPDF).toHaveBeenCalled();
            expect(autoTable).toHaveBeenCalled();
        });

        it('returns early when activeProfile is null', async () => {
            useAttendanceStore.setState({ activeProfile: null });
            const { result } = renderHook(() => useAttendanceReport());
            const res = await result.current.generateReport();

            expect(res).toBeUndefined();
            expect(jsPDF).not.toHaveBeenCalled();
        });

        it('handles non-Latin names like Telugu/Hindi with canvas-based rendering', async () => {
            useAttendanceStore.setState({
                activeProfile: {
                    id: 'p2',
                    name: 'రాజేష్ (Rajesh)',
                    attended: 10,
                    total: 10,
                    targetGoal: 75,
                },
            });
            const { result } = renderHook(() => useAttendanceReport());
            const filename = await result.current.generateReport();

            expect(filename).toBe('Rajesh_attendance_report.pdf');
            expect(jsPDF).toHaveBeenCalled();
        });
    });
});

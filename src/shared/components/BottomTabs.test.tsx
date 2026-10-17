import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';

describe('BottomTabs', () => {
    it('renders tabs with Attendance active when on /attendance route', () => {
        render(
            <MemoryRouter initialEntries={['/attendance']}>
                <BottomTabs />
            </MemoryRouter>
        );

        const attendanceLink = screen.getByRole('link', { name: 'Attendance' });
        const pdfLink = screen.getByRole('link', { name: 'PDF Studio' });

        expect(attendanceLink).toHaveAttribute('aria-current', 'page');
        expect(pdfLink).not.toHaveAttribute('aria-current');
        expect(attendanceLink.className).toContain('text-primary-300');
    });

    it('renders tabs with PDF Studio active when on /pdf-engine route', () => {
        render(
            <MemoryRouter initialEntries={['/pdf-engine']}>
                <BottomTabs />
            </MemoryRouter>
        );

        const attendanceLink = screen.getByRole('link', { name: 'Attendance' });
        const pdfLink = screen.getByRole('link', { name: 'PDF Studio' });

        expect(pdfLink).toHaveAttribute('aria-current', 'page');
        expect(attendanceLink).not.toHaveAttribute('aria-current');
        expect(pdfLink.className).toContain('text-primary-300');
    });
});

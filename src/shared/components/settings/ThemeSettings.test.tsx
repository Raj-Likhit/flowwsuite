import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSettings } from './ThemeSettings';

describe('ThemeSettings', () => {
    it('renders all 4 theme options and highlights current theme', () => {
        const setTheme = vi.fn();
        render(<ThemeSettings currentTheme="indigo" setTheme={setTheme} />);

        expect(screen.getByText('Interface Theme')).toBeInTheDocument();
        expect(screen.getByText('Indigo Dream')).toBeInTheDocument();
        expect(screen.getByText('Cyberverse')).toBeInTheDocument();
        expect(screen.getByText('Solar Flare')).toBeInTheDocument();
        expect(screen.getByText('Ethereal Nature')).toBeInTheDocument();

        // Indigo button has active styles
        const indigoBtn = screen.getByText('Indigo Dream').closest('button');
        expect(indigoBtn?.className).toContain('bg-white/10');
    });

    it('calls setTheme when another theme is clicked', () => {
        const setTheme = vi.fn();
        render(<ThemeSettings currentTheme="indigo" setTheme={setTheme} />);

        const cyberverseBtn = screen.getByText('Cyberverse').closest('button');
        fireEvent.click(cyberverseBtn!);

        expect(setTheme).toHaveBeenCalledWith('obsidian');
    });
});

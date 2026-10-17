import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import GlassSurface from './GlassSurface';

describe('GlassSurface', () => {
    let mockObserve: any;
    let mockDisconnect: any;

    beforeEach(() => {
        mockObserve = vi.fn();
        mockDisconnect = vi.fn();

        global.ResizeObserver = class {
            observe = mockObserve;
            unobserve = vi.fn();
            disconnect = mockDisconnect;
            constructor(callback: any) {
                // Simulate initial call
                setTimeout(() => callback([]), 0);
            }
        } as any;
    });

    it('renders children with default props and fallback class', async () => {
        render(
            <GlassSurface>
                <span>Glass Content</span>
            </GlassSurface>
        );

        expect(screen.getByText('Glass Content')).toBeInTheDocument();
        expect(mockObserve).toHaveBeenCalled();
    });

    it('handles custom dimensions, radius, and displacement props', async () => {
        const { container } = render(
            <GlassSurface
                width="350px"
                height={120}
                borderRadius={24}
                distortionScale={-200}
                redOffset={5}
                greenOffset={15}
                blueOffset={25}
                displace={2}
                className="custom-glass"
            >
                <span>Styled Glass</span>
            </GlassSurface>
        );

        const surface = container.querySelector('.glass-surface');
        expect(surface).toBeInTheDocument();
        expect(surface?.className).toContain('custom-glass');
        expect(surface).toHaveStyle({ width: '350px', height: '120px', borderRadius: '24px' });

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
        });
    });

    it('detects SVG filter support when backdropFilter is supported', () => {
        const originalUserAgent = navigator.userAgent;
        Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
            configurable: true
        });

        // Mock document.createElement('div').style.backdropFilter
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            const el = originalCreateElement(tagName);
            if (tagName === 'div') {
                let bf = '';
                Object.defineProperty(el.style, 'backdropFilter', {
                    get: () => bf,
                    set: (v) => { bf = v; },
                    configurable: true
                });
            }
            return el;
        });

        const { container } = render(
            <GlassSurface>
                <span>SVG Filtered Glass</span>
            </GlassSurface>
        );

        expect(container.querySelector('.glass-surface')).toBeInTheDocument();

        Object.defineProperty(navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true
        });
    });

    it('falls back on Safari/Firefox user agent', () => {
        const originalUserAgent = navigator.userAgent;
        Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
            configurable: true
        });

        const { container } = render(
            <GlassSurface>
                <span>Fallback Glass</span>
            </GlassSurface>
        );

        expect(container.querySelector('.glass-surface--fallback')).toBeInTheDocument();

        Object.defineProperty(navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true
        });
    });
});

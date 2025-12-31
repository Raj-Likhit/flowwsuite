# ConvertFlow

> **Secure, Client-Side Image to PDF Converter**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.x-cyan.svg)
![Vite](https://img.shields.io/badge/vite-5.x-yellow.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

ConvertFlow is a high-performance, privacy-focused web application that converts images to PDF entirely within your browser. No files are ever uploaded to a server.

## Features

- **100% Client-Side**: Powered by WebAssembly and Web Workers. Your data never leaves your device.
- **Ultra-Modern UI**: Glassmorphism aesthetic, Bento-grid layout, and framer-motion animations.
- **Ironclad Performance**: 
  - **Multi-Threaded**: Images are processed in parallel using a pool of Workers.
  - **GPU Accelerated**: Image rendering uses `OffscreenCanvas` and `createImageBitmap` for blazing speed.
  - **Memory Efficient**: Zero-copy transfer with `ArrayBuffer` and rigorous blob cleanup.
- **Mobile First**:
  - **Thumb-Zone Action Bar**: Critical controls within easy reach.
  - **Touch Sensors**: Smart drag-and-drop that respects scrolling.
  - **Responsive**: Adapts from mobile dual-grid to desktop power-station.
- **Format Support**: JPG, PNG, and HEIC (Apple Photos).

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **State Management**: Zustand
- **PDF Generation**: jsPDF (custom stream implementation)
- **Drag & Drop**: @dnd-kit/core

## Quick Start

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/convertflow.git
    cd convertflow
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start development server**
    ```bash
    npm run dev
    ```

4.  **Build for production**
    ```bash
    npm run build
    ```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

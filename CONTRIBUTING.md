# Contributing to Flowwsuite

We love your input! We want to make contributing to Flowwsuite as easy and transparent as possible, whether it's:

-   **Reporting a bug**
-   **Discussing the current state of the code**
-   **Submitting a fix**
-   **Proposing new features**

---

## 🛠️ GitHub Flow

We use [GitHub Flow](https://guides.github.com/introduction/flow/index.html), so all code changes happen through Pull Requests:

1.  **Fork the repo** and create your branch from `main`.
2.  **Ensure consistency**:
    -   Use **Conventional Commits** (e.g., `feat: Add support for AVIF`).
    -   Follow the **Feature-based** folder structure located in `src/features/`. All feature logic (like `admin`, `attendance`, `pdf-engine`) must be isolated.
    -   **Performance Guidelines**: Flowwsuite is optimized for `<50ms` DOMContentLoaded times. Any new heavy dependencies (e.g. Canvas libraries, PDF utilities) MUST be dynamically imported (`React.lazy`) and separated into dedicated chunks in `vite.config.ts`.
3.  **Test your changes**:
    -   If you've added code that should be tested, add tests.
    -   Ensure the test suite passes.
    -   **Performance Test**: Run `node benchmark.js` after adding new dependencies to ensure the SPA initial load remains under 50ms.
4.  **Lint your code**: Run `npm run lint` before submitting.
5.  **Submit your Pull Request** (PR) through the GitHub interface.

---

## 🛡️ Coding Standards

-   **TypeScript**: All new code must be written in TypeScript with proper typing. Avoid `any` where possible.
-   **React Patterns**: Prefer functional components and hooks.
-   **Styling**: Use utility-first CSS with **Tailwind CSS**. Avoid inline styles.
-   **Accessibility**: All UI components must follow WCAG 2.1 accessibility guidelines.

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 🔍 Bug Reports

**Great Bug Reports** tend to have:
-   A quick summary and/or background.
-   Steps to reproduce.
-   What you expected would happen.
-   What actually happened.
-   Sample code or screenshots if applicable.

Report bugs using GitHub's [issue tracker](https://github.com/Raj-Likhit/convertfloww/issues).

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

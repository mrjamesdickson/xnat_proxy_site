# Repository Guidelines

This project delivers a React + TypeScript interface for XNAT instances. Follow these expectations to ship changes that are easy to review and deploy.

## Project Structure & Module Organization
Source lives in `src/`; feature modules sit in `src/components` and share contexts and providers under `src/contexts` and `src/providers`. API calls centralize in `src/services/xnat-api.ts`, while styling utilities live alongside components using Tailwind classes. Static assets reside in `public/`, and configuration baselines (Vite, Tailwind, ESLint) sit at the repo root.

## Build, Test, and Development Commands
- `npm run dev` — start the Vite dev server at http://localhost:5173 with API proxying.
- `npm run build` — type-check with `tsc -b` and emit the production bundle.
- `npm run preview` — serve the latest production build for smoke testing.
- `npm run lint` — run ESLint across the codebase; fixes should be applied before opening a PR.

## Coding Style & Naming Conventions
Use modern React with functional components, hooks, and TypeScript types. Stick to the existing file layout (`PascalCase` for components, `camelCase` for helpers). Keep Tailwind class lists readable by grouping related utilities. Prettier is not configured; rely on ESLint + TypeScript diagnostics to guide formatting.

## Testing Guidelines
Automated tests are not yet wired into the toolchain. When adding them, colocate specs under `src/` (e.g., `src/components/__tests__/Component.test.tsx`) and register a `npm test` script. Until then, validate user flows manually in the preview build and document noteworthy scenarios in PR descriptions.

## Commit & Pull Request Guidelines
Follow the existing history: concise, imperative commit summaries (e.g., “Add API explorer docs”). Reference issue IDs when available. Pull requests must state scope, testing evidence (manual steps or planned automation), and include screenshots or GIFs for UI changes. Request review from a maintainer familiar with the affected XNAT feature area.

## Security & Configuration Tips
Never commit live XNAT credentials or JSESSIONID cookies. Environment variables must use the `VITE_` prefix and be supplied through `.env.local` files that stay untracked. Update `vite.config.ts` if a new proxy target is required and call it out during review.

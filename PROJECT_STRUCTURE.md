# Project Structure

## Runtime Entry Points

- The browser app starts at `index.html`, which loads `src/main.tsx` and `src/App.tsx`. That app is currently the Floate AI operations/admin suite. Keep its active frontend components and browser API clients under `src/`.
- Root `App.tsx` is a separate marketplace storefront implementation, but it is not loaded by the current `index.html` entry point.
- The backend starts at the root `server.ts`. The `dev`, `build`, and `start` scripts in `package.json` use this server entry point.
- Backend HTTP routes are in root `routes/`; search controllers are in root `controllers/`; server integrations and helpers are in root `services/`, `config/`, and `middleware/`.
- The backend imports some shared utilities from `src/utils/`, so that directory is currently used by both runtime sides.

## Overlapping Directories

- Root `App.tsx` and `main.tsx` are parallel frontend entry files; the current `index.html` does not load them. Root `App.tsx` also has unresolved imports, so it is not included in the active TypeScript check.
- Both root `bot/` and `src/bot/` contain overlapping modules. Backend routes use root `bot/`, while frontend components import selected modules from `src/bot/`, including credential data and types.
- Root and `src/` also contain overlapping `routes/`, `services/`, and other folders. Do not remove or move these as a group without checking imports and deployment scripts first.

## Safe Editing Rule

Keep the current runtime split: frontend in `src/`, backend at the root. Before removing or relocating a file, check its imports and the `package.json` build/start commands. The duplicate-looking trees are not all interchangeable.
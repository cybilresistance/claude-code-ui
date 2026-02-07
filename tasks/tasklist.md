# Cleanup Task List

> **Last updated:** 2025-02-07 — Removed completed phases (1–6), renumbered remaining items.

Ordered by dependency, risk level, and impact. Complete top-to-bottom.

---

## Phase 1: Break Up Oversized Files (Higher Risk)

### 1.1 Refactor `Chat.tsx` (~1,176 lines)

- [ ] Extract SSE streaming logic into `frontend/src/hooks/useChatStream.ts`
- [ ] Extract session status polling into `frontend/src/hooks/useSessionStatus.ts`
- [ ] Extract chat header into `frontend/src/components/ChatHeader.tsx`
- [ ] Extract message list rendering into `frontend/src/components/MessageList.tsx`
- [ ] Extract in-flight message display into `frontend/src/components/InFlightMessage.tsx`
- [ ] Extract new-chat welcome screen into `frontend/src/components/NewChatWelcome.tsx`
- [ ] Deduplicate the two in-flight message UI blocks

### 1.2 Refactor `routes/chats.ts`

- [ ] Extract `parseMessages()` into `backend/src/services/message-parser.ts`
- [ ] Extract `discoverSessionsPaginated()` into `backend/src/services/session-discovery.ts`
- [ ] Extract `readJsonlFile()` into `backend/src/utils/jsonl.ts`
- [ ] Move git caching into the git service (see Phase 2.1)

### 1.3 Refactor `routes/stream.ts`

- [ ] Extract title generation logic into `backend/src/services/title-generator.ts`
- [ ] Extract image metadata storage into image-storage service
- [ ] Extract CLI file watcher logic into `backend/src/services/cli-watcher.ts`
- [ ] Use SSE helpers

---

## Phase 2: Performance Improvements (Medium-High Risk)

### 2.1 Backend Performance

- [ ] Replace blocking `execSync` in `routes/chats.ts:70` with async `execFile` or `readdir` ⏳ **REVIEW LATER**
- [ ] Move git info fetching to a service with TTL-based caching
- [ ] Add in-memory cache with TTL to `ChatFileService.getAllChats()` (invalidate on write)
- [ ] Replace `readdirSync` + `find()` in `image-storage.ts:getImage()` with a lookup map
- [ ] Replace synchronous file I/O in `slashCommands.ts` with async equivalents
- [ ] Replace `execSync` in `utils/git.ts` with async `execFile`
- [ ] Replace `statSync` per-file calls in `folder-service.ts:browseDirectory()` and `getRecentFolders()` with async alternatives
- [ ] Create a shared `__dirname` helper for the remaining 2 files (`index.ts:7,73` and `swagger.ts:5`) that still need module-relative `__dirname`

### 2.2 Frontend Performance

- [ ] Replace full `getMessages()` refetch on every SSE `message_update` with incremental/delta updates
- [ ] Add a batched `/api/sessions/status` endpoint to replace N parallel `getSessionStatus()` calls in ChatList
- [ ] Add debounce to resize listener in `hooks/useIsMobile.ts`
- [ ] Memoize `remarkPlugins`, `rehypePlugins`, `components` arrays in `MarkdownRenderer.tsx`
- [ ] Cache `getValidationMessage()` result in `FolderSelector.tsx` to avoid double-call
- [ ] Implement tiered interval in `useRelativeTime.ts` (5s for <60s, 30s for <60m) to reduce re-renders from dozens of concurrent 5-second intervals

---

## Phase 3: Security Hardening (Variable Risk)

### 3.1 Critical

- [ ] Restrict CORS `origin` to specific allowed domain(s) in production (currently `origin: true`) ⏳ **REVIEW LATER** — mitigated by authentication requirement
- [ ] Add path allowlist to folder browsing service (currently unrestricted filesystem access) ⏳ **REVIEW LATER** — mitigated by authentication requirement

### 3.2 Important

- [ ] Add `secure: true` flag to session cookie in production (`backend/src/auth.ts`) ⏳ **REVIEW LATER**
- [ ] Remove `storagePath` from API responses in `image-storage.ts` (leaks server paths)
- [ ] Fix `sanitizeBranchForPath()` (`utils/git.ts`) — handle `\`, `?`, `*`, `:` characters and prevent collision between `feature/foo` and `feature-foo`
- [ ] Fix `ensureWorktree` TOCTOU race condition (`utils/git.ts`) — make check+create atomic

### 3.3 Maintenance

- [ ] Add periodic cleanup or TTL to the rate limit `Map` in `auth.ts` ⏳ **REVIEW LATER**
- [ ] Set explicit body size limit with `express.json({ limit: '1mb' })` in `index.ts`
- [ ] Add JSON schema validation for `metadata` fields parsed via `JSON.parse()`

---

## Phase 4: API Design Standardization (Medium Risk)

- [ ] Define a standard success envelope: `{ success: true, data: T }` and apply across all routes
- [ ] Define a standard error envelope: `{ success: false, error: string, details?: unknown }` and apply across all routes
- [ ] Replace `error: any` in all catch blocks with proper type narrowing (`error instanceof Error`)
- [ ] Add `.catch()` handlers to all fire-and-forget async calls (e.g., `generateAndSaveTitle()` at `stream.ts`)
- [ ] Make `generateAndSaveTitle()` invocation consistent — currently fire-and-forget in `POST /new/message` but `await`ed in `POST /:id/message`
- [ ] Audit and remove all empty `catch {}` blocks — log errors or handle them properly
- [ ] Fix images router double-mount — mount only on `/api/images`, update frontend calls accordingly

---

## Phase 5: Build & Config Cleanup (Low Risk)

- [ ] Add comments to `tsconfig.json` files explaining different `target` choices (ES2022 vs ES2020)
- [ ] Narrow lint-staged glob from `*.{ts,tsx}` to `{frontend,backend}/**/*.{ts,tsx}` for performance
- [ ] Standardize monospace font stack across all components (currently 4 different stacks)
- [ ] Extract all inline `style={{}}` objects to module-level constants or CSS classes (especially BranchSelector.tsx with ~20 inline styles)
- [ ] Evaluate whether `prebuild: npm run swagger` should be a soft dependency (warning, not failure) to prevent swagger issues from blocking builds

---

## Phase 6: Final Verification

- [ ] Run `npm run lint:all` and fix any new warnings
- [ ] Run `npm run build` and verify clean compilation
- [ ] Verify all frontend pages load correctly
- [ ] Verify SSE streaming still works end-to-end
- [ ] Verify queue processing still works
- [ ] Verify image upload/display still works
- [ ] Verify branch selector / worktree creation works end-to-end
- [ ] Run production build and smoke test with `npm run redeploy:prod`

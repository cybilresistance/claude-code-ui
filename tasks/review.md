# Full Architectural Review: Claude Code UI

## Table of Contents
1. [Dead Code](#1-dead-code)
2. [Duplicate Code](#2-duplicate-code)
3. [Inefficient Code](#3-inefficient-code)
4. [Security Concerns](#4-security-concerns)
5. [API Design Issues](#5-api-design-issues)
6. [Architectural Issues](#6-architectural-issues)
7. [Styling Issues](#7-styling-issues)
8. [Type Safety Issues](#8-type-safety-issues)
9. [Configuration Issues](#9-configuration-issues)

---

## 1. Dead Code

### Entire Unused Files
| File | Lines | Notes |
|------|-------|-------|
| `frontend/src/hooks/useStream.ts` | 87 | Never imported anywhere. Chat.tsx implements SSE inline |
| `frontend/src/components/ScheduleModal.tsx` | 161 | Never imported. DraftModal.tsx handles scheduling instead |

### Unused Backend Exports
| Function | File | Line |
|----------|------|------|
| `getAllSessions()` | `backend/src/services/sessions.ts` | 101 |
| `getTotalChats()` | `backend/src/services/chat-file-service.ts` | 194 |
| `getImagesDir()` | `backend/src/services/image-storage.ts` | 203 |
| `getAllDirectoriesWithSlashCommands()` | `backend/src/services/slashCommands.ts` | 79 |
| `removeSlashCommandsForDirectory()` | `backend/src/services/slashCommands.ts` | 87 |

### Unused Frontend Functions/Imports
| Item | File | Notes |
|------|------|-------|
| `stopChat()` | `frontend/src/api.ts:123` | Chat.tsx makes its own inline fetch |
| `createChat()` | `frontend/src/api.ts:77` | Chat creation uses `/new/message` now |
| `getImageUrl()` | `frontend/src/api.ts:186` | Never called |
| `getSlashCommands()` | `frontend/src/api.ts:266` | Imported in Chat.tsx but never invoked |
| `clearFolderCache()` | `frontend/src/api/folders.ts:91` | Never called |
| `clearAllRecentDirectories()` | `frontend/src/utils/localStorage.ts:111` | Never called |
| `ChevronDown` import | `frontend/src/pages/Chat.tsx:3` | Unused icon import |
| `useMemo` import | `frontend/src/pages/ChatList.tsx:1` | Imported but never used |
| `ChatListResponse` type import | `frontend/src/pages/ChatList.tsx:4` | Imported but never used |
| `FolderOpen`, `File` imports | `frontend/src/components/FolderBrowser.tsx:2` | Icons imported but unused |
| `StoredImage` interface | `frontend/src/components/ImageUpload.tsx:4-11` | Defined locally but never referenced |

### Unreachable Backend Route
| Route | File | Issue |
|-------|------|-------|
| `GET /upcoming/next-hour` | `backend/src/routes/queue.ts:166` | **BUG**: Registered after `/:id` -- Express matches `upcoming` as an `:id` parameter. This route is never reachable. |

---

## 2. Duplicate Code

### Cross-File Duplications (Backend)

| What | Location A | Location B | Impact |
|------|-----------|-----------|--------|
| `findSessionLogPath()` | `routes/chats.ts:24-31` | `routes/stream.ts:17-26` | Identical function duplicated |
| `CLAUDE_PROJECTS_DIR` constant | `routes/chats.ts:12` | `routes/stream.ts:12` | Same `join(homedir(), '.claude', 'projects')` |
| `findChat()` / `findChatForStatus()` | `routes/chats.ts:397-450` | `routes/stream.ts:31-44` | Same lookup pattern |
| SSE event handler pattern | `routes/stream.ts:127-152` | `routes/stream.ts:225-242` & `300-316` | Same handler logic repeated **3 times** |
| SSE header block | `routes/stream.ts:119-123` | `routes/stream.ts:219-223` & `292-296` | Same 5-line writeHead block **3 times** |
| Image loading loop | `routes/stream.ts:93-108` | `routes/stream.ts:179-207` | Same iteration over imageIds |
| `updateChatWithImages()` / `storeMessageImages()` | `routes/images.ts:175-200` | `routes/stream.ts:258-285` | Near-identical metadata storage |
| Git info fetch pattern | `routes/chats.ts` | Lines 76, 312, 347, 409, 429 | Same try/catch block **5 times** (cache used only once) |
| `__dirname` computation | 6 service files | All compute `dirname(fileURLToPath(import.meta.url))` separately |
| `migratePermissions()` | `backend/services/claude.ts:90-109` | `frontend/utils/localStorage.ts:13-35` | Same migration logic in both ends |

### Cross-File Duplications (Frontend)

| What | Location A | Location B |
|------|-----------|-----------|
| `Plugin` type definitions | `frontend/src/api.ts:9-26` | `frontend/src/types/plugins.ts:1-18` |
| `getCommandDescription()` | `SlashCommandAutocomplete.tsx:125-134` | `SlashCommandsModal.tsx:14-32` |
| `getMinDateTime()` | `DraftModal.tsx:65-69` | `Queue.tsx:375` (inline) |
| `activePlugins` localStorage logic | `SlashCommandsModal.tsx:51-66` | `Chat.tsx:459-480` |
| In-flight message UI block | `Chat.tsx:950-979` | `Chat.tsx:1021-1051` |
| Modal overlay pattern | `ConfirmModal`, `DraftModal`, `ScheduleModal`, `Queue`, `FolderBrowser`, `SlashCommandsModal` | Same 10-line style block in **6 components** |

### Cross-Boundary Duplications (Backend <-> Frontend)

Every shared type is manually duplicated with no single source of truth:

| Type | Backend | Frontend | Divergence |
|------|---------|----------|------------|
| `DefaultPermissions` | `services/claude.ts:75-82` | `api.ts:68-75` + `localStorage.ts:3-11` | 3 copies, consistent |
| `Plugin/PluginCommand/PluginManifest` | `services/plugins.ts:4-21` | `api.ts:11-39` + `types/plugins.ts:1-30` | 3 copies |
| `Chat` | `chat-file-service.ts:14-22` | `api.ts:41-51` | Frontend has extra fields (`title`, `session_ids`) |
| `ParsedMessage` | `routes/chats.ts:540-548` | `api.ts:53-66` | Frontend expects `tool_use_id`, `is_error`, `citations` not produced by backend |
| `StoredImage` | `image-storage.ts:13-23` | `api.ts:157-164` | Backend has `chatId`, `sha256` fields frontend omits |
| `QueueItem` | `queue-file-service.ts:22` | `api.ts:200` | Backend uses `any` for `defaultPermissions` |
| `FolderItem/BrowseResult/ValidateResult` | `folder-service.ts:4-36` | `api/folders.ts:3-37` | Identical copy-paste |
| `StreamEvent` | `services/claude.ts:24-33` | `hooks/useStream.ts:4-8` | Frontend missing 5 fields |
| `SlashCommand` | `services/slashCommands.ts:5-10` | `api.ts:3-9` | Identical |

---

## 3. Inefficient Code

### Backend Performance Issues

| Issue | File:Line | Severity | Detail |
|-------|-----------|----------|--------|
| **Blocking `execSync`** for chat listing | `routes/chats.ts:99` | **HIGH** | `find \| xargs \| ls` shell pipeline runs synchronously, blocking the Node event loop |
| **Full directory scan per image retrieval** | `image-storage.ts:116` | MEDIUM | `readdirSync` + `find()` on every `getImage()` call; also recomputes SHA256 hash every time |
| **No caching in ChatFileService** | `chat-file-service.ts:27-53` | MEDIUM | `getAllChats()` reads+parses every JSON file from disk on every request |
| **No caching in slashCommands** | `slashCommands.ts` | LOW | Reads/writes JSON file synchronously on every call |
| **O(n*m) scan to remove one image** | `routes/images.ts:205-235` | MEDIUM | `removeImageFromAllChats()` reads ALL chat files, parses ALL metadata |
| **O(n) fallback in `getChat()`** | `chat-file-service.ts:56-87` | LOW | Falls back to reading every JSON file if filename lookup fails |
| **Queue self-HTTP calls** | `queue-processor.ts:55-62` & `routes/queue.ts:118-146` | MEDIUM | Makes HTTP requests to localhost instead of calling service functions directly |
| **Synchronous `appendFileSync` debug logging** | `services/claude.ts:11-22` | LOW | Blocks I/O; runs in production |
| **Synchronous `execSync` for git info** | `utils/git.ts:31-52` | LOW | Two synchronous process spawns with 5s timeouts; cached in only 1 of 5 call sites |

### Frontend Performance Issues

| Issue | File:Line | Severity | Detail |
|-------|-----------|----------|--------|
| **Refetch ALL messages on every SSE update** | `Chat.tsx:248` | **HIGH** | Every `message_update` event triggers a full `getMessages()` HTTP request |
| **Triple fetch on `message_complete`** | `Chat.tsx:211-221` | MEDIUM | `getChat()`, `getMessages()`, `loadSlashCommands()` all fire simultaneously |
| **N parallel status requests** | `ChatList.tsx:42-51` | MEDIUM | Up to 20 `getSessionStatus()` calls fired at once with `Promise.all`; no batched endpoint |
| **No debounce on resize listener** | `hooks/useIsMobile.ts` | LOW | `setState` on every resize event |
| **`getValidationMessage()` called twice** | `FolderSelector.tsx:176-180` | LOW | Called for truthiness check, then again for display |
| **MarkdownRenderer creates new arrays every render** | `MarkdownRenderer.tsx` | LOW | `remarkPlugins`, `rehypePlugins`, `components` not memoized -- triggers re-renders |
| **Queue tab counts filter full array 6 times** | `Queue.tsx:93-100` | LOW | Should be a single reduce pass |

---

## 4. Security Concerns

| Issue | File:Line | Severity |
|-------|-----------|----------|
| **CORS allows any origin with credentials** | `index.ts:22` -- `cors({ origin: true, credentials: true })` | **HIGH** |
| **No path restriction on folder browsing** | `routes/folders.ts` + `folder-service.ts` -- authenticated users can browse `/etc`, `/root`, etc. | **HIGH** |
| **Queue processor bypasses auth** | `queue-processor.ts:58` -- has explicit TODO acknowledging this | **HIGH** |
| **Missing `secure` flag on session cookie** | `auth.ts:54-59` -- cookie sent over HTTP too | MEDIUM |
| **Rate limit map grows unbounded** | `auth.ts:17-19` -- entries never cleaned up | LOW |
| **Server filesystem paths leaked in API responses** | `image-storage.ts:92` -- `storagePath` returned to client | LOW |
| **No body size limit explicitly set** | `index.ts:24` -- relies on Express 100KB default | LOW |
| **Image ID not sanitized before filesystem lookup** | `image-storage.ts:118` -- potential directory traversal | LOW |

---

## 5. API Design Issues

| Issue | Location | Detail |
|-------|----------|--------|
| **Images router double-mounted** | `index.ts:36-37` | Mounted on both `/api/images` and `/api/chats`, creating ambiguous routes |
| **Inconsistent success envelopes** | All routes | Mix of `{ ok: true }`, `{ success: true }`, `{ success: true, message: '...' }` |
| **Inconsistent error envelopes** | All routes | Some use `{ error }`, others `{ error, details }` |
| **`error: any` in all catch blocks** | All routes | No proper error type narrowing |
| **Silent error swallowing** | 15+ empty `catch {}` blocks | Many real errors hidden behind `try {} catch {}` |
| **Fire-and-forget async without `.catch()`** | `stream.ts:135` | `generateAndSaveTitle()` errors are completely lost |
| **Metadata JSON parsed without validation** | 8+ locations | `JSON.parse(chat.metadata \|\| '{}')` -- no schema validation |

---

## 6. Architectural Issues

### Oversized Files
| File | Lines | Recommended Action |
|------|-------|--------------------|
| `frontend/src/pages/Chat.tsx` | **~1,160** | Extract SSE hook, session management hook, sub-components for header, message list, in-flight message, new-chat welcome |
| `backend/src/routes/chats.ts` | **617** | Extract `parseMessages()`, `discoverSessionsPaginated()`, `readJsonlFile()`, git caching into services |
| `backend/src/routes/stream.ts` | **466** | Extract SSE helpers, title generation, image metadata storage, CLI file watcher into services |

### No Shared Types Package
The single biggest architectural issue. Every type is manually duplicated between `frontend/` and `backend/` with no shared `types/` or `shared/` package. This is the root cause of at least **10 type inconsistencies**.

### Inconsistent Data Directory Resolution
| Service | Strategy | Risk |
|---------|----------|------|
| `sessions.ts` | `__dirname + '../../../data'` -> project root `/data/` | Different root than other services |
| `chat-file-service.ts` | `__dirname + '../../data/chats'` -> `backend/data/chats/` | OK |
| `slashCommands.ts` | `process.cwd() + '/data'` -> depends on working dir | **Fragile** -- depends on working directory at startup |

### Debug Logging in Production
- `backend/src/services/claude.ts:11-22`: Writes to `logs/slash-commands-debug.log` with synchronous `appendFileSync` unconditionally
- `backend/src/routes/stream.ts`: ~15 `console.log('[DEBUG]...')` statements with request bodies, image data
- `backend/src/services/image-storage.ts`: 5 `console.log('[DEBUG]...')` lines in `getImage()`

---

## 7. Styling Issues

### Undefined CSS Variables
These are referenced in inline styles but **never defined** in `index.css`:

| Variable | Files Using It | Impact |
|----------|---------------|--------|
| `--bg-secondary` | **11 files** | All backgrounds using this resolve to transparent |
| `--font-mono` | 3 files | Falls through to browser default |
| `--error` | PermissionSettings | **No fallback** -- property invalid |
| `--border-light` | PermissionSettings | **No fallback** -- property invalid |
| `--text-secondary` | Chat.tsx | No fallback |

### Other Styling Issues
- **6 modal components** each re-implement the same fullscreen overlay pattern (~10 lines each) -- no shared `<ModalOverlay>` component
- **4 different monospace font stacks** used across components
- **Identical `.hljs` media query rules** for dark and light mode in `index.css` (lines 136-154)
- **All inline `style={{}}`** -- new objects created on every render, no hover/focus pseudo-class support, no reuse

---

## 8. Type Safety Issues

- **`any` types** used in 15+ locations across frontend and backend (API return types, catch blocks, request bodies)
- **Non-null assertions (`!`)**: 12+ instances of `streamChatId!` and `id!` in Chat.tsx
- **`addToBacklog()` is a trivial wrapper** around `createDraft()` with misleading naming (`api.ts:261-264`)

---

## 9. Configuration Issues

| Issue | File | Detail |
|-------|------|--------|
| **Wrong hardcoded path** | `ecosystem.config.cjs:6` | `cwd: '/home/exedev/claude-code-ui'` -- should be `/home/cybil/` |
| **start-server.js ignores ecosystem.config** | `start-server.js` | Runs `pm2 start` with inline args, bypassing the config file entirely |
| **`@types/multer` in dependencies** | `package.json:25` | Should be in `devDependencies` |
| **Redundant root `tsc` in build script** | `package.json:8` | Root tsc does nothing useful; backend tsc runs separately |

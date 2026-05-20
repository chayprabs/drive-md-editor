# MarkDrive Final Production Readiness Audit

**Branch:** `final/production-readiness-audit`  
**Commit:** `0703a63` (`docs(release): add final production readiness audit report`)  
**Audited:** 2026-05-20  
**Auditor role:** Final integration owner / release auditor (evidence-based)

## 1. Agent branches reviewed

| Branch | Commits ahead of `main` (at audit start) | Decision |
| --- | --- | --- |
| `origin/agent/release-drive-readiness` | 14 | **Integrated** — OAuth/live QA docs, Drive error routing, find/replace UX, strikethrough, offline alarms, release validators |
| `origin/agent/ui-polish` | 17 | **Integrated** — Visual workbench CSS, Drive URL hardening, conflict modal polish, toolbar a11y, GFM strikethrough in preview |
| `origin/agent/file-type-support` | 16 | **Integrated** — `.md`/`.markdown`/`.mdown`/`.txt`/`.json` with invariants; HTML explicitly rejected in docs |
| `origin/agent/quality-invariants` | 17 | **Not merged separately** — Subset already included via `file-type-support` (offline/quality gates, CRLF helpers) |
| `origin/feat/long-run-improvements` | 9 | **Rejected** — Strict subset of commits already present after integrating the agent branches above |

### Integration method

Agent work was squashed into one conventional commit on top of `main`:

- `chore(release): integrate agent branches and fix Windows invariant reads` (`ce380b0`)

Additional fix on audit branch (not present on agent branches alone):

- **Windows CRLF:** Invariant scripts use `readSource()` / `normalizeNewlines()` so `pnpm check` passes on Windows.

## 2. What was rejected and why

| Item | Reason |
| --- | --- |
| `feat/long-run-improvements` | Duplicate of already-integrated agent commits |
| `agent/quality-invariants` as separate merge | Covered by `file-type-support` integration |
| HTML file type expansion | Intentionally unsupported (XSS/sandbox risk) per `docs/file-type-support.md` |
| `v1.0.0` tag | Not created — release verification and live QA evidence incomplete |

### “Relaxed” invariant commits (`ef697da`, `0258ff4`)

Updated editor/search **lint matchers** to match actual find-replace/toolbar markup. They do not weaken `pnpm release:verify` or runtime behavior.

## 3. Requirements checklist

| Area | Status | Evidence |
| --- | --- | --- |
| Branding | **Complete** | `pnpm lint:branding` passed |
| Stack | **Complete** | `pnpm lint:stack`, `tsc --noEmit` |
| Drive / editor / preview / export | **Complete** (automated) | All module lint scripts in `pnpm check` |
| File types | **Complete** | `pnpm lint:files`; `docs/file-type-support.md` |
| Docs | **Complete** | `pnpm lint:docs`; OAuth + live QA guides |
| Production OAuth in build | **Externally blocked** | No production client id in this environment |
| Live Drive QA evidence | **Externally blocked** | No `release/live-drive-verification.json`; no `output/live/` |
| Module tags at HEAD | **Externally blocked** | `module/*` tags exist but not at release HEAD |
| Live UI in real Drive | **Not performed** | Requires human tester |
| `v1.0.0` | **Not created** | See §7 |

## 4. Commands run and results

| Command | Result |
| --- | --- |
| `pnpm install` | Pass |
| `pnpm build` | Pass |
| `pnpm check` | **Pass** |
| `pnpm release:verify` | **Fail** — OAuth, live evidence, module tags @ HEAD only |
| `git diff --check` | Pass |
| Placeholder scan in `src/` | No matches |

## 5. GitHub Actions status

**No GitHub Actions workflows** are defined in this repository (`.github/workflows` absent; GitHub API reports `total_count: 0`). Local `pnpm check` is the CI equivalent used for this audit.

## 6. `pnpm release:verify` result

Failed with expected external blockers:

1. `MARKDRIVE_OAUTH_CLIENT_ID` not production  
2. `dist/manifest.json` OAuth mismatch  
3. Missing `release/live-drive-verification.json`  
4. Module tags not at HEAD  

## 7. Whether `v1.0.0` was tagged

**No.** Requires production OAuth build, live QA evidence, and `pnpm release:verify` exit 0.

## 8. Known risks

- Live Drive flows not verified in this audit session  
- Mermaid chunk large but lazy-loaded; total bundle 4.80 MB  
- Expanded file types need live QA for non-`.md` paths  

## 9. Remaining human steps

1. Complete [docs/oauth-setup.md](./oauth-setup.md)  
2. Run [docs/live-qa-guide.md](./live-qa-guide.md); fill `release/live-drive-verification.json` and `output/live/`  
3. `pnpm release:verify` with production `MARKDRIVE_OAUTH_CLIENT_ID`  
4. Tag `v1.0.0` only when verify passes  
5. Merge `final/production-readiness-audit` → `main` after CI green  

## 10. Recommended next action

Complete live Drive QA, re-run `release:verify`, then merge and tag.

---

*No fabricated OAuth credentials or live QA evidence were added.*

# Rehaul Milestone Backlog (Milestone B/C)

This backlog converts current goals into strict milestones with percentage targets, checkbox tasks, and clear exit criteria.

## Scope split

- **Milestone B:** Tailwind migration completion + mobile UI QA hardening.
- **Milestone C:** Page editor workflow completion (edit, preview, save, validate).
- **Out of scope here:** job-search-api work (tracked in separate repo).

## Progress baseline

- Milestone A (portfolio finish implementation): **completed**.
- Milestone B current progress: **55%**.
- Milestone C current progress: **20%**.

---

## Milestone B — Tailwind + Mobile Hardening (Target: 100%)

### B1. Tailwind migration cleanup (Target: +30%)

- [x] Remove global utility remap conflicts in `assets/css/custom.css`.
- [x] Deduplicate repeated `@media (max-width: 768px)` blocks (phase 1) into consolidated sections.
- [ ] Scope remaining theme overrides to page-level selectors only.
- [ ] Remove legacy overrides that conflict with `tailwind-built.css`.
- [ ] Verify no regression in nav/header/footer across pages.

### B2. Mobile breakpoint QA matrix (Target: +20%)

- [ ] Test width `360` on core pages.
- [ ] Test width `390` on core pages.
- [ ] Test width `414` on core pages.
- [ ] Test width `768` on core pages.
- [ ] Test width `820` on core pages.
- [ ] Test width `1024` on core pages.
- [ ] Capture defects page-wise and patch in small commits.

### B3. Theme/token stability pass (Target: +10%)

- [ ] Normalize text contrast and background tokens across pages.
- [ ] Remove one-off color hacks where proper token rules exist.
- [ ] Verify dark/light parity on `homepage`, `skills`, `about`, `project`, `contact`, `resume`.

### B4. Mobile performance polish (Target: +5%)

- [ ] Confirm image sizing strategy (`srcset`/`sizes`) on featured and project cards.
- [ ] Verify tap-to-load behavior for heavy embeds still works after CSS cleanup.
- [ ] Validate no new layout shift from breakpoint refactors.

### Milestone B exit criteria

- [ ] No high-impact conflicting legacy mobile blocks remain in active CSS paths.
- [ ] QA matrix complete for all target widths and key pages.
- [ ] Theme contrast is stable and readable in light/dark on core pages.
- [ ] `docs/MOBILE_UI_UPDATE_CYCLE.md` updated with final closure notes.

---

## Milestone C — Page Editor Workflow (Target: 100%)

### C1. Core editor flow (Target: +35%)

- [ ] Finalize section/block edit flow for supported content types.
- [ ] Add live preview panel sync for edits.
- [ ] Add explicit save action with success/failure messaging.
- [ ] Preserve non-edited content safely when saving.

### C2. Validation + guardrails (Target: +25%)

- [ ] Add required field checks before save.
- [ ] Add content structure validation (expected IDs/sections).
- [ ] Prevent malformed data from writing to production files.
- [ ] Add basic rollback path or change snapshot file.

### C3. Usability + reliability (Target: +20%)

- [ ] Improve editor UX labels/help text for non-technical updates.
- [ ] Add loading, empty, and error states where missing.
- [ ] Verify mobile usability for basic editor actions.
- [ ] Ensure theme parity in editor UI.

### C4. Documentation + handover (Target: +20%)

- [ ] Update admin/editor docs with final workflow and limits.
- [ ] Add "safe update steps" checklist for content updates.
- [ ] Add quick troubleshooting section for common failures.
- [ ] Record milestone completion in workspace memory summary.

### Milestone C exit criteria

- [ ] Edit -> Preview -> Save works reliably for supported pages.
- [ ] Validation blocks unsafe writes and provides actionable messages.
- [ ] Docs allow future updates without re-discovering workflow.

---

## Execution cadence

- One focused patch per push.
- Update checklist status after each push.
- Keep commits reason-focused.
- Keep job-search-api planning and tasks isolated in its own repo tracker.

## Suggested next 3 pushes

1. Run breakpoint QA matrix pass 1 and patch high-severity regressions.
2. Complete Tailwind scope cleanup for remaining page-level override debt.
3. Start C1 editor flow finalization (preview + save reliability).

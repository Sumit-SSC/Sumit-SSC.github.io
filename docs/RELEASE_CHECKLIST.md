# Release Checklist (Mobile + Desktop)

Use this checklist before pushing portfolio updates live.

---

## 1) Data safety checks (2 minutes)

From repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release_guardrail.ps1
```

This runs content validation, image audit, structure checks, and quick git state in one go.

---

## 2) Local smoke test (5 minutes)

Start local server:

```powershell
python -m http.server 8000
```

Open and verify:

- `http://localhost:8000/index.html`
- `http://localhost:8000/pages/homepage.html`
- `http://localhost:8000/pages/project.html?id=ai-governance-workbench`
- `http://localhost:8000/pages/about.html`
- `http://localhost:8000/pages/resume.html`

---

## 3) UX checks

### Landing / transition

- `index.html` loads first.
- Auto transition to homepage happens after animation delay.
- `?landing=1` keeps landing page without redirect.

### Mobile readability

- About timeline cards readable and not edge-crowded.
- Project article text comfortable (line-height and heading spacing).
- Resume embeds fit viewport and controls are tappable.

### Media loading

- PDF/Video/Power BI/Streamlit show **tap-to-load** placeholder first.
- Clicking **Load now** renders embed/video correctly.
- Gallery first image appears fast; remaining images lazy-load.

---

## 4) Analytics sanity check

Open:

- `https://sumit.indevs.in/pages/homepage.html?analytics_debug=1`

Confirm in console/network:

- analytics init log appears
- visit event POST is attempted to configured endpoint

Dashboard spot-check:

- `site=portfolio` shows portfolio events
- `site=analytics-lab` shows playground/resources events

---

## 5) Performance quick check

Run one mobile Lighthouse/PageSpeed test on:

- `https://sumit.indevs.in/pages/homepage.html`
- `https://sumit.indevs.in/pages/about.html`

Look for regressions in:

- LCP
- CLS
- Total Blocking Time

---

## 6) Final git checks

```powershell
git status
git log -5 --oneline
```

- working tree clean
- commit messages clear and stage-scoped


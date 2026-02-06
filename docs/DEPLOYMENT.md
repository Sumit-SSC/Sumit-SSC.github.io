# Deploy to GitHub Pages – Step-by-Step

Follow these steps to deploy the portfolio so it’s ready for production.

---

## 1. Final checks (local)

1. **Run a local server** (so `data/projects.json` and `data/case_studies.json` load correctly):
   ```bash
   python -m http.server 8000
   ```
   Then open **http://localhost:8000** in your browser.

2. **Click through:**
   - **Home** (`index.html`) – dashboard, featured projects, “All projects”, “Case Studies” toggle.
   - **Resume**, **Skills**, **About**, **Contact** (all under `pages/`).
   - At least one **featured project**: e.g. `pages/project.html?id=ai-governance-workbench`.
   - At least one **case study** from the Case Studies view.

3. **Optional:** Run the verification script (PowerShell, from repo root):
   ```powershell
   ./scripts/verify_portfolio.ps1
   ```

4. **JSON:** Ensure `data/projects.json` and `data/case_studies.json` have no syntax errors (e.g. validate at [jsonlint.com](https://jsonlint.com) or use an editor that validates JSON).

---

## 2. Commit and push

```bash
git add .
git status
git commit -m "Portfolio ready for deploy"
git push origin main
```

(Use `master` if that’s your default branch.)

---

## 3. Enable GitHub Pages

1. Open your repo on **GitHub**.
2. Go to **Settings** → **Pages** (under “Code and automation”).
3. Under **Build and deployment**:
   - **Source:** Deploy from a branch.
   - **Branch:** `main` (or `master`) → **/ (root)**.
4. Click **Save**.
5. Wait 1–2 minutes. The site will be available at:
   - `https://<your-username>.github.io/<repo-name>/`  
   or, if the repo is named `<username>.github.io`:
   - `https://<your-username>.github.io/`

---

## 4. Custom domain (optional)

The repo includes a **CNAME** file (e.g. `www.sumit.indevs.in`).

1. In **Settings** → **Pages**, under **Custom domain**, enter your domain (e.g. `www.sumit.indevs.in`).
2. Click **Save**.
3. In your DNS provider, add a **CNAME** record pointing your (sub)domain to `<username>.github.io` (or to the repo’s Pages URL as per GitHub’s instructions).
4. Wait for DNS to propagate; GitHub will show a green “DNS check successful” when ready.

---

## 5. After deploy

- Open the live URL and repeat the same click-through as in step 1 (dashboard, pages, project detail, case studies).
- If something fails (e.g. 404, blank page), check:
  - **Console** (F12) for JS or network errors.
  - That **paths** are correct: from root we use `assets/`, `data/`, `pages/`; from `pages/` we use `../assets/`, `../data/`.
- Optional: add the live URL to **README** or **docs/TODO.md** for quick reference.

---

**Summary:** Commit → push → Settings → Pages → choose branch + root → Save. Optionally set custom domain and DNS. Then verify the live site.

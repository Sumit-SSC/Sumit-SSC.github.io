# Projects section – to-do list

## As a whole (portfolio-wide)

| # | Task | Status | Notes |
|---|------|--------|--------|
| 1 | **4 icon buttons on every project card** | Done | GitHub, Streamlit, Notebook, More show on every card; missing URLs render as greyed/disabled so layout is consistent. |
| 2 | **Featured project pages: word count (~3k–5k)** | Done | The 4 flagship project HTML pages (AI Governance, Fraud, E‑commerce, Churn) are expanded to the full 13-section structure (Executive Summary, Business Context, Data Landscape, Metrics/KPIs, Analytical Approach, AI/Automation, Observations, Trade-offs, Business Impact, Recommendations, Limitations, Future Scope, Related Work, Conclusion) and read as long-form, Medium-style case studies. |
| 3 | **Ensure project cards use same 4-button row everywhere** | Done | Both “Featured” grid and “All projects” list use the same 4-button row (View + GitHub, Streamlit, Notebook, More) via `createDashboardProjectCard` and `createDashboardProjectList`. |

---

## Other projects (below featured)

There are **15 non-featured projects** in `data/projects.json`. Only the 4 featured ones have a `content_path` (HTML file). The rest are **JSON-only**: their detail page is built from `full_description`, `problem_statement`, `approach`, `insights`, etc. in JSON.

| # | Project id | content_path | Pending for this project |
|---|------------|--------------|---------------------------|
| 1 | used-car-price | None | See “Pending (all other projects)” below. |
| 2 | customer-churn | None | Same. |
| 3 | sales-bi-dashboard | None | Same. |
| 4 | ab-testing | None | Same. |
| 5 | oil-spill-classification | None | Same. |
| 6 | car-features-impact | None | Same. |
| 7 | llm-augmented-analytics | None | Same. |
| 8 | analytics-engineering-data-contracts | None | Same. |
| 9 | netflix-recommendation-analytics | None | Same. |
| 10 | spotify-playlist-discovery-analytics | None | Same. |
| 11 | airline-dynamic-pricing-analytics | None | Same. |
| 12 | bank-fraud-patterns-analytics | None | Same. |
| 13 | loan-credit-default-bfsi | None | Same. |
| 14 | logistics-quick-commerce-analytics | None | Same. |
| 15 | healthcare-analytics-ml | None | Same. |

### Pending for all “other” projects (below featured)

| # | Task | Priority | Notes |
|---|------|----------|--------|
| 1 | **4 buttons on cards** | Done | Same as portfolio-wide: every card (including these 15) shows the 4 icon buttons; missing URLs render as greyed/disabled. |
| 2 | **Fill URLs in `projects.json`** | Medium | **Done** – Added notebook_url and media_notes to all 15; used-car and oil-spill have real links. Add more URLs in JSON as you have them. |
| 3 | **Expand non-featured JSON content** | Medium | **Done** – All 15 have expanded full_description, problem_statement, approach, insights (~1–1.5k words each). |
| 4 | **Optional: HTML long-form pages** | Low | Optional – Add data/projects/<id>.html and content_path for any non-featured project you want as a long case study. |
| 5 | **Thumbnails and images** | Low | **Done** – All 15 have thumbnail and images[] set. |
---

## Summary

- **Portfolio-wide:** 4 buttons on every card; 4 flagship project HTML pages expanded to ~3k–5k words with 13-section structure. **Done.**
- **Other projects:** 4-button treatment; URLs and media_notes added where missing; JSON content expanded to ~1–1.5k words each; thumbnails and images set. **Done.** Optional: add more real URLs or HTML long-form pages as needed.

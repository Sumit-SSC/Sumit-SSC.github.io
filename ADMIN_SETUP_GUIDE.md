# Cloudflare Worker & Visual Editor Setup Guide

This guide explains how to deploy, configure, and update your site-wide Notion/Medium-style visual editor and dynamic stats panel.

---

## 🚀 Quick Setup Instructions

### Option 1: Manual Copy-Paste (No Terminal Needed)
1. Open [cloudflare-worker/admin-api/src/index.js](file:///w:/CodeBase/Resume-Projects/sumit-personal-site/Sumit-SC.github.io/cloudflare-worker/admin-api/src/index.js), select all, and copy it.
2. Go to your **Cloudflare Dashboard ➔ Workers & Pages ➔ Select your Worker**.
3. Click the **"Quick Edit"** button in the top-right corner.
4. Replace the entire code editor content with the copied code and click **"Save and Deploy"**.

### Option 2: Deploy via Wrangler CLI
1. Open a terminal on your computer.
2. Run these commands:
   ```bash
   cd w:\CodeBase\Resume-Projects\sumit-personal-site\Sumit-SC.github.io\cloudflare-worker\admin-api
   npx wrangler login
   npx wrangler deploy
   ```

---

## ⚙️ Cloudflare Environment Variables

To bind your Worker with your GitHub account, go to **Cloudflare Dashboard ➔ select your Worker ➔ Settings ➔ Variables**, and configure these environment variables:

| Variable Name | Example Value (Active) | Rationale |
| :--- | :--- | :--- |
| `ALLOWED_GITHUB_USERS` | `Sumit-SSC` | GitHub usernames allowed to access edit mode |
| `GITHUB_REPO_OWNER` | `Sumit-SSC` | Owner of the target repository |
| `GITHUB_REPO_NAME` | `Sumit-SSC.github.io` | Name of the target repository |
| `CONTENT_BASE_BRANCH` | `feature/portfolio-polish-and-content` | Branch to fetch stats and load commits |
| `ADMIN_SUCCESS_REDIRECT` | `https://admin.sumit.indevs.in/admin/index.html` | Page to load after successful OAuth login |

---

## 🔄 Dynamic Username/Repo Renaming

Because we implemented a **Dynamic Configuration Decoupling System**, you **never** need to modify HTML files in your repository when you rename your GitHub account or repository.

If you change your GitHub username or move the repo:
1. Go to your **Cloudflare Dashboard ➔ select your Worker ➔ Settings ➔ Variables**.
2. Edit the values of `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, and `ALLOWED_GITHUB_USERS` to match your new details.
3. Save and deploy.
4. Refresh your portfolio pages (a hard refresh `Ctrl+F5` / `Cmd+Shift+R` may be needed). The Giscus comment board, contribution widgets, and profiles will fetch the new settings from the Worker API and update instantly!

---

## 🛡️ Secrets (GitHub API access)

If you rename your account, ensure your GitHub token (`GITHUB_TOKEN_FOR_CONTENT_WRITES`) has write permissions to your new repository path:
1. Generate a classic developer token on GitHub with `repo` scopes.
2. In your Cloudflare Worker Settings under **Secrets**, update the value of `GITHUB_TOKEN_FOR_CONTENT_WRITES` to this new token.

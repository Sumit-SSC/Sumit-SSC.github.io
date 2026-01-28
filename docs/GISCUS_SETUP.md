# Giscus Setup Guide

This guide will help you set up Giscus comments on your portfolio project pages.

## What is Giscus?

Giscus is a free, open-source comments system powered by GitHub Discussions. It's lightweight, privacy-friendly, and perfect for developer portfolios.

**Benefits:**
- ✅ 100% free (no ads)
- ✅ Uses GitHub Discussions as backend
- ✅ Supports reactions (👍, ❤️, etc.)
- ✅ Replies and threading
- ✅ GitHub notifications
- ✅ Lightweight and fast

## Step-by-Step Setup

### Step 1: Enable GitHub Discussions

1. Go to your GitHub repository: `https://github.com/Sumit-SC/Sumit-SC.github.io`
2. Click on **Settings** (top right)
3. Scroll down to **Features** section
4. Check the box next to **Discussions**
5. Click **Set up discussions** (if prompted)
6. Choose a category name (e.g., "General" or "Project Comments")
7. Click **Start discussion**

### Step 2: Install Giscus App

1. Go to **https://github.com/apps/giscus**
2. Click **Install** or **Configure**
3. Select your repository: `Sumit-SC/Sumit-SC.github.io`
4. Choose **Only select repositories** and select your repo
5. Click **Install**

### Step 3: Get Your Configuration Values

1. Go to **https://giscus.app**
2. Fill in the form with these settings:
   - **Repository**: Enter `Sumit-SC/Sumit-SC.github.io`
   - **Discussion Category**: Select the category you created in Step 1 (usually "General" or "Announcements")
   
   **Important - Look for "Page ↔️ Discussions Mapping" section:**
   - Select the option: **"Discussion title contains a specific term"** 
     (This might also be labeled as "Specific" or "Specific term" depending on the interface)
   - In the **"Specific Term"** field, enter: `project-`
     (Don't worry, we'll append the project ID dynamically in the code)
   
   **Other Settings:**
   - **Features**: 
     - ✅ Enable reactions
     - ✅ Enable input position toggle (optional)
   - **Theme**: Choose your preferred theme (light/dark - it will auto-switch with your site)
   - **Language**: English

3. Scroll down to see the **generated script tag** with your configuration
4. Copy these two important values from the script tag:
   - `data-repo-id` (looks like: `R_kgDO...` or `R_kgD...`)
   - `data-category-id` (looks like: `DIC_kwDO...` or `DIC_kwD...`)

**Note**: The term field in the form is just a placeholder. Our code will dynamically set it to `project-{projectId}` for each page.

### Step 4: Update project.html

1. Open `project.html` in your editor
2. Find the Giscus script tag (around line 110-120)
3. Replace these placeholders:
   - `REPO_ID_PLACEHOLDER` → Your `data-repo-id` value
   - `CATEGORY_ID_PLACEHOLDER` → Your `data-category-id` value

**Example:**
```html
<script src="https://giscus.app/client.js"
    data-repo="Sumit-SC/Sumit-SC.github.io"
    data-repo-id="R_kgDOAbc123"  <!-- Replace this -->
    data-category="General"
    data-category-id="DIC_kwDOXyz456"  <!-- Replace this -->
    ...
```

### Step 5: Test It

1. Open a project page: `http://localhost:8000/project.html?id=used-car-price`
2. Scroll down to the "Comments & Discussion" section
3. You should see the Giscus widget
4. Click **"Sign in with GitHub"** to test commenting

## How It Works

- **Each project gets its own discussion thread** based on the project ID
- **Discussion term format**: `project-{projectId}`
  - Example: `project-used-car-price`
- **Theme automatically switches** when you toggle light/dark mode
- **Comments are stored** in your GitHub Discussions (visible in your repo)

## Troubleshooting

### "Discussion not found" error
- Make sure Discussions are enabled in your repo settings
- Verify the category ID matches your Discussions category
- Check that the mapping is set to "Specific discussions"

### Comments not appearing
- Check browser console for errors (F12)
- Verify repo-id and category-id are correct
- Make sure Giscus app is installed on your repository

### Theme not switching
- The theme should auto-detect based on your site's dark mode toggle
- You can manually set `data-theme="light"` or `data-theme="dark"` in the script tag

## Viewing Comments

Comments appear in two places:
1. **On your project pages** (via Giscus widget)
2. **In GitHub Discussions** (go to your repo → Discussions tab)

## Managing Comments

- **Moderate**: Go to GitHub Discussions → Find the discussion → Edit/Delete as needed
- **Notifications**: You'll get GitHub notifications when someone comments
- **Reactions**: Visitors can react with 👍, ❤️, 🎉, etc.

## Need Help?

- Giscus Docs: https://github.com/giscus/giscus
- Giscus Configuration: https://giscus.app
- GitHub Discussions Docs: https://docs.github.com/en/discussions

---

**Note**: After setup, each project page will automatically create a new discussion thread when someone first comments. The discussion title will be based on the project ID (e.g., "project-used-car-price").

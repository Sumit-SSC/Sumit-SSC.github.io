# Giscus Setup - Visual Walkthrough

## Step-by-Step with Screenshots Guide

### Step 1: Go to giscus.app

Visit: **https://giscus.app**

You'll see a configuration form with several fields.

---

### Step 2: Fill in Repository Information

**Field 1: Repository**
```
Sumit-SC/Sumit-SC.github.io
```
- Enter your GitHub username and repo name
- Format: `username/repository-name`

---

### Step 2: Select Discussion Category

**Field 2: Discussion Category**
- Click the dropdown
- Select the category you created when enabling Discussions
- Common options: "General", "Announcements", or "Q&A"
- If you haven't created one yet, go back to GitHub repo Settings → Features → Discussions and create a category first

---

### Step 3: Find the Mapping Option ⭐ (This is what you're looking for!)

**Look for a section labeled:**
- **"Page ↔️ Discussions Mapping"** OR
- **"Mapping"** OR  
- **"How should discussions be linked to pages?"**

**You should see options like:**
- [ ] Pathname
- [ ] URL
- [ ] Title
- [ ] **Discussion title contains a specific term** ← **SELECT THIS ONE**
- [ ] Number (specific discussion number)

**Select: "Discussion title contains a specific term"**

---

### Step 4: Enter the Term

**After selecting "specific term", you'll see a new field:**

**Field: Specific Term**
```
project-
```
- Enter exactly: `project-` (with the dash)
- Don't worry about the project ID - our code adds it automatically
- This tells Giscus to look for discussions with titles like `project-used-car-price`, `project-churn-analytics`, etc.

---

### Step 5: Configure Other Settings

**Features Section:**
- ✅ **Enable reactions** (check this)
- ✅ **Enable input position toggle** (optional, but recommended)

**Theme:**
- Choose "Light" or "Dark" (doesn't matter - it auto-switches with your site)

**Language:**
- Select "English"

---

### Step 6: Get Your IDs

**Scroll down** below the form. You'll see a code block that looks like:

```html
<script src="https://giscus.app/client.js"
        data-repo="Sumit-SC/Sumit-SC.github.io"
        data-repo-id="R_kgDOAbc123Xyz"          ← COPY THIS
        data-category="General"
        data-category-id="DIC_kwDOXyz456Abc"    ← COPY THIS
        data-mapping="specific"
        data-term="project-"
        ...>
</script>
```

**Copy these two values:**
1. `data-repo-id` value (starts with `R_kgDO...`)
2. `data-category-id` value (starts with `DIC_kwDO...`)

---

### Step 7: Update project.html

Open `project.html` and find these lines (around line 115-116):

```html
data-repo-id="REPO_ID_PLACEHOLDER"
data-category-id="CATEGORY_ID_PLACEHOLDER"
```

Replace:
- `REPO_ID_PLACEHOLDER` → Your `data-repo-id` value
- `CATEGORY_ID_PLACEHOLDER` → Your `data-category-id` value

---

## Still Can't Find It?

If you don't see the "Mapping" option:

1. **Try a different browser** (Chrome, Firefox, Edge)
2. **Clear browser cache** and refresh
3. **Check the URL** - make sure you're on `https://giscus.app` (not an old version)
4. **Look for these alternative labels:**
   - "Discussion mapping"
   - "Page mapping"
   - "Link discussions to pages"
   - A dropdown with options including "specific" or "term"

---

## Alternative: Manual Configuration

If the form doesn't show the mapping option, you can manually configure it:

1. Fill in Repository and Category
2. Copy the `repo-id` and `category-id` from the generated script
3. In `project.html`, make sure these attributes are set:
   - `data-mapping="specific"` ✅ (already set)
   - `data-term="project-{projectId}"` ✅ (dynamically set by our code)
   - `data-strict="0"` ✅ (allows auto-creation)

The code in `project.html` already handles the dynamic term assignment, so even if you can't set it in the form, it will work!

---

## Quick Test

After updating `project.html`:

1. Open: `http://localhost:8000/project.html?id=used-car-price`
2. Scroll to "Comments & Discussion"
3. You should see the Giscus widget
4. When you post the first comment, it will automatically create a discussion titled `project-used-car-price` in your GitHub Discussions

# 📝 Document Editor

A lightweight, form + JSON hybrid editor for portfolio content. Designed to replace complex block-editor interfaces with simple document-style editing.

## Features

✨ **What makes it different from the block editor:**
- **Document-first**: Edit like Google Docs/Notion—no weird block paradigms
- **Dual-view**: Form fields + raw JSON side-by-side (pick your style)
- **Zero friction**: Select file → edit → save draft locally
- **Dark mode**: Built-in theme toggle
- **Live JSON validation**: See errors as you type
- **Export support**: Download edited JSON anytime

## Supported Files

| File | Purpose | Preview |
|------|---------|---------|
| `projects.json` | All portfolio projects | List with titles + IDs |
| `case_studies.json` | Case study entries | List with descriptions |
| `homepage-content.json` | Homepage intro blocks | Editor blocks view |
| `homepage-ui.json` | Section titles | Section metadata |

## How to Use

### 1. Open the Editor
```
/admin/simple-doc-editor.html
```

### 2. Select a Document
Click any file in the left panel. The editor will:
- Load the JSON from the server
- Show form fields (if available for that file type)
- Display a preview
- Populate raw JSON on the right

### 3. Edit Content
**Option A: Form Fields**
- For structured data (projects, case studies), some fields are displayed
- Edit directly in input fields

**Option B: Raw JSON**
- Click the JSON editor on the right
- Edit directly with full control
- See validation errors in real-time

### 4. Save Your Work
- Click **💾 Save Draft** to save locally (localStorage)
- Changes are NOT published to the site until you push via GitHub

### 5. Export
- Click **Export** to download JSON file with timestamp
- Useful for backups or bulk editing

### 6. Reset
- Click **Reset** to discard changes and reload the file

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save draft (future) |
| `Ctrl+Z` | Undo (via browser) |
| `Tab` | Navigate form fields |

## JSON Structure Examples

### Projects
```json
[
  {
    "id": "ai-governance-workbench",
    "title": "AI Governance Workbench",
    "short_description": "Streamlit workbench...",
    "tools": ["Python", "Streamlit"],
    ...
  }
]
```

### Case Studies
```json
[
  {
    "id": "fraud-detection-system",
    "title": "Fraud Detection & Risk",
    "problem_statement": "...",
    "approach": "...",
    ...
  }
]
```

### Homepage Content (Editor Blocks)
```json
{
  "editor_content": {
    "time": 1743648000000,
    "version": "2.30.7",
    "blocks": [
      {
        "type": "header",
        "data": { "text": "Project Title", "level": 2 }
      }
    ]
  },
  "updated_at": "2026-04-03T00:00:00.000Z"
}
```

## Tips & Tricks

### Editing Large Arrays
For files with many items (e.g., 20+ projects):
1. Use Export → download JSON
2. Edit in VS Code with better search/replace
3. Copy-paste back into the editor

### Validation
- JSON errors show in the status bar (red)
- Valid JSON shows ✓ (green)
- Save is disabled if JSON is invalid

### Dark Mode
- Click the 🌙 button in top-right
- Theme persists across sessions (localStorage)

### LocalStorage Drafts
- Drafts save to browser localStorage
- **NOT synced** to server automatically
- To publish: Push to GitHub via your usual workflow

## Roadmap

Future improvements:
- [ ] Syntax highlighting in JSON editor (CodeMirror)
- [ ] Undo/Redo with Ctrl+Z
- [ ] Search/Replace in JSON
- [ ] Direct publish button (requires backend)
- [ ] Import from GitHub drafts
- [ ] Batch edit multiple files
- [ ] Live preview of rendered content

## What's NOT Included

❌ **Not covered** (still using the block editor for these):
- Visual block editing (still complex)
- Collaborative editing
- Version history
- Publishing workflow (use GitHub directly)

## Migration Notes

If coming from the complex block editor (`editor.html`):

| Old Way | New Way |
|---------|---------|
| Block-by-block UI | Form + JSON |
| Preview in iframe | Preview in panel |
| Publish workflow | Manual GitHub push |
| Complex form | Simple fields + raw JSON |

The new editor is **lighter** but **less visual**. You get form fields for common operations and raw JSON for power users.

## Troubleshooting

**Q: JSON won't save?**
A: Check the JSON status (top-right). If red, fix the syntax error first.

**Q: Where's my draft?**
A: Saved to browser localStorage. Check DevTools → Application → LocalStorage.

**Q: How do I publish changes?**
A: Export the JSON, commit it to GitHub, and push. The site rebuilds on push.

**Q: Can I edit multiple files at once?**
A: Not in this version. Select one file, make changes, export, then move to the next.

---

Built for portfolio maintenance. Questions? Check the main docs in `/docs`.

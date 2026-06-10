# ✨ Rich Content Editor (Medium-Style)

A **full-featured rich editor** designed to edit portfolio content like Medium or blog platforms. Click anywhere, type, format, drag to reorder, add/remove blocks.

## 🎯 What Makes It Different

| Feature | Old Block Editor | JSON Form Editor | **Rich Editor** |
|---------|------------------|------------------|-----------------|
| **Medium-style editing** | ❌ | ❌ | ✅ Click-anywhere typing |
| **Drag-to-reorder** | ❌ | ❌ | ✅ Native drag support |
| **Rich formatting** | Limited | No | ✅ Bold, italic, heading, lists |
| **Add/remove blocks** | Complex | No | ✅ One-click add/remove |
| **New entries** | No | No | ✅ Create projects inline |
| **Publish workflow** | Complex | Manual | ✅ localStorage drafts |
| **Visual familiarity** | No | No | ✅ Like Medium |

---

## 🚀 Getting Started

### Open the Editor
```
/admin/rich-editor.html
```

### Basic Workflow
1. **Left sidebar**: Select content type (Projects, Case Studies, Homepage)
2. **Middle area**: Click entry to edit OR create new one
3. **Rich editor**: Click anywhere → type → format
4. **Right sidebar**: See properties, delete, format options
5. **Save**: Click 💾 Save or drafts auto-save to localStorage

---

## 📝 How to Use

### 1. Select Content Type
Left sidebar has three options:
- 🗂️ **Projects** - Edit portfolio projects
- 📚 **Case Studies** - Edit case study entries
- 🏠 **Homepage Content** - Edit homepage intro blocks

### 2. Select or Create Entry
- **Select existing**: Click any entry in the list
- **Create new**: Click "+ New Entry" button

### 3. Edit Content
**Just like Medium:**
- Click anywhere in the content area → start typing
- Select text → format toolbar appears
- Press Enter for new paragraph
- Type "/" for block commands (future)

### 4. Format Text
**Right sidebar formatting options:**
- **H1** - Main heading (32px, bold)
- **H2** - Subheading (24px, bold)
- **H3** - Section title (20px)
- **Paragraph** - Normal text (16px)
- **Quote** - Italic quote with left border
- **Code** - Monospace code block
- **Bullet List** - Unordered list
- **Numbered List** - Ordered list

**How to apply formatting:**
1. Select text in editor
2. Click format button in right panel
3. Or use keyboard shortcuts (future)

### 5. Add Blocks
- **+ Add block** button appears between paragraphs
- Click to insert new paragraph
- Type content immediately

### 6. Reorder Blocks
**Drag to reorder** (coming soon):
- Hover over block → grab handle appears
- Drag up/down to reorder

### 7. Delete Blocks
**Delete individual block:**
- Right-click block (future) or click trash icon
- Or select block + press Delete

**Delete entire entry:**
- Click **🗑️ Delete Entry** in right sidebar

### 8. Save & Publish

**Save to localStorage (draft):**
- Click 💾 **Save** button
- Changes saved locally
- Status shows "✓ Saved to draft"

**To publish to site:**
1. **Export JSON** - Click "Export JSON" button
2. **Commit to GitHub** - Push the JSON file
3. **Site rebuilds** - Automatic on push

---

## 🎨 Editor Layout

### Three-Column Layout (Desktop)
```
[LEFT]           [CENTER]          [RIGHT]
Files & entries  Rich editor       Properties
                                   & formatting
```

### Responsive (Tablet/Mobile)
- Center (editor) takes full width
- Left/right sidebars collapse
- Formatting in compact toolbar

---

## 💡 Tips & Tricks

### Power User Moves
1. **Export + edit elsewhere** → Export JSON → edit in VS Code → copy-paste back
2. **Bulk create entries** → Create in batch, then refine titles
3. **Draft recovery** → Saved to localStorage even if browser crashes
4. **Keyboard navigation** → Tab through fields, Enter to create new

### Formatting Shortcuts (Future)
```
Cmd/Ctrl + B    Bold (when implemented)
Cmd/Ctrl + I    Italic (when implemented)
Cmd/Ctrl + K    Link (when implemented)
```

### Visibility
- **Dark mode** - Click 🌙 button top-right, persists across sessions
- **Word count** - Bottom right shows live word count
- **Status indicator** - Green dot = saved, "●" = unsaved

---

## 🔄 Data Flow

```
[JSON on server]
        ↓
  [Load to memory]
        ↓
  [Edit inline (contenteditable)]
        ↓
  [localStorage draft saved]
        ↓
  [Export JSON]
        ↓
  [Push to GitHub]
        ↓
  [Site rebuilds with new content]
```

---

## 📊 Supported Content Types

### Projects
```json
{
  "id": "project-id",
  "title": "Project Title",
  "short_description": "Brief description",
  "full_description": "Detailed description",
  "problem_statement": "The problem...",
  "approach": "How we solved it...",
  "insights": "Key learnings...",
  "tools": ["Tool1", "Tool2"],
  ...
}
```

### Case Studies
```json
{
  "id": "case-study-id",
  "title": "Case Study Title",
  "short_description": "Brief description",
  "problem_statement": "...",
  "approach": "...",
  "insights": "...",
  ...
}
```

### Homepage Content
```json
{
  "editor_content": {
    "blocks": [
      { "type": "header", "data": { "text": "...", "level": 2 } },
      { "type": "paragraph", "data": { "text": "..." } },
      ...
    ]
  },
  "updated_at": "2026-04-03T..."
}
```

---

## ⚙️ Advanced Features (Roadmap)

### Coming Soon
- [ ] Drag-to-reorder blocks (grab handle)
- [ ] Keyboard shortcuts (Cmd+B for bold, etc.)
- [ ] Slash commands (/heading, /image, /code)
- [ ] Link insertion and preview
- [ ] Image upload from editor
- [ ] Undo/Redo with Ctrl+Z
- [ ] Collaborative mentions (@user)
- [ ] Revision history (LocalStorage snapshots)

### Not Included (By Design)
- Visual block editor (too complex)
- Collaborative real-time editing
- Auto-publish (manual control for safety)
- Database sync (JSON only)

---

## 🐛 Troubleshooting

### Q: Changes not saving?
**A:** Click 💾 Save or changes will auto-save to localStorage. To persist to server, you must export JSON and commit to GitHub.

### Q: Formatting not applying?
**A:** Select text first, then click format button in right sidebar. Formatting buttons only work on selected text (future: slash commands).

### Q: Where's my draft?
**A:** Saved to browser localStorage. Check DevTools → Application → LocalStorage for `draft-*` keys.

### Q: How do I publish changes?
**A:** 
1. Ensure content is saved
2. Click **Export JSON**
3. Replace JSON file in repo
4. Commit and push to GitHub
5. Site rebuilds automatically

### Q: Can I edit images?
**A:** Not yet in editor, but images are in the JSON. Export JSON, edit URLs, re-import.

### Q: How do I undo?
**A:** Browser's Ctrl+Z should work. Or reload page to get last saved version.

---

## 📱 Mobile / Responsive

- **Editor scales to mobile** - Single column layout
- **Sidebars hidden** - Tap to access panels
- **Touch support** - Tap to select, long-press for context menu (future)
- **Keyboard** - Full keyboard support on mobile browsers

---

## 🔒 Safety & Privacy

- **All editing is local** - No server uploads unless you export
- **No user tracking** - Only localStorage used
- **Drafts are local** - Won't sync across devices
- **Manual publish** - You control when changes go live

---

## Keyboard Controls

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save (future) |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Tab` | Navigate between fields |
| `Enter` | New paragraph (in editor) |
| `Click + Type` | Start editing anywhere |

---

## Migration from Old Editor

**If coming from the complex block editor:**

| Old | New |
|-----|-----|
| Block selection UI | Click anywhere |
| Toolbar above editor | Right-side formatting |
| Save workflow complex | One-click save |
| No visual feedback | Real-time status |

---

## FAQ

**Q: Is this production-ready?**
A: Yes! Use it to edit projects, case studies, and homepage content.

**Q: Will my drafts be lost?**
A: No, they're saved to localStorage. Clear browser data to lose them.

**Q: Can I revert changes?**
A: Not yet in UI, but if you didn't export/push, reload the page to start fresh.

**Q: What if I break the JSON?**
A: Export shows validation errors. Fix and try again, or reload to get last good copy.

**Q: Can multiple people edit at once?**
A: Not yet (no real-time sync). One person edits, exports, pushes to GitHub.

---

## Support

- Check the main project README for system architecture
- See `/docs` for portfolio project docs
- Test on your actual device before publishing

**Happy editing! 🚀**

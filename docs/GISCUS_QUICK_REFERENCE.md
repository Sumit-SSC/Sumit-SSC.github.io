# Giscus Quick Reference

## Configuration Values Needed

After setting up Giscus (see `GISCUS_SETUP.md`), you'll need these two values:

1. **Repo ID**: `R_kgDO...` (from giscus.app)
2. **Category ID**: `DIC_kwDO...` (from giscus.app)

## Where to Update

**File**: `project.html`  
**Lines**: ~115-116

Replace these placeholders:
```html
data-repo-id="REPO_ID_PLACEHOLDER"
data-category-id="CATEGORY_ID_PLACEHOLDER"
```

## How It Works

- **Each project** = One GitHub Discussion thread
- **Discussion title**: `project-{projectId}`
- **Example**: `project-used-car-price` creates discussion "project-used-car-price"
- **Theme**: Auto-syncs with your site's light/dark toggle
- **Reactions**: Enabled (👍, ❤️, 🎉, etc.)

## Testing

1. Open: `http://localhost:8000/project.html?id=used-car-price`
2. Scroll to "Comments & Discussion"
3. Sign in with GitHub to comment
4. Check your repo's Discussions tab to see the thread

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Discussion not found" | Enable Discussions in repo Settings → Features |
| Comments not showing | Check repo-id and category-id are correct |
| Theme not switching | Should auto-detect; check browser console for errors |

## View Comments

- **On site**: Scroll to bottom of any project page
- **On GitHub**: Repo → Discussions tab → Find `project-{id}` thread

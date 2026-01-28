# Asset Mapping to External Repositories

This feature allows you to map project assets (images, PBIX files, PDFs, datasets) to external GitHub repositories instead of storing them in the main portfolio repository.

## How It Works

When a project has an `assets_repo` field, all asset paths (thumbnails, images, PBIX files, PDFs) are automatically resolved to GitHub raw content URLs.

## Configuration

Add these fields to your project in `data/projects.json`:

```json
{
  "id": "my-project",
  "title": "My Project",
  "thumbnail": "assets/images/thumbnail.png",
  "images": ["assets/images/img1.png", "assets/images/img2.png"],
  "pbix_download_path": "assets/pbix/dashboard.pbix",
  "slide_pdf_path": "assets/slides/presentation.pdf",
  "assets_repo": "Sumit-SC/My-Project-Repo",
  "assets_branch": "main",
  ...
}
```

### Fields

- **`assets_repo`** (optional): GitHub repository in format `owner/repo-name`
  - Example: `"Sumit-SC/Data-Science-Capstone-Project"`
  - If not provided, assets are treated as local paths

- **`assets_branch`** (optional): Branch name (defaults to `"main"`)
  - Example: `"main"`, `"master"`, `"dev"`

### Asset Paths

All asset paths are relative to the repository root:

- **Thumbnails**: `assets/images/thumbnail.png`
- **Images**: `["assets/images/img1.png", "assets/images/img2.png"]`
- **PBIX Files**: `assets/pbix/dashboard.pbix`
- **PDFs**: `assets/slides/presentation.pdf`

## URL Resolution

The system automatically converts paths to GitHub raw URLs:

**Local Path:**
```
assets/images/thumbnail.png
```

**Resolved URL (with assets_repo):**
```
https://raw.githubusercontent.com/Sumit-SC/My-Project-Repo/main/assets/images/thumbnail.png
```

## Examples

### Example 1: Project with External Assets

```json
{
  "id": "used-car-price",
  "title": "Used Car Price Prediction",
  "thumbnail": "notebooks/images/thumbnail.png",
  "images": [
    "notebooks/images/eda.png",
    "notebooks/images/results.png"
  ],
  "pbix_download_path": "dashboards/car-price-dashboard.pbix",
  "slide_pdf_path": "presentations/car-price-analysis.pdf",
  "assets_repo": "Sumit-SC/Data-Science-Capstone-Project",
  "assets_branch": "main",
  "github_url": "https://github.com/Sumit-SC/Data-Science-Capstone-Project"
}
```

### Example 2: Mixed Assets (Some External, Some Local)

You can mix external and local assets. If `assets_repo` is set, all relative paths use the external repo. For local assets, use full URLs:

```json
{
  "id": "mixed-project",
  "title": "Mixed Assets Project",
  "thumbnail": "https://example.com/local-thumbnail.png",  // Full URL = local
  "images": [
    "assets/images/external-img.png",  // Uses assets_repo
    "https://example.com/local-img.png"  // Full URL = local
  ],
  "assets_repo": "Sumit-SC/External-Project",
  "github_url": "https://github.com/Sumit-SC/External-Project"
}
```

### Example 3: No External Repo (Local Assets)

If `assets_repo` is not provided, paths are used as-is (local):

```json
{
  "id": "local-project",
  "title": "Local Assets Project",
  "thumbnail": "assets/images/thumbnail.png",  // Local path
  "images": ["assets/images/img1.png"],  // Local path
  "github_url": "https://github.com/Sumit-SC/Local-Project"
}
```

## Supported Asset Types

All these asset types support external repository mapping:

1. **Thumbnails** (`thumbnail`)
   - Used in project cards on dashboard
   - Used in featured project sections

2. **Images** (`images` array)
   - Gallery section on project detail page
   - Multiple images supported

3. **PBIX Files** (`pbix_download_path`)
   - Download button on project detail page
   - Links to GitHub raw content URL

4. **PDFs** (`slide_pdf_path`)
   - Embedded PDF viewer on project detail page
   - Links to GitHub raw content URL

## Benefits

✅ **No Duplication**: Store assets once in project repo, reference from portfolio  
✅ **Version Control**: Assets versioned with project code  
✅ **Smaller Portfolio Repo**: Main repo stays lightweight  
✅ **Easy Updates**: Update assets in project repo, portfolio auto-updates  
✅ **Flexible**: Mix external and local assets as needed

## GitHub Raw Content URLs

The system constructs URLs using this format:

```
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
```

**Important Notes:**
- Files must be committed to the repository
- Use the correct branch name
- Paths are relative to repository root
- GitHub raw URLs are publicly accessible (no authentication)

## Troubleshooting

### Assets Not Loading

1. **Check Repository**: Ensure `assets_repo` is correct format: `owner/repo`
2. **Check Branch**: Verify `assets_branch` exists and contains the files
3. **Check Paths**: Ensure paths are relative to repo root (no leading `/`)
4. **Check File Exists**: Verify files are committed to the repository
5. **Check Public Access**: GitHub raw URLs require public repositories (or proper authentication)

### Mixed Local/External Assets

- Use full URLs (`https://...`) for local assets
- Use relative paths for external assets (when `assets_repo` is set)

### CORS Issues

GitHub raw content URLs should work without CORS issues. If you encounter problems:
- Ensure repository is public
- Check file paths are correct
- Verify branch name is correct

## Migration Guide

To migrate existing projects to use external assets:

1. **Move assets to project repository**
   ```
   project-repo/
   ├── assets/
   │   ├── images/
   │   ├── pbix/
   │   └── slides/
   ```

2. **Update `projects.json`**
   ```json
   {
     "assets_repo": "Sumit-SC/Project-Repo",
     "assets_branch": "main",
     "thumbnail": "assets/images/thumbnail.png",
     ...
   }
   ```

3. **Remove assets from portfolio repo** (optional)
   - Keep backup until verified working
   - Delete after confirming external assets load correctly

## Best Practices

1. **Organize Assets**: Use consistent folder structure in project repos
   ```
   assets/
   ├── images/
   ├── pbix/
   └── slides/
   ```

2. **Use Descriptive Names**: Clear file names help maintainability
   - ✅ `car-price-thumbnail.png`
   - ❌ `img1.png`

3. **Version Control**: Commit assets to project repos for versioning

4. **Test Locally**: Verify asset URLs resolve correctly before deploying

5. **Document Structure**: Note asset locations in project README

# Data & Analytics Portfolio (Static, GitHub Pages)

Minimal, fast portfolio aimed at Senior Data Analyst / Decision Scientist / Product Analyst roles. Built with pure HTML, CSS, and vanilla JavaScript—no frameworks, no build step. All project content comes from `data/projects.json`.

## Site Structure

```
/
├── index.html        # Landing page (intro screen)
├── homepage.html     # Dashboard with projects listing
├── about.html        # About page with full-screen sections, skills, resume, journey timeline
├── contact.html      # Contact form page
├── project.html      # Single project detail (driven by ?id=)
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   ├── images/
│   ├── videos/
│   ├── slides/
│   └── pbix/
└── data/projects.json
```

## Pages Overview

### 1. Landing Page (`index.html`)
- Full-screen intro section with gradient background
- "Learn More" button that links to dashboard
- Minimal navigation that appears on scroll

### 2. Dashboard (`homepage.html`)
- Full-screen intro section that hides on scroll
- Featured project at the top
- Grid of all projects below
- Pagination support
- HTML5 UP Massively-inspired layout

### 3. About Page (`about.html`)
- Full-screen sections with smooth scroll navigation:
  - **Intro**: Welcome message
  - **What I Do**: Description of work
  - **Who I Am**: Personal background
  - **Skills**: Technology stack in organized categories
  - **Resume & Journey**: Left-right split layout
    - Left: Resume PDF embed with download
    - Right: Horizontal journey timeline (left-to-right)
- HTML5 UP Big Picture-inspired transitions

### 4. Contact Page (`contact.html`)
- Contact form (uses Formspree for email delivery)
- Contact information sidebar
- Social media links

### 5. Project Detail (`project.html`)
- Dynamic content loaded from `projects.json`
- Supports embeds: Streamlit, Power BI, YouTube videos, PDFs
- Image galleries
- Download links for PBIX files

## How to Add a Project

1. Open `data/projects.json`.
2. Add a new object with these fields:

```json
{
  "id": "unique-slug",
  "title": "Project Title",
  "short_description": "1–2 lines for cards",
  "full_description": "Overview paragraph.",
  "problem_statement": "Business problem.",
  "approach": "What you did.",
  "insights": "Outcomes/impact.",
  "tools": ["SQL", "Python", "Power BI"],
  "category": "Decision Science",
  "date": "2025",
  "thumbnail": "path or data URI",
  "images": ["path or data URI"],
  "video_url": "",
  "streamlit_url": "",
  "powerbi_embed_url": "",
  "pbix_download_path": "",
  "slide_pdf_path": "",
  "github_url": "",
  "demo_url": "",
  "medium_url": "",
  "kaggle_url": "",
  "featured": true
}
```

3. Ensure `id` matches the URL: `project.html?id=your-id`.
4. Add assets into `assets/images`, `assets/videos`, `assets/slides`, `assets/pbix`.

## Embeds

- **Streamlit**: Set `streamlit_url`, we append `?embed=true`.
- **Power BI**: Set `powerbi_embed_url` for iframe; otherwise set `pbix_download_path` for download button.
- **Slides/PDF**: Set `slide_pdf_path`.
- **Video**: YouTube link or direct `.mp4` in `video_url`.

## Contact Form Setup

The contact form uses [Formspree](https://formspree.io/) for email delivery:

1. Go to https://formspree.io/forms
2. Create a new form
3. Copy your form ID
4. In `contact.html`, replace `YOUR_FORM_ID` with your actual Formspree form ID:
   ```html
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

## Running Locally

For fetch of `projects.json` to work, use a simple server:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

Or use any other local server (Live Server extension, etc.).

## Deploy to GitHub Pages

1. Commit and push to `main`.
2. In repo settings → Pages, choose source: `GitHub Actions` or `main / root`.
3. Wait for publish; site will be at `https://<user>.github.io/<repo>/`.

## Design Principles

- **Minimal & Professional**: Clean design with calm spacing (inspired by adithyask.com spacing/typography)
- **HTML5 UP Style**: Full-screen sections, smooth scroll transitions, scroll-triggered animations
- **No Frameworks**: Pure HTML, CSS, vanilla JavaScript
- **Focus on Content**: Problem → approach → outcome with clear links to code/demos
- **Responsive**: Works on mobile and desktop

## Features

- ✅ Landing page with full-screen intro
- ✅ Dashboard with featured projects
- ✅ About page with full-screen sections
- ✅ Skills showcase
- ✅ Resume PDF embed
- ✅ Horizontal journey timeline
- ✅ Contact form with Formspree integration
- ✅ Dynamic project loading from JSON
- ✅ Smooth scroll animations
- ✅ Scroll-triggered animations
- ✅ Responsive design

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Uses vanilla JavaScript with no dependencies.
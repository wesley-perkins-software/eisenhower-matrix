# Eisenhower Matrix (MVP)

A fast, single-page Eisenhower Matrix tool (Urgent vs Important). No login. Tasks save locally in your browser.

## Run locally
Just open `index.html` in your browser.

## Development
Edit:
- `index.html`
- `styles.css`
- `app.js`
- `quadrants.html`
- `urgent-vs-important.html`
- `examples.html`
- `about.html`
- `privacy.html`

No build step required.

## Data persistence
Tasks are stored in your browser via localStorage (see `privacy.html` and `PRIVACY.md`).

## SEO notes
The page now includes SEO metadata (title, description, canonical, Open Graph/Twitter tags), JSON-LD structured data
(WebSite, WebPage, WebApplication, FAQPage), plus crawlability files (`robots.txt`, `sitemap.xml`).

## Supporting pages and internal linking
The site includes supporting pages that explain the method and link back to the tool:
- `quadrants.html` — deep dive on the 4 boxes
- `urgent-vs-important.html` — concept breakdown + FAQ
- `examples.html` — practical mixed-life task list examples
- `about.html` — short site/about page
- `privacy.html` — browser-local storage privacy page

Primary navigation is shared across pages: Tool, Quadrants, Urgent vs Important, Examples.
Footer links include About and Privacy.

### Set your canonical URL
Update the `CANONICAL_URL` constant and the canonical/OG URL values in `index.html`, plus the `sitemap.xml` and
`robots.txt` placeholders, to match your production domain before deployment. There are TODO comments marking each
location. After deploying, submit the site in Google Search Console to speed up indexing.

When adding, renaming, or removing pages:
1. Update canonical tags in the affected HTML pages.
2. Update `sitemap.xml` URL entries.
3. Keep `robots.txt` sitemap location accurate.

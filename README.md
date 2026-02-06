# Eisenhower Matrix (MVP)

A fast, single-page Eisenhower Matrix tool (Urgent vs Important). No login. Tasks save locally in your browser.

## Run locally
Just open `index.html` in your browser.

## Development
Edit:
- `index.html`
- `styles.css`
- `app.js`

No build step required.

## Data persistence
Tasks are stored in your browser via localStorage (see `PRIVACY.md`).

## SEO notes
The page now includes SEO metadata (title, description, canonical, Open Graph/Twitter tags), JSON-LD structured data
(WebSite, WebPage, WebApplication, FAQPage), plus crawlability files (`robots.txt`, `sitemap.xml`).

### Set your canonical URL
Update the `CANONICAL_URL` constant and the canonical/OG URL values in `index.html`, plus the `sitemap.xml` and
`robots.txt` placeholders, to match your production domain before deployment. There are TODO comments marking each
location. After deploying, submit the site in Google Search Console to speed up indexing.

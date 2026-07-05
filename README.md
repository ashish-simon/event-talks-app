# BigQuery Release Notes Dashboard & X-Share

A premium, modern web application built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript**. This app fetches, parses, and formats Google Cloud's BigQuery Release Notes, allowing you to search, filter, and instantly draft and post updates directly to X (formerly Twitter).

## Features
- **Live Feed & Intelligent Caching**: Automatically fetches the live XML feed from Google Cloud documentation. To ensure performance and prevent rate limiting (HTTP 429), it implements a 1-hour local XML cache fallback.
- **Granular Update Splitting**: Automatically parses each daily release entry's raw HTML and splits them into individual update items (Features, Changes, Announcements, Deprecations, and Issues).
- **Rich Dashboard UI (Dark Mode & Glassmorphism)**: A premium dark mode layout utilizing CSS backdrop filters, glowing accent lines keyed to update types, and responsive design.
- **Dynamic Search & Filters**: Live client-side keyword searching across all updates. Fast type filter pills with dynamically updating counts showing matching notes.
- **X/Twitter Composer Drawer**: Clicking "Draft Tweet" opens a sliding drawer panel to customize your draft.
  - **Preset Styles**: Cycle through 4 different pre-composed styles:
    - 🚀 *Insider*: Emojis and hashtags, perfect for developers.
    - 💼 *Professional*: Clean, business-oriented corporate summary.
    - 🔥 *Hype*: Enthusiastic developer style.
    - ⚡ *Minimalist*: Low character, direct title/link summary.
  - **Character Counter**: Performs a live, accurate Twitter character count (counting all URLs as exactly 23 characters as X does) and shows warnings (yellow/red) if the draft exceeds 280 characters.
  - **Direct Share**: Opens a secure, pre-filled X Web Intent in a new tab for you to review and post.

## Directory Structure
- [app.py](file:///E:/agy-cli-projects/bq-releases-notes/app.py) - Flask backend server (handles feed fetch, BeautifulSoup parsing, XML cache).
- [templates/index.html](file:///E:/agy-cli-projects/bq-releases-notes/templates/index.html) - HTML5 layout containing the main feed area, controls, and composer drawer.
- [static/css/style.css](file:///E:/agy-cli-projects/bq-releases-notes/static/css/style.css) - Premium CSS file utilizing custom variables, background gradients, glassmorphism, and sliding animations.
- [static/js/app.js](file:///E:/agy-cli-projects/bq-releases-notes/static/js/app.js) - Handles fetch operations, filtering, UI layout injections, draft presets, and X intents.
- [feed_cache.xml](file:///E:/agy-cli-projects/bq-releases-notes/feed_cache.xml) - Local XML cache file containing the seed notes feed.

## How to Run Locally

### 1. Install Dependencies
Make sure you have Flask, requests, and beautifulsoup4 installed:
```bash
pip install flask requests beautifulsoup4
```

### 2. Run the Server
Launch the Flask development server:
```bash
python app.py
```

### 3. Open in Browser
Open your browser and navigate to:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

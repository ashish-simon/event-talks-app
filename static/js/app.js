document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseNotes = []; // Raw parsed entries from API
    let flatUpdates = [];  // Flattened list of individual updates
    let filteredUpdates = []; // Currently filtered updates
    let selectedUpdate = null; // Currently selected update for tweeting
    let currentFilter = 'all';
    let searchQuery = '';
    
    // UI Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const themeToggle = document.getElementById('theme-toggle');
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterPills = document.querySelectorAll('.filter-pill');
    const notesGrid = document.getElementById('notes-grid');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const btnClearFilters = document.getElementById('btn-clear-filters');
    const drawerBackdrop = document.getElementById('drawer-backdrop');
    
    // Drawer Elements
    const tweetDrawer = document.getElementById('tweet-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const tweetPreviewType = document.getElementById('tweet-preview-type');
    const tweetPreviewDate = document.getElementById('tweet-preview-date');
    const tweetPreviewText = document.getElementById('tweet-preview-text');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const btnResetTweet = document.getElementById('btn-reset-tweet');
    const charUsed = document.getElementById('char-used');
    const btnPostTwitter = document.getElementById('btn-post-twitter');
    const presetPills = document.querySelectorAll('.preset-pill');

    // Counts elements
    const countAll = document.getElementById('count-all');
    const countFeature = document.getElementById('count-feature');
    const countChange = document.getElementById('count-change');
    const countAnnouncement = document.getElementById('count-announcement');
    const countIssue = document.getElementById('count-issue');
    const countBreaking = document.getElementById('count-breaking');

    // Init
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
    }
    fetchNotes(false);

    // Event Listeners
    btnRefresh.addEventListener('click', () => fetchNotes(true));
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
    });
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        filterAndRender();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        filterAndRender();
    });

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-checked', 'false');
            });
            pill.classList.add('active');
            pill.setAttribute('aria-checked', 'true');
            currentFilter = pill.getAttribute('data-type');
            filterAndRender();
        });
    });

    btnCloseDrawer.addEventListener('click', closeDrawer);
    
    tweetTextarea.addEventListener('input', updateCharCount);

    btnResetTweet.addEventListener('click', () => {
        if (selectedUpdate) {
            const activePreset = document.querySelector('.preset-pill.active').getAttribute('data-style');
            generateTweet(selectedUpdate, activePreset);
        }
    });

    presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            presetPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const style = pill.getAttribute('data-style');
            if (selectedUpdate) {
                generateTweet(selectedUpdate, style);
            }
        });
    });

    btnPostTwitter.addEventListener('click', shareOnTwitter);
    btnExportCsv.addEventListener('click', exportToCSV);
    drawerBackdrop.addEventListener('click', closeDrawer);

    btnClearFilters.addEventListener('click', () => {
        // Reset search state
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';

        // Reset filter pills to All
        filterPills.forEach(p => {
            if (p.getAttribute('data-type') === 'all') {
                p.classList.add('active');
                p.setAttribute('aria-checked', 'true');
            } else {
                p.classList.remove('active');
                p.setAttribute('aria-checked', 'false');
            }
        });
        currentFilter = 'all';

        // Re-render
        filterAndRender();
    });

    // Fetch notes from API
    async function fetchNotes(forceRefresh = false) {
        setLoading(true);
        btnRefresh.classList.add('spinning');
        btnRefresh.disabled = true;
        btnExportCsv.disabled = true;
        
        updateStatus('loading', 'Fetching release notes...');
        
        try {
            const response = await fetch(`/api/notes?refresh=${forceRefresh}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                releaseNotes = data.notes;
                flattenNotes(releaseNotes);
                
                // Update network status indicator
                if (data.from_cache) {
                    updateStatus('cache', 'Cached Data');
                } else {
                    updateStatus('live', 'Live Feed');
                }
                
                filterAndRender();
            } else {
                throw new Error(data.error || 'Failed to retrieve release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            updateStatus('cache', 'Fetch error, cache offline');
            // If local flatUpdates already exists, keep it, otherwise show empty
            if (flatUpdates.length === 0) {
                showEmptyState(true);
            }
        } finally {
            setLoading(false);
            btnRefresh.classList.remove('spinning');
            btnRefresh.disabled = false;
            btnExportCsv.disabled = flatUpdates.length === 0;
        }
    }

    // Update the visual status badge
    function updateStatus(state, label) {
        statusBadge.className = 'status-badge';
        statusText.textContent = label;
        
        if (state === 'live') {
            statusBadge.classList.add('status-live');
        } else if (state === 'cache') {
            statusBadge.classList.add('status-cache');
        } else {
            statusBadge.classList.add('status-loading');
        }
    }

    // Set loading indicator
    function setLoading(isLoading) {
        if (isLoading) {
            loadingState.style.display = 'flex';
            notesGrid.style.display = 'none';
            emptyState.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
            notesGrid.style.display = 'flex';
        }
    }

    // Flatten hierarchal entry structure to individual updates
    function flattenNotes(notes) {
        flatUpdates = [];
        notes.forEach(entry => {
            entry.updates.forEach((update, index) => {
                flatUpdates.push({
                    id: `${entry.id}_${index}`,
                    date: entry.date,
                    updated: entry.updated,
                    link: entry.link,
                    type: update.type,
                    html: update.html,
                    text: update.text
                });
            });
        });
    }

    // Filter updates by keyword and type badge, update counts, and render
    function filterAndRender() {
        const filtered = flatUpdates.filter(update => {
            // Type Filter
            const matchesType = currentFilter === 'all' || 
                update.type.toLowerCase() === currentFilter.toLowerCase() ||
                (currentFilter === 'Breaking' && update.type.toLowerCase().includes('breaking')) ||
                (currentFilter === 'Issue' && update.type.toLowerCase().includes('issue'));
                
            // Search Query Filter
            const textToSearch = `${update.type} ${update.date} ${update.text}`.toLowerCase();
            const matchesSearch = textToSearch.includes(searchQuery);
            
            return matchesType && matchesSearch;
        });

        filteredUpdates = filtered;
        btnExportCsv.disabled = filteredUpdates.length === 0;
        updateFilterCounts();
        renderCards(filteredUpdates);
    }

    // Calculate pill count metadata for the UI
    function updateFilterCounts() {
        const counts = {
            all: 0,
            feature: 0,
            change: 0,
            announcement: 0,
            issue: 0,
            breaking: 0
        };

        flatUpdates.forEach(update => {
            // Apply search filter to counting too so counts reflect search matches
            const textToSearch = `${update.type} ${update.date} ${update.text}`.toLowerCase();
            if (searchQuery && !textToSearch.includes(searchQuery)) {
                return;
            }

            counts.all++;
            const typeLower = update.type.toLowerCase();
            
            if (typeLower.includes('feature')) counts.feature++;
            else if (typeLower.includes('change')) counts.change++;
            else if (typeLower.includes('announcement')) counts.announcement++;
            else if (typeLower.includes('issue')) counts.issue++;
            else if (typeLower.includes('breaking')) counts.breaking++;
        });

        countAll.textContent = counts.all;
        countFeature.textContent = counts.feature;
        countChange.textContent = counts.change;
        countAnnouncement.textContent = counts.announcement;
        countIssue.textContent = counts.issue;
        countBreaking.textContent = counts.breaking;
    }

    // Render cards to grid
    function renderCards(updates) {
        notesGrid.innerHTML = '';
        
        if (updates.length === 0) {
            showEmptyState(true);
            return;
        }
        
        showEmptyState(false);

        updates.forEach(update => {
            const card = document.createElement('article');
            const typeClass = `type-${update.type.toLowerCase().replace(/\s+/g, '-')}`;
            card.className = `note-card ${typeClass}`;
            card.id = `card-${update.id}`;
            
            if (selectedUpdate && selectedUpdate.id === update.id) {
                card.classList.add('selected-for-tweet');
            }

            // Determine badge type class
            let badgeClass = 'badge-fallback';
            const typeLower = update.type.toLowerCase();
            if (typeLower.includes('feature')) badgeClass = 'badge-feature';
            else if (typeLower.includes('change')) badgeClass = 'badge-change';
            else if (typeLower.includes('announcement')) badgeClass = 'badge-announcement';
            else if (typeLower.includes('issue')) badgeClass = 'badge-issue';
            else if (typeLower.includes('breaking')) badgeClass = 'badge-breaking';

            card.innerHTML = `
                <div class="note-header">
                    <div class="note-meta-left">
                        <span class="badge ${badgeClass}">${update.type}</span>
                        <div class="note-date">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>${update.date}</span>
                        </div>
                    </div>
                </div>
                <div class="note-body">
                    ${update.html}
                </div>
                <div class="note-actions">
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-tweet" data-id="${update.id}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>Draft Tweet</span>
                        </button>
                        <button class="btn btn-copy-card" data-id="${update.id}">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span class="btn-copy-text">Copy</span>
                        </button>
                    </div>
                    ${update.link ? `
                        <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="card-link">
                            <span>View Docs</span>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    ` : ''}
                </div>
            `;

            // Attach actions
            const btnTweet = card.querySelector('.btn-tweet');
            btnTweet.addEventListener('click', () => selectUpdateForTweet(update));

            const btnCopy = card.querySelector('.btn-copy-card');
            btnCopy.addEventListener('click', () => copyToClipboard(update, btnCopy));

            notesGrid.appendChild(card);
        });
    }

    function showEmptyState(show) {
        if (show) {
            emptyState.style.display = 'flex';
            notesGrid.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            notesGrid.style.display = 'flex';
        }
    }

    // Select update to trigger composer drawer
    function selectUpdateForTweet(update) {
        // Toggle selected styling classes on cards
        document.querySelectorAll('.note-card').forEach(card => {
            card.classList.remove('selected-for-tweet');
        });
        const selectedCard = document.getElementById(`card-${update.id}`);
        if (selectedCard) {
            selectedCard.classList.add('selected-for-tweet');
        }

        selectedUpdate = update;
        
        // Open the drawer
        document.body.classList.add('drawer-open');
        
        // Set update preview
        let badgeClass = 'badge-fallback';
        const typeLower = update.type.toLowerCase();
        if (typeLower.includes('feature')) badgeClass = 'badge-feature';
        else if (typeLower.includes('change')) badgeClass = 'badge-change';
        else if (typeLower.includes('announcement')) badgeClass = 'badge-announcement';
        else if (typeLower.includes('issue')) badgeClass = 'badge-issue';
        else if (typeLower.includes('breaking')) badgeClass = 'badge-breaking';

        tweetPreviewType.className = `badge ${badgeClass}`;
        tweetPreviewType.textContent = update.type;
        tweetPreviewDate.textContent = update.date;
        tweetPreviewText.textContent = update.text;

        // Reset preset to "Insider" default or active preset
        const activePreset = document.querySelector('.preset-pill.active').getAttribute('data-style');
        generateTweet(update, activePreset);
    }

    function closeDrawer() {
        document.body.classList.remove('drawer-open');
        document.querySelectorAll('.note-card').forEach(card => {
            card.classList.remove('selected-for-tweet');
        });
        selectedUpdate = null;
    }

    // Generate tweet based on selected style and content length limits
    function generateTweet(update, style) {
        if (!update) return;

        // Clean up text
        let cleanText = update.text
            .replace(/\s+/g, ' ')
            .trim();
        
        // Truncate text logic to fit tweet budget
        // An X URL intent is computed as 23 characters, plus hashtags and template syntax.
        // We will target a 140-160 character body summary.
        const maxSummaryLength = 150;
        let summary = cleanText;
        if (cleanText.length > maxSummaryLength) {
            summary = cleanText.substring(0, maxSummaryLength) + '...';
        }

        let tweetText = '';
        const docLink = update.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';

        switch (style) {
            case 'corporate':
                tweetText = `Google Cloud announced a new BigQuery update (${update.date}):\n\n"${summary}"\n\nRead more details:\n${docLink}\n#BigQuery #GCP #Cloud`;
                break;
            case 'excited':
                tweetText = `🔥 This is awesome for #BigQuery developers!\n\n${summary}\n\nCheck out the docs here:\n${docLink}\n#GoogleCloud #DataEngineering #Cloud`;
                break;
            case 'minimal':
                tweetText = `#BigQuery | ${update.date}\n⚡ ${summary}\n\n👉 ${docLink}`;
                break;
            case 'insider':
            default:
                tweetText = `🚀 New #BigQuery Release note (${update.date})!\n\n${summary}\n\nRead details:\n${docLink}\n#GCP #GoogleCloud`;
                break;
        }

        tweetTextarea.value = tweetText;
        updateCharCount();
    }

    // Update remaining character count visual indicator
    function updateCharCount() {
        const text = tweetTextarea.value;
        
        // Twitter counts links as 23 characters regardless of actual link size.
        // We will perform a simplified estimation:
        // Replace URL in text with a 23-char placeholder for count accuracy.
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let formattedText = text;
        const matches = text.match(urlRegex);
        if (matches) {
            matches.forEach(url => {
                formattedText = formattedText.replace(url, 'a'.repeat(23));
            });
        }

        const count = formattedText.length;
        charUsed.textContent = count;
        
        const counterContainer = document.getElementById('char-counter').parentElement;
        
        if (count > 280) {
            charUsed.style.color = 'var(--color-issue)';
            btnPostTwitter.disabled = true;
            charUsed.parentElement.className = 'char-counter danger';
        } else if (count > 260) {
            charUsed.style.color = 'var(--color-change)';
            btnPostTwitter.disabled = false;
            charUsed.parentElement.className = 'char-counter warning';
        } else {
            charUsed.style.color = 'var(--text-muted)';
            btnPostTwitter.disabled = false;
            charUsed.parentElement.className = 'char-counter';
        }
    }

    // Share draft on X/Twitter using web intents API
    function shareOnTwitter() {
        const text = tweetTextarea.value;
        if (text.length === 0) return;
        
        const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
    }

    // Copy release note to clipboard
    function copyToClipboard(update, button) {
        const textToCopy = `[${update.date}] BigQuery ${update.type}:\n${update.text}\n\nRead details: ${update.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes'}`;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const textSpan = button.querySelector('.btn-copy-text');
            const originalText = textSpan.textContent;
            button.classList.add('copied');
            textSpan.textContent = 'Copied!';
            
            setTimeout(() => {
                button.classList.remove('copied');
                textSpan.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard. Please copy manually.');
        });
    }

    // Export currently filtered list to CSV format
    function exportToCSV() {
        if (filteredUpdates.length === 0) return;

        const headers = ['Date', 'Type', 'Description', 'Link'];
        
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                return `"${str}"`;
            }
            return str;
        };

        const csvRows = [headers.join(',')];

        filteredUpdates.forEach(update => {
            const row = [
                escapeCSV(update.date),
                escapeCSV(update.type),
                escapeCSV(update.text),
                escapeCSV(update.link)
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        let filename = 'bigquery_release_notes';
        if (currentFilter !== 'all') {
            filename += `_${currentFilter.toLowerCase()}`;
        }
        if (searchQuery) {
            filename += `_search_${searchQuery.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        }
        filename += '.csv';

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
});

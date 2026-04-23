// ============================================
// FilmiGO - Glavni JavaScript
// ============================================

const API = {
    auth:   'php/auth.php',
    movies: 'php/movies.php',
};

const TMDB_IMG      = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_ORIG = 'https://image.tmdb.org/t/p/original';
const PLACEHOLDER   = 'https://via.placeholder.com/200x300/1c1c1c/6b6560?text=Nema+slike';

const GENRES = [
    { id: 28,    name: '💥 Akcija'      },
    { id: 35,    name: '😂 Komedija'    },
    { id: 18,    name: '🎭 Drama'       },
    { id: 27,    name: '😱 Horor'       },
    { id: 10749, name: '💕 Romantika'   },
    { id: 878,   name: '🚀 Sci-Fi'      },
    { id: 14,    name: '🧙 Fantasy'     },
    { id: 80,    name: '🔫 Kriminal'    },
    { id: 16,    name: '🎨 Animacija'   },
    { id: 12,    name: '🌍 Avantura'    },
    { id: 53,    name: '🔪 Triler'      },
    { id: 99,    name: '📽️ Dokumentarac'},
];

// --- State ---
let currentUser    = null;
let searchTimeout  = null;
let currentPage    = 'home';
let activeGenreId  = 28;

// ============================================
// INICIJALIZACIJA
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await checkSession();
    loadPage('home');
    initSearch();
    initModals();
});

// ============================================
// SESSION
// ============================================
async function checkSession() {
    try {
        const res  = await fetch(`${API.auth}?action=check`);
        const data = await res.json();
        if (data.logged_in) {
            currentUser = data.user;
            updateNavForUser();
        }
    } catch (e) { console.error('Greška sesije:', e); }
}

function updateNavForUser() {
    const loginBtn    = document.getElementById('btn-login');
    const registerBtn = document.getElementById('btn-register');
    const userMenu    = document.getElementById('user-menu');
    const userLabel   = document.getElementById('user-label');

    if (currentUser) {
        if (loginBtn)    loginBtn.style.display    = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userMenu)    userMenu.style.display    = 'flex';
        if (userLabel)   userLabel.textContent     = currentUser.username;
    } else {
        if (loginBtn)    loginBtn.style.display    = '';
        if (registerBtn) registerBtn.style.display = '';
        if (userMenu)    userMenu.style.display    = 'none';
    }
}

// ============================================
// ROUTING
// ============================================
function loadPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`page-${page}`);
    if (el) el.classList.add('active');

    document.querySelectorAll('.navbar-links a').forEach(a => {
        a.classList.toggle('active', a.dataset.page === page);
    });

    currentPage = page;

    switch (page) {
        case 'home':       loadHome();        break;
        case 'discover':   loadDiscover();    break;
        case 'watchlist':  loadWatchlist();   break;
        case 'profile':    loadProfile();     break;
        case 'duel':       loadDuel();        break;
        case 'random':     loadRandomPage();  break;
        case 'recommend':  loadRecommend();   break;
    }
}

// ============================================
// HOME PAGE
// ============================================
async function loadHome() {
    await loadHero();
    await loadTrending('movie', 'trending-movies');
    await loadTrending('tv',    'trending-shows');
}

async function loadHero() {
    try {
        const res    = await fetch(`${API.movies}?action=trending&type=movie&period=day`);
        const data   = await res.json();
        const movies = data.results || [];
        if (!movies.length) return;

        const movie = movies[0];
        const hero  = document.getElementById('hero');
        if (!hero) return;

        hero.querySelector('.hero-bg').style.backgroundImage = `url(${TMDB_IMG_ORIG}${movie.backdrop_path})`;
        hero.querySelector('.hero-title').textContent = movie.title || movie.name;
        hero.querySelector('.hero-desc').textContent  = (movie.overview || '').substring(0, 210) + '...';
        hero.querySelector('.hero-rating').textContent = '★ ' + (movie.vote_average?.toFixed(1) || 'N/A');
        hero.querySelector('.hero-year').textContent   = (movie.release_date || '').substring(0, 4);
        hero.querySelector('.btn-details').onclick   = () => openMovieDetails(movie.id, 'movie');
        hero.querySelector('.btn-watchlist').onclick = () => openAddToWatchlist(movie);
    } catch(e) { console.error('Hero greška:', e); }
}

async function loadTrending(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

    const res  = await fetch(`${API.movies}?action=trending&type=${type}`);
    const data = await res.json();

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'movie-grid';
    (data.results || []).slice(0, 10).forEach(movie => {
        grid.appendChild(createMovieCard(movie, type === 'all' ? (movie.media_type || 'movie') : type));
    });
    container.appendChild(grid);
}

// ============================================
// DISCOVER PAGE
// ============================================
async function loadDiscover(type = 'movie') {
    const container = document.getElementById('discover-results');
    if (!container) return;
    container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

    const res  = await fetch(`${API.movies}?action=trending&type=${type}&period=week`);
    const data = await res.json();

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'movie-grid';
    (data.results || []).forEach(movie => {
        grid.appendChild(createMovieCard(movie, type === 'all' ? (movie.media_type || 'movie') : type));
    });
    container.appendChild(grid);
}

// ============================================
// PREPORUKE PAGE
// ============================================
async function loadRecommend() {
    // Renderuj genre chips
    const chipsEl = document.getElementById('genre-chips');
    if (chipsEl && !chipsEl.children.length) {
        GENRES.forEach(g => {
            const chip = document.createElement('button');
            chip.className = `genre-chip${g.id === activeGenreId ? ' active' : ''}`;
            chip.textContent = g.name;
            chip.onclick = () => {
                document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeGenreId = g.id;
                loadRecommendSection('genre');
            };
            chipsEl.appendChild(chip);
        });
    }

    // Učitaj sve sekcije
    await Promise.all([
        loadRecommendSection('toprated'),
        loadRecommendSection('new'),
        loadRecommendSection('popular'),
        loadRecommendSection('genre'),
    ]);
}

async function loadRecommendSection(type) {
    const map = {
        toprated: { action: 'recommend_toprated', container: 'rec-toprated', label: 'Učitavam top ocijenjene...' },
        new:      { action: 'recommend_new',      container: 'rec-new',      label: 'Učitavam nove filmove...'   },
        popular:  { action: 'recommend_popular',  container: 'rec-popular',  label: 'Učitavam popularne...'      },
        genre:    { action: `recommend_genre&genre_id=${activeGenreId}`, container: 'rec-genre', label: 'Učitavam žanr...' },
    };

    const cfg = map[type];
    if (!cfg) return;

    const container = document.getElementById(cfg.container);
    if (!container) return;
    container.innerHTML = '<div class="loader"><div class="spinner"></div><span>' + cfg.label + '</span></div>';

    const res  = await fetch(`${API.movies}?action=${cfg.action}`);
    const data = await res.json();

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'movie-grid';
    (data.results || []).slice(0, 10).forEach(movie => {
        grid.appendChild(createMovieCard(movie, movie.media_type || 'movie'));
    });
    container.appendChild(grid);
}

// ============================================
// SEARCH
// ============================================
function initSearch() {
    const input   = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (!input || !results) return;

    input.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const q = input.value.trim();
        if (q.length < 2) { results.classList.remove('open'); return; }

        searchTimeout = setTimeout(async () => {
            const res  = await fetch(`${API.movies}?action=search&q=${encodeURIComponent(q)}`);
            const data = await res.json();
            renderSearchResults(data.results || [], results);
        }, 380);
    });

    document.addEventListener('click', e => {
        if (!input.contains(e.target) && !results.contains(e.target))
            results.classList.remove('open');
    });
}

function renderSearchResults(items, container) {
    container.innerHTML = '';
    if (!items.length) {
        container.innerHTML = '<div style="padding:1.25rem;color:var(--text-muted);text-align:center;font-size:0.85rem">Nema rezultata 😕</div>';
        container.classList.add('open');
        return;
    }

    items.slice(0, 7).forEach(item => {
        const type  = item.media_type || 'movie';
        const title = item.title || item.name || 'Nepoznato';
        const year  = (item.release_date || item.first_air_date || '').substring(0, 4);
        const img   = item.poster_path ? TMDB_IMG + item.poster_path : PLACEHOLDER;

        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
            <img class="search-result-thumb" src="${img}" alt="${title}" loading="lazy">
            <div style="min-width:0">
                <div style="font-weight:600;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
                <div style="font-size:0.73rem;color:var(--text-muted);margin-top:0.15rem">
                    ${type === 'tv' ? '📺 Serija' : '🎬 Film'} ${year ? '· ' + year : ''}
                    ${item.vote_average ? '· ★ ' + item.vote_average.toFixed(1) : ''}
                </div>
            </div>
        `;
        div.onclick = () => {
            openMovieDetails(item.id, type);
            container.classList.remove('open');
            document.getElementById('search-input').value = '';
        };
        container.appendChild(div);
    });

    container.classList.add('open');
}

// ============================================
// KREIRANJE KARTICE FILMA
// ============================================
function createMovieCard(movie, type = 'movie') {
    const title  = movie.title || movie.name || 'Nepoznato';
    const year   = (movie.release_date || movie.first_air_date || '').substring(0, 4);
    const rating = movie.vote_average?.toFixed(1) || 'N/A';
    const img    = movie.poster_path ? TMDB_IMG + movie.poster_path : PLACEHOLDER;

    const safeMovie = JSON.stringify({
        id: movie.id, title: title,
        poster_path: movie.poster_path || '',
        media_type: type
    }).replace(/"/g, '&quot;');

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img class="movie-card-poster" src="${img}" alt="${title}" loading="lazy">
        <div class="movie-card-rating">★ ${rating}</div>
        <div class="movie-card-type">${type === 'tv' ? '📺' : '🎬'}</div>
        <div class="movie-card-overlay">
            <div style="font-family:var(--font-display);font-size:0.95rem;font-weight:700;line-height:1.2">${title}</div>
            <div style="font-size:0.73rem;color:var(--text-secondary);margin-bottom:0.4rem">${year}</div>
            <div style="display:flex;gap:0.4rem">
                <button class="btn btn-primary btn-sm" style="flex:1" onclick="event.stopPropagation();openMovieDetails(${movie.id},'${type}')">Detalji</button>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openAddToWatchlist(${safeMovie})">+</button>
            </div>
        </div>
        <div class="movie-card-body">
            <div class="movie-card-title">${title}</div>
            <div class="movie-card-meta"><span>${year}</span><span style="color:var(--accent);font-weight:700">★ ${rating}</span></div>
        </div>
    `;
    card.onclick = () => openMovieDetails(movie.id, type);
    return card;
}

// ============================================
// MODAL: DETALJI FILMA
// ============================================
async function openMovieDetails(id, type = 'movie') {
    const modal = document.getElementById('modal-details');
    const body  = document.getElementById('modal-details-body');
    if (!modal || !body) return;

    body.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    openModal('modal-details');

    const res  = await fetch(`${API.movies}?action=details&id=${id}&type=${type}`);
    const data = await res.json();

    const title    = data.title || data.name || 'Nepoznato';
    const year     = (data.release_date || data.first_air_date || '').substring(0, 4);
    const rating   = data.vote_average?.toFixed(1) || 'N/A';
    const overview = data.overview || 'Nema opisa.';
    const poster   = data.poster_path ? TMDB_IMG + data.poster_path : PLACEHOLDER;
    const genres   = (data.genres || []).map(g => `<span class="badge badge-muted">${g.name}</span>`).join(' ');
    const cast     = (data.credits?.cast || []).slice(0, 5).map(a => a.name).join(', ');
    const director = (data.credits?.crew || []).find(c => c.job === 'Director')?.name || '';
    const runtime  = data.runtime ? `${data.runtime} min` : '';

    let myReview = null;
    if (currentUser) {
        const rRes  = await fetch(`${API.movies}?action=review_mine&tmdb_id=${id}&type=${type}`);
        const rData = await rRes.json();
        myReview = rData.review;
    }

    const safeTitle = title.replace(/'/g, "\\'");

    body.innerHTML = `
        <div style="display:grid;grid-template-columns:160px 1fr;gap:1.5rem;align-items:start">
            <img src="${poster}" alt="${title}" style="width:100%;border-radius:var(--radius);box-shadow:var(--shadow-card)">
            <div>
                <div style="font-size:0.7rem;color:var(--accent);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:0.5rem;font-weight:700">
                    ${type === 'tv' ? '📺 Serija' : '🎬 Film'} · ${year} ${runtime ? '· ' + runtime : ''}
                </div>
                <h2 style="font-family:var(--font-display);font-size:1.9rem;letter-spacing:-0.5px;margin-bottom:0.75rem;line-height:1.1">${title}</h2>
                <div style="margin-bottom:0.75rem;display:flex;align-items:center;gap:0.75rem">
                    <span style="color:var(--accent);font-weight:700;font-size:1.15rem">★ ${rating}</span>
                    <span style="color:var(--text-muted);font-size:0.82rem">/10 TMDB</span>
                </div>
                <div style="margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:0.4rem">${genres}</div>
                <p style="color:var(--text-secondary);line-height:1.75;font-size:0.875rem;margin-bottom:0.75rem">${overview}</p>
                ${director ? `<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.3rem"><span style="color:var(--text-secondary);font-weight:600">Redatelj:</span> ${director}</p>` : ''}
                ${cast     ? `<p style="font-size:0.78rem;color:var(--text-muted)"><span style="color:var(--text-secondary);font-weight:600">Glumci:</span> ${cast}</p>` : ''}
            </div>
        </div>

        <div class="divider" style="margin:1.5rem 0 1rem"></div>

        <div style="display:flex;gap:0.65rem;flex-wrap:wrap">
            ${currentUser ? `
                <button class="btn btn-primary" onclick="openReviewModal(${id},'${type}','${safeTitle}','${data.poster_path || ''}')">
                    ${myReview ? '✏️ Uredi recenziju' : '⭐ Dodaj recenziju'}
                </button>
                <button class="btn btn-secondary" onclick="openAddToWatchlist({id:${id},title:'${safeTitle}',poster_path:'${data.poster_path || ''}',media_type:'${type}'})">
                    📋 Dodaj u listu
                </button>
                <button class="btn btn-ghost" onclick="loadSimilar(${id},'${type}')">
                    🎯 Slični filmovi
                </button>
            ` : `
                <button class="btn btn-primary" onclick="openModal('modal-login')">Prijavi se za recenziju</button>
            `}
        </div>

        ${myReview ? `
            <div style="margin-top:1.25rem;background:var(--bg-primary);border:1px solid var(--border-light);border-radius:var(--radius);padding:1.1rem">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;letter-spacing:1px;margin-bottom:0.75rem">TVOJA OCJENA</div>
                <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
                    <span style="font-size:1.5rem">${myReview.emoji_reaction}</span>
                    <span style="color:var(--accent);font-size:1.05rem;font-weight:700">${myReview.rating}/5 ★</span>
                    <span class="badge badge-muted">${myReview.rewatch === 'definitely' ? '🔁 Gledao ponovo' : myReview.rewatch === 'maybe' ? '🤔 Možda ponovo' : '❌ Nikad više'}</span>
                    ${myReview.contains_spoiler ? '<span class="badge badge-red">⚠️ Spoiler</span>' : ''}
                </div>
                ${myReview.review_text ? `<p style="margin-top:0.75rem;color:var(--text-secondary);font-size:0.875rem;line-height:1.6">${myReview.review_text}</p>` : ''}
            </div>
        ` : ''}

        <div id="similar-section"></div>
    `;
}

async function loadSimilar(id, type) {
    const section = document.getElementById('similar-section');
    if (!section) return;
    section.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

    const res  = await fetch(`${API.movies}?action=recommend_similar&id=${id}&type=${type}`);
    const data = await res.json();
    const items = (data.results || []).slice(0, 6);

    if (!items.length) { section.innerHTML = ''; return; }

    section.innerHTML = `
        <div class="divider" style="margin:1.5rem 0 1rem"></div>
        <div style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1rem">🎯 Slični filmovi</div>
        <div class="movie-grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))"></div>
    `;
    const grid = section.querySelector('.movie-grid');
    items.forEach(m => grid.appendChild(createMovieCard(m, m.media_type || type)));
}

// ============================================
// MODAL: RECENZIJA
// ============================================
function openReviewModal(tmdbId, type, title, posterPath) {
    const modal = document.getElementById('modal-review');
    if (!modal) return;

    document.getElementById('review-tmdb-id').value    = tmdbId;
    document.getElementById('review-type').value       = type;
    document.getElementById('review-title-val').value  = title;
    document.getElementById('review-poster').value     = posterPath;
    document.getElementById('modal-review-title').textContent = title;

    openModal('modal-review');
}

async function submitReview() {
    if (!currentUser) { showToast('Prijavite se!', 'error'); return; }

    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    if (!rating) { showToast('Odaberite ocjenu!', 'error'); return; }

    const emoji   = document.querySelector('.emoji-btn.selected')?.textContent || '🎬';
    const rewatch = document.querySelector('input[name="rewatch"]:checked')?.value || 'maybe';

    const payload = {
        tmdb_id:          parseInt(document.getElementById('review-tmdb-id').value),
        media_type:       document.getElementById('review-type').value,
        title:            document.getElementById('review-title-val').value,
        poster_path:      document.getElementById('review-poster').value,
        rating:           parseFloat(rating),
        emoji_reaction:   emoji,
        review_text:      document.getElementById('review-text').value,
        rewatch,
        contains_spoiler: document.getElementById('review-spoiler').checked ? 1 : 0,
    };

    const res  = await fetch(`${API.movies}?action=review_add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
        showToast('Recenzija sačuvana! ⭐', 'success');
        closeModal('modal-review');
    } else {
        showToast(data.error || 'Greška!', 'error');
    }
}

// ============================================
// WATCHLIST
// ============================================
function openAddToWatchlist(movie) {
    if (!currentUser) { openModal('modal-login'); return; }
    if (typeof movie === 'string') movie = JSON.parse(movie);

    document.getElementById('wl-tmdb-id').value = movie.id || movie.tmdb_id;
    document.getElementById('wl-title').value   = movie.title || movie.name;
    document.getElementById('wl-poster').value  = movie.poster_path || '';
    document.getElementById('wl-type').value    = movie.media_type || 'movie';
    document.getElementById('modal-wl-title').textContent = movie.title || movie.name;

    openModal('modal-watchlist');
}

async function submitWatchlist() {
    if (!currentUser) return;

    const payload = {
        tmdb_id:     parseInt(document.getElementById('wl-tmdb-id').value),
        title:       document.getElementById('wl-title').value,
        poster_path: document.getElementById('wl-poster').value,
        media_type:  document.getElementById('wl-type').value,
        priority:    document.querySelector('input[name="wl-priority"]:checked')?.value || 'when_in_mood',
        note:        document.getElementById('wl-note').value,
    };

    const res  = await fetch(`${API.movies}?action=watchlist_add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
        showToast('Dodano u watchlist! 📋', 'success');
        closeModal('modal-watchlist');
        if (currentPage === 'watchlist') loadWatchlist();
    } else {
        showToast(data.error || 'Greška!', 'error');
    }
}

async function loadWatchlist() {
    const container = document.getElementById('watchlist-content');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔒</div>
                <div class="empty-state-title">Prijavite se</div>
                <div class="empty-state-text">Prijavite se da vidite svoju watchlistu</div>
                <button class="btn btn-primary" onclick="openModal('modal-login')">Prijavi se</button>
            </div>`;
        return;
    }

    container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

    const res   = await fetch(`${API.movies}?action=watchlist_get`);
    const data  = await res.json();
    const items = data.results || [];

    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">Watchlist je prazan</div>
                <div class="empty-state-text">Dodaj filmove koje želiš gledati</div>
                <button class="btn btn-primary" onclick="loadPage('discover')">Istraži filmove</button>
            </div>`;
        return;
    }

    const priorityLabels = {
        must_watch:   '🔥 Moram gledati',
        when_in_mood: '😊 Kad budem raspoložen',
        someday:      '📅 Jednog dana'
    };

    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.65rem">
            ${items.map(item => `
                <div class="watchlist-item">
                    <div class="priority-dot priority-${item.priority}"></div>
                    <img class="watchlist-poster" src="${item.poster_path ? TMDB_IMG + item.poster_path : PLACEHOLDER}" alt="${item.title}" loading="lazy">
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.2rem;font-family:var(--font-display)">${item.title}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">${priorityLabels[item.priority] || ''} · ${item.media_type === 'tv' ? '📺 Serija' : '🎬 Film'}</div>
                        ${item.note ? `<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;font-style:italic">"${item.note}"</div>` : ''}
                    </div>
                    <div style="display:flex;gap:0.4rem">
                        <button class="btn btn-ghost btn-sm" onclick="openMovieDetails(${item.tmdb_id},'${item.media_type}')">Detalji</button>
                        <button class="btn btn-danger btn-sm" onclick="removeFromWatchlist(${item.id})">✕</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function removeFromWatchlist(id) {
    const res  = await fetch(`${API.movies}?action=watchlist_remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) { showToast('Uklonjeno!', 'info'); loadWatchlist(); }
}

// ============================================
// PROFIL
// ============================================
async function loadProfile() {
    const container = document.getElementById('profile-content');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <div class="empty-state-title">Prijavite se</div>
                <div class="empty-state-text">Prijavite se da vidite profil</div>
                <button class="btn btn-primary" onclick="openModal('modal-login')">Prijavi se</button>
            </div>`;
        return;
    }

    container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

    const res  = await fetch(`${API.movies}?action=profile_stats`);
    const data = await res.json();
    const { user, stats, genres, recent } = data;

    const rankColors = {
        'Novajlija': '#6b6560',
        'Filmofil':  '#57cc99',
        'Kritičar':  '#60a5fa',
        'Cineasta':  '#f5a623',
        'Legenda':   '#e63946'
    };
    const rankColor = rankColors[user.film_rank] || '#6b6560';

    container.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">🎬</div>
            <div>
                <h2 style="font-family:var(--font-display);font-size:2rem;letter-spacing:-0.5px">${user.username}</h2>
                <div style="margin-top:0.3rem">
                    <span class="badge" style="background:rgba(0,0,0,0.4);color:${rankColor};border:1px solid ${rankColor}">${user.film_rank}</span>
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem">
                    Član od ${new Date(user.created_at).toLocaleDateString('bs')}
                </div>
            </div>
        </div>

        <div class="profile-stats">
            <div class="stat-card">
                <div class="stat-number">${stats.total || 0}</div>
                <div class="stat-label">Pogledano</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="font-size:2rem">${stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : '–'}</div>
                <div class="stat-label">Prosj. ocjena</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Math.round((stats.total || 0) * 1.8)}h</div>
                <div class="stat-label">Sati</div>
            </div>
        </div>

        ${genres.length ? `
            <h3 style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:1rem">🎭 Filmski DNK</h3>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:2rem">
                ${genres.map(g => `<span class="badge badge-accent" style="font-size:0.82rem;padding:0.35rem 0.75rem">${g.genre_name} <span style="opacity:0.6">(${g.count})</span></span>`).join('')}
            </div>
        ` : ''}

        ${recent.length ? `
            <h3 style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:1rem">⭐ Nedavno ocijenjeno</h3>
            <div class="movie-grid">
                ${recent.map(r => `
                    <div class="movie-card" onclick="openMovieDetails(${r.tmdb_id},'${r.media_type}')">
                        <img class="movie-card-poster" src="${r.poster_path ? TMDB_IMG + r.poster_path : PLACEHOLDER}" alt="${r.title}" loading="lazy">
                        <div class="movie-card-rating">${r.emoji_reaction} ${r.rating}</div>
                        <div class="movie-card-body">
                            <div class="movie-card-title">${r.title}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
}

// ============================================
// RANDOM MOOD
// ============================================
function loadRandomPage() {
    const result = document.getElementById('random-result');
    if (result) result.innerHTML = '';
}

async function getRandomMovie(mood, e) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    e.currentTarget.classList.add('selected');

    const container = document.getElementById('random-result');
    container.innerHTML = '<div class="loader"><div class="spinner"></div><span>Tražim film za tebe...</span></div>';

    const res  = await fetch(`${API.movies}?action=random&mood=${mood}`);
    const data = await res.json();

    if (data.error) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">😕</div><p>${data.error}</p></div>`;
        return;
    }

    const img = data.poster_path ? TMDB_IMG + data.poster_path : PLACEHOLDER;
    container.innerHTML = `
        <div style="display:flex;gap:1.5rem;align-items:flex-start;background:var(--bg-card);border:1px solid var(--border-light);border-radius:var(--radius);padding:1.5rem;max-width:620px;margin:0 auto;animation:pageIn 0.3s ease">
            <img src="${img}" style="width:130px;border-radius:var(--radius);flex-shrink:0;box-shadow:var(--shadow-card)" alt="${data.title}">
            <div>
                <div style="font-size:0.7rem;color:var(--accent);letter-spacing:2px;text-transform:uppercase;margin-bottom:0.4rem;font-weight:700">Preporuka za večeras</div>
                <h3 style="font-family:var(--font-display);font-size:2rem;letter-spacing:-0.5px;margin-bottom:0.4rem">${data.title}</h3>
                <div style="color:var(--accent);font-weight:700;margin-bottom:0.75rem">★ ${data.vote_average?.toFixed(1)} · ${(data.release_date || '').substring(0,4)}</div>
                <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.7;margin-bottom:1.25rem">${(data.overview || '').substring(0, 200)}...</p>
                <div style="display:flex;gap:0.65rem;flex-wrap:wrap">
                    <button class="btn btn-primary btn-sm" onclick="openMovieDetails(${data.id},'movie')">Više detalja</button>
                    <button class="btn btn-secondary btn-sm" onclick="getRandomMovie('${mood}', event)">🎲 Druga preporuka</button>
                    <button class="btn btn-ghost btn-sm" onclick="openAddToWatchlist({id:${data.id},title:'${(data.title||'').replace(/'/g,"\\'")}',poster_path:'${data.poster_path||''}',media_type:'movie'})">+ Lista</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// DUEL
// ============================================
async function loadDuel() {
    const container = document.getElementById('duel-content');
    if (!container) return;
    container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

    const [r1, r2] = await Promise.all([
        fetch(`${API.movies}?action=random`).then(r => r.json()),
        fetch(`${API.movies}?action=random&mood=action`).then(r => r.json())
    ]);

    const img1 = r1.poster_path ? TMDB_IMG + r1.poster_path : PLACEHOLDER;
    const img2 = r2.poster_path ? TMDB_IMG + r2.poster_path : PLACEHOLDER;

    container.innerHTML = `
        <div style="text-align:center;margin-bottom:2.5rem">
            <h2 style="font-family:var(--font-display);font-size:2.5rem;letter-spacing:-0.5px">FILMSKI DVOBOJ</h2>
            <p style="color:var(--text-muted);margin-top:0.25rem">Koji film je bolji? Glasaj i odluči!</p>
        </div>
        <div class="duel-container">
            <div class="duel-card" id="duel-card-1" onclick="voteDuel(1)">
                <img class="duel-poster" src="${img1}" alt="${r1.title}">
                <div style="padding:1rem">
                    <div style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;margin-bottom:0.25rem">${r1.title}</div>
                    <div style="font-size:0.8rem;color:var(--accent)">★ ${r1.vote_average?.toFixed(1) || 'N/A'}</div>
                </div>
            </div>
            <div class="duel-vs">VS</div>
            <div class="duel-card" id="duel-card-2" onclick="voteDuel(2)">
                <img class="duel-poster" src="${img2}" alt="${r2.title}">
                <div style="padding:1rem">
                    <div style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;margin-bottom:0.25rem">${r2.title}</div>
                    <div style="font-size:0.8rem;color:var(--accent)">★ ${r2.vote_average?.toFixed(1) || 'N/A'}</div>
                </div>
            </div>
        </div>
        <div style="text-align:center;margin-top:2rem">
            <button class="btn btn-secondary" onclick="loadDuel()">🔄 Novi dvoboj</button>
        </div>
    `;
}

function voteDuel(winner) {
    const winCard  = document.getElementById(`duel-card-${winner}`);
    const loseCard = document.getElementById(`duel-card-${winner === 1 ? 2 : 1}`);
    if (!winCard) return;

    winCard.classList.add('voted-winner');
    if (loseCard) loseCard.style.opacity = '0.4';
    document.querySelectorAll('.duel-card').forEach(c => c.style.pointerEvents = 'none');
    showToast(`Glasala si za pobjednika! 🏆`, 'success');
}

// ============================================
// AUTH
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    errEl.textContent = '';

    const res  = await fetch(`${API.auth}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
        currentUser = data.user;
        updateNavForUser();
        closeModal('modal-login');
        showToast(`Dobrodošla, ${data.user.username}! 🎬`, 'success');
        loadPage(currentPage);
    } else {
        errEl.textContent = data.error || 'Greška pri prijavi.';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email    = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const errEl    = document.getElementById('reg-error');
    errEl.textContent = '';

    const res  = await fetch(`${API.auth}?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (data.success) {
        currentUser = data.user;
        updateNavForUser();
        closeModal('modal-register');
        showToast(`Dobrodošla na FilmiGO, ${data.user.username}! 🎬`, 'success');
        loadPage(currentPage);
    } else {
        errEl.textContent = data.error || 'Greška pri registraciji.';
    }
}

async function handleLogout() {
    await fetch(`${API.auth}?action=logout`);
    currentUser = null;
    updateNavForUser();
    showToast('Uspješno si se odjavila.', 'info');
    loadPage('home');
}

// ============================================
// MODALI
// ============================================
function initModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
}

function openModal(id)  {
    document.getElementById(id)?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
    document.body.style.overflow = '';
}

function selectEmoji(btn) {
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

// ============================================
// TOAST
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast     = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'all 0.3s ease';
        toast.style.opacity    = '0';
        toast.style.transform  = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Keyboard ESC
document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
        document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
});

<?php
// ============================================
// FilmiGO - Filmovi API
// ============================================

require_once 'config.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'trending':          getTrending();           break;
    case 'search':            searchMovies();          break;
    case 'details':           getDetails();            break;
    case 'watchlist_add':     addToWatchlist();        break;
    case 'watchlist_get':     getWatchlist();          break;
    case 'watchlist_remove':  removeFromWatchlist();   break;
    case 'review_add':        addReview();             break;
    case 'review_get':        getReviews();            break;
    case 'review_mine':       getMyReview();           break;
    case 'random':            getRandomMovie();        break;
    case 'profile_stats':     getProfileStats();       break;
    case 'recommend_genre':   recommendByGenre();      break;
    case 'recommend_similar': recommendSimilar();      break;
    case 'recommend_toprated':recommendTopRated();     break;
    case 'recommend_new':     recommendNewReleases();  break;
    case 'recommend_popular': recommendPopular();      break;
    default: jsonResponse(['error' => 'Nepoznata akcija.'], 400);
}

// --- TMDB API poziv ---
function tmdbFetch($endpoint, $params = []) {
    $params['api_key']  = TMDB_API_KEY;
    $params['language'] = 'bs-BA';
    $url      = TMDB_BASE_URL . $endpoint . '?' . http_build_query($params);
    $response = @file_get_contents($url);
    if ($response === false) return ['results' => []];
    return json_decode($response, true);
}

// --- Trendovi ---
function getTrending() {
    $type   = $_GET['type']   ?? 'all';
    $period = $_GET['period'] ?? 'week';
    $data   = tmdbFetch("/trending/{$type}/{$period}");
    jsonResponse($data);
}

// --- Pretraga ---
function searchMovies() {
    $query = $_GET['q']    ?? '';
    $page  = $_GET['page'] ?? 1;
    if (!$query) jsonResponse(['error' => 'Unesite pojam za pretragu.'], 400);
    $data = tmdbFetch('/search/multi', ['query' => $query, 'page' => $page]);
    jsonResponse($data);
}

// --- Detalji filma/serije ---
function getDetails() {
    $id   = $_GET['id']   ?? '';
    $type = $_GET['type'] ?? 'movie';
    if (!$id) jsonResponse(['error' => 'ID je obavezan.'], 400);

    $data    = tmdbFetch("/{$type}/{$id}", ['append_to_response' => 'credits,videos,similar']);
    $reviews = [];

    if (isLoggedIn()) {
        $db   = getDB();
        $uid  = $_SESSION['user_id'];
        $stmt = $db->prepare("SELECT r.*, u.username, u.avatar FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.tmdb_id = ? AND r.media_type = ? ORDER BY r.watched_at DESC LIMIT 10");
        $stmt->bind_param('is', $id, $type);
        $stmt->execute();
        $reviews = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    $data['cv_reviews'] = $reviews;
    jsonResponse($data);
}

// --- Dodaj u watchlist ---
function addToWatchlist() {
    requireLogin();
    $data      = json_decode(file_get_contents('php://input'), true);
    $userId    = $_SESSION['user_id'];
    $tmdbId    = $data['tmdb_id']    ?? 0;
    $title     = $data['title']      ?? '';
    $poster    = $data['poster_path'] ?? '';
    $mediaType = $data['media_type'] ?? 'movie';
    $priority  = $data['priority']   ?? 'when_in_mood';
    $note      = $data['note']       ?? '';

    if (!$tmdbId || !$title) jsonResponse(['error' => 'Podaci nisu kompletni.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("INSERT INTO watchlist (user_id, tmdb_id, title, poster_path, media_type, priority, note) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE priority = VALUES(priority), note = VALUES(note)");
    $stmt->bind_param('iisssss', $userId, $tmdbId, $title, $poster, $mediaType, $priority, $note);

    if ($stmt->execute()) {
        jsonResponse(['success' => true, 'message' => 'Dodano u watchlist!']);
    } else {
        jsonResponse(['error' => 'Greška pri dodavanju.'], 500);
    }
}

// --- Dohvati watchlist ---
function getWatchlist() {
    requireLogin();
    $userId   = $_SESSION['user_id'];
    $priority = $_GET['priority'] ?? '';
    $type     = $_GET['type']     ?? '';

    $db     = getDB();
    $sql    = "SELECT * FROM watchlist WHERE user_id = ?";
    $params = [$userId];
    $types  = 'i';

    if ($priority) { $sql .= " AND priority = ?";    $params[] = $priority; $types .= 's'; }
    if ($type)     { $sql .= " AND media_type = ?";  $params[] = $type;     $types .= 's'; }
    $sql .= " ORDER BY added_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    jsonResponse(['results' => $items, 'total' => count($items)]);
}

// --- Ukloni iz watchliste ---
function removeFromWatchlist() {
    requireLogin();
    $data   = json_decode(file_get_contents('php://input'), true);
    $userId = $_SESSION['user_id'];
    $id     = $data['id'] ?? 0;

    $db   = getDB();
    $stmt = $db->prepare("DELETE FROM watchlist WHERE id = ? AND user_id = ?");
    $stmt->bind_param('ii', $id, $userId);
    $stmt->execute();

    jsonResponse(['success' => true]);
}

// --- Dodaj recenziju ---
function addReview() {
    requireLogin();
    $data      = json_decode(file_get_contents('php://input'), true);
    $userId    = $_SESSION['user_id'];
    $tmdbId    = $data['tmdb_id']          ?? 0;
    $title     = $data['title']            ?? '';
    $poster    = $data['poster_path']      ?? '';
    $mediaType = $data['media_type']       ?? 'movie';
    $rating    = $data['rating']           ?? 0;
    $emoji     = $data['emoji_reaction']   ?? '🎬';
    $review    = $data['review_text']      ?? '';
    $rewatch   = $data['rewatch']          ?? 'maybe';
    $spoiler   = $data['contains_spoiler'] ?? 0;

    if (!$tmdbId || !$rating) jsonResponse(['error' => 'Podaci nisu kompletni.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("INSERT INTO reviews (user_id, tmdb_id, title, poster_path, media_type, rating, emoji_reaction, review_text, rewatch, contains_spoiler) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating=VALUES(rating), emoji_reaction=VALUES(emoji_reaction), review_text=VALUES(review_text), rewatch=VALUES(rewatch), contains_spoiler=VALUES(contains_spoiler)");
    $stmt->bind_param('iisssdssi', $userId, $tmdbId, $title, $poster, $mediaType, $rating, $emoji, $review, $rewatch, $spoiler);

    if ($stmt->execute()) {
        updateUserRank($userId, $db);
        jsonResponse(['success' => true, 'message' => 'Recenzija sačuvana!']);
    } else {
        jsonResponse(['error' => 'Greška pri čuvanju.'], 500);
    }
}

// --- Dohvati recenzije za film ---
function getReviews() {
    $tmdbId = $_GET['tmdb_id'] ?? 0;
    $type   = $_GET['type']    ?? 'movie';
    if (!$tmdbId) jsonResponse(['error' => 'ID je obavezan.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT r.*, u.username, u.avatar FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.tmdb_id = ? AND r.media_type = ? ORDER BY r.watched_at DESC");
    $stmt->bind_param('is', $tmdbId, $type);
    $stmt->execute();
    $reviews = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    jsonResponse(['results' => $reviews]);
}

// --- Moja recenzija ---
function getMyReview() {
    requireLogin();
    $tmdbId = $_GET['tmdb_id'] ?? 0;
    $type   = $_GET['type']    ?? 'movie';
    $userId = $_SESSION['user_id'];

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM reviews WHERE user_id = ? AND tmdb_id = ? AND media_type = ?");
    $stmt->bind_param('iis', $userId, $tmdbId, $type);
    $stmt->execute();
    $review = $stmt->get_result()->fetch_assoc();

    jsonResponse(['review' => $review]);
}

// --- Random film ---
function getRandomMovie() {
    $mood     = $_GET['mood'] ?? '';
    $genreMap = [
        'funny'   => 35,
        'sad'     => 18,
        'action'  => 28,
        'scary'   => 27,
        'romance' => 10749,
        'scifi'   => 878,
        'fantasy' => 14,
        'crime'   => 80,
        'animation' => 16,
    ];

    $params = ['sort_by' => 'popularity.desc', 'page' => rand(1, 5), 'vote_count.gte' => 100];
    if (isset($genreMap[$mood])) $params['with_genres'] = $genreMap[$mood];

    $data   = tmdbFetch('/discover/movie', $params);
    $movies = $data['results'] ?? [];

    if (empty($movies)) jsonResponse(['error' => 'Nema rezultata.'], 404);

    $random = $movies[array_rand($movies)];
    jsonResponse($random);
}

// ============================================
// PREPORUKE
// ============================================

// 1. Preporuke po žanru
function recommendByGenre() {
    $genreId = $_GET['genre_id'] ?? 28;
    $page    = $_GET['page']     ?? 1;

    $data = tmdbFetch('/discover/movie', [
        'with_genres'      => $genreId,
        'sort_by'          => 'vote_average.desc',
        'vote_count.gte'   => 200,
        'page'             => $page,
    ]);
    jsonResponse($data);
}

// 2. Slični filmovi (na osnovu ID-a)
function recommendSimilar() {
    $id   = $_GET['id']   ?? 0;
    $type = $_GET['type'] ?? 'movie';
    if (!$id) jsonResponse(['error' => 'ID je obavezan.'], 400);

    $data = tmdbFetch("/{$type}/{$id}/recommendations");
    jsonResponse($data);
}

// 3. Najbolje ocijenjeni
function recommendTopRated() {
    $type = $_GET['type'] ?? 'movie';
    $page = $_GET['page'] ?? 1;
    $data = tmdbFetch("/{$type}/top_rated", ['page' => $page]);
    jsonResponse($data);
}

// 4. Novi filmovi (sada u kinima / uskoro)
function recommendNewReleases() {
    $type = $_GET['type'] ?? 'now_playing'; // now_playing ili upcoming
    $data = tmdbFetch("/movie/{$type}");
    jsonResponse($data);
}

// 5. Popularni ove sedmice
function recommendPopular() {
    $type = $_GET['type'] ?? 'movie';
    $page = $_GET['page'] ?? 1;
    $data = tmdbFetch("/{$type}/popular", ['page' => $page]);
    jsonResponse($data);
}

// --- Statistike profila ---
function getProfileStats() {
    requireLogin();
    $userId = $_SESSION['user_id'];
    $db     = getDB();

    $stmt = $db->prepare("SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM reviews WHERE user_id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $stats = $stmt->get_result()->fetch_assoc();

    $stmt = $db->prepare("SELECT genre_name, count FROM user_genres WHERE user_id = ? ORDER BY count DESC LIMIT 5");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $genres = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $stmt = $db->prepare("SELECT * FROM reviews WHERE user_id = ? ORDER BY watched_at DESC LIMIT 6");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $recent = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $stmt = $db->prepare("SELECT username, film_rank, total_watched, avatar, bio, created_at FROM users WHERE id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    jsonResponse([
        'user'   => $user,
        'stats'  => $stats,
        'genres' => $genres,
        'recent' => $recent,
    ]);
}

// --- Ažuriraj rank ---
function updateUserRank($userId, $db) {
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM reviews WHERE user_id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $count = $stmt->get_result()->fetch_assoc()['cnt'];

    $rank = 'Novajlija';
    if ($count >= 5)   $rank = 'Filmofil';
    if ($count >= 20)  $rank = 'Kritičar';
    if ($count >= 50)  $rank = 'Cineasta';
    if ($count >= 100) $rank = 'Legenda';

    $stmt = $db->prepare("UPDATE users SET total_watched = ?, film_rank = ? WHERE id = ?");
    $stmt->bind_param('isi', $count, $rank, $userId);
    $stmt->execute();
}
?>

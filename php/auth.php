<?php
// ============================================
// FilmiGO - Autentifikacija API
// ============================================

require_once 'config.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register': handleRegister(); break;
    case 'login':    handleLogin();    break;
    case 'logout':   handleLogout();   break;
    case 'check':    handleCheck();    break;
    default: jsonResponse(['error' => 'Nepoznata akcija.'], 400);
}

function handleRegister() {
    $data     = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $email    = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (!$username || !$email || !$password)
        jsonResponse(['error' => 'Sva polja su obavezna.'], 400);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL))
        jsonResponse(['error' => 'Neispravan email format.'], 400);

    if (strlen($password) < 6)
        jsonResponse(['error' => 'Lozinka mora imati najmanje 6 znakova.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param('ss', $username, $email);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0)
        jsonResponse(['error' => 'Korisničko ime ili email već postoji.'], 409);

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt   = $db->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
    $stmt->bind_param('sss', $username, $email, $hashed);

    if ($stmt->execute()) {
        $userId = $db->insert_id;
        $_SESSION['user_id']  = $userId;
        $_SESSION['username'] = $username;
        jsonResponse(['success' => true, 'user' => ['id' => $userId, 'username' => $username]]);
    } else {
        jsonResponse(['error' => 'Greška pri registraciji.'], 500);
    }
}

function handleLogin() {
    $data     = json_decode(file_get_contents('php://input'), true);
    $email    = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (!$email || !$password)
        jsonResponse(['error' => 'Email i lozinka su obavezni.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT id, username, password, film_rank, avatar FROM users WHERE email = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user || !password_verify($password, $user['password']))
        jsonResponse(['error' => 'Pogrešan email ili lozinka.'], 401);

    $_SESSION['user_id']  = $user['id'];
    $_SESSION['username'] = $user['username'];

    jsonResponse(['success' => true, 'user' => [
        'id'        => $user['id'],
        'username'  => $user['username'],
        'film_rank' => $user['film_rank'],
        'avatar'    => $user['avatar']
    ]]);
}

function handleLogout() {
    session_destroy();
    jsonResponse(['success' => true]);
}

function handleCheck() {
    if (!isLoggedIn())
        jsonResponse(['logged_in' => false]);

    $db   = getDB();
    $id   = $_SESSION['user_id'];
    $stmt = $db->prepare("SELECT id, username, film_rank, avatar, total_watched FROM users WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    jsonResponse(['logged_in' => true, 'user' => $user]);
}
?>

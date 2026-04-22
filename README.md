# 🎬 FilmiGO

> Tvoja personalna filmska riznica – ocjenjuj, prati i otkrivaj filmove i serije.

![PHP](https://img.shields.io/badge/PHP-8.0+-777BB4?style=flat-square&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![TMDB](https://img.shields.io/badge/TMDB-API-01B4E4?style=flat-square&logo=themoviedatabase&logoColor=white)

---

## 📖 O projektu

**FilmiGO** je web aplikacija koja korisnicima omogućava praćenje filmova i serija, pisanje recenzija, kreiranje personalizovane watchliste i otkrivanje novih naslova prema raspoloženju. Podaci o filmovima se dohvataju u realnom vremenu putem **TMDB (The Movie Database) API-ja**.

Projekat je razvijen kao studentski seminarski rad u okviru predmeta *Web programiranje*, koristeći isključivo vanilla tehnologije bez heavy frameworka na frontendu.

---

## ✨ Funkcionalnosti

| Funkcija | Opis |
|---|---|
| 🏠 **Početna stranica** | Hero sekcija s filmom dana + trending filmovi i serije |
| 🔍 **Live pretraga** | Pretraga filmova i serija u realnom vremenu |
| 📺 **Istraži** | Grid prikaz s filterom po tipu (filmovi / serije / sve) |
| ⭐ **Recenzije** | Ocjene zvjezdicama, emoji reakcija, rewatch faktor, spoiler tag |
| 📋 **Watchlist** | Lista za gledanje s prioritetima (Moram / Kad budem raspoložen / Jednog dana) |
| 👤 **Korisnički profil** | Statistike, filmski DNK, rank sistem |
| 🎲 **Iznenadi me** | Random preporuka filma prema raspoloženju |
| 🥊 **Filmski dvoboj** | Glasanje između dva filma |

### 🏆 Rank sistem

Korisnici napreduju kroz rankove na osnovu broja ocijenjenih filmova:

```
Novajlija  →  Filmofil  →  Kritičar  →  Cineasta  →  Legenda
   0-4           5-19        20-49        50-99        100+
```

---

## 🛠️ Tehnologije

**Frontend**
- HTML5
- CSS3 (Custom Properties, Grid, Flexbox, animacije)
- JavaScript ES6+ (Fetch API, DOM manipulacija, SPA routing)

**Backend**
- PHP 8.0+ (REST API endpointi, prepared statements)
- MySQL 8.0 (relacijska baza podataka)

**Eksterni API**
- [TMDB API](https://www.themoviedb.org/documentation/api) – podaci o filmovima, posterima, ocjenama

**Fontovi**
- Bebas Neue – display naslovi
- DM Sans – body tekst

---

## 📁 Struktura projekta

```
filmigo/
├── index.html              # Glavna stranica (Single Page Application)
├── database.sql            # SQL skripta za kreiranje baze
├── README.md
├── css/
│   └── style.css           # Svi stilovi (dark kino tema)
├── js/
│   └── app.js              # Frontend logika, API pozivi, routing
└── php/
    ├── config.php          # Konfiguracija baze i TMDB API ključa
    ├── auth.php            # Registracija, prijava, sesija
    └── movies.php          # TMDB proxy, watchlist, recenzije, profil
```

---

## ⚙️ Instalacija i pokretanje

### Preduslovi

- [XAMPP](https://www.apachefriends.org/) ili drugi lokalni web server s PHP i MySQL podrškom
- Besplatan TMDB API ključ

### Korak 1 – Kloniraj repozitorij

```bash
git clone https://github.com/korisnicko-ime/filmigo.git
cd filmigo
```

### Korak 2 – TMDB API ključ

1. Registruj se na [themoviedb.org](https://www.themoviedb.org/signup)
2. Idi na **Settings → API** i zatraži API ključ (besplatno)
3. U fajlu `php/config.php` zamijeni placeholder:

```php
define('TMDB_API_KEY', 'TVOJ_API_KLJUC_OVDJE');
```

### Korak 3 – Baza podataka

1. Pokreni XAMPP i otvori **phpMyAdmin** (`http://localhost/phpmyadmin`)
2. Kreiraj novu bazu podataka pod imenom `filmigo`
3. Importuj fajl `database.sql`

Ili putem MySQL terminala:

```bash
mysql -u root -p < database.sql
```

U fajlu `php/config.php` postavi svoje podatke:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'filmigo');
```

### Korak 4 – Pokretanje

1. Kopiraj folder projekta u `C:/xampp/htdocs/filmigo/`
2. Pokreni Apache i MySQL u XAMPP Control Panelu
3. Otvori browser i posjeti:

```
http://localhost/filmigo/
```

---

## 🗄️ Baza podataka – Dijagram tablica

```
users ─────────────────────────────────────────────────────
  id, username, email, password, avatar, bio,
  film_rank, total_watched, created_at

watchlist ──────────────────────────────────────────────────
  id, user_id(FK), tmdb_id, title, poster_path,
  media_type, priority, note, added_at

reviews ────────────────────────────────────────────────────
  id, user_id(FK), tmdb_id, title, poster_path,
  media_type, rating, emoji_reaction, review_text,
  rewatch, contains_spoiler, watched_at

friendships ────────────────────────────────────────────────
  id, requester_id(FK), receiver_id(FK), status, created_at

user_genres ────────────────────────────────────────────────
  id, user_id(FK), genre_id, genre_name, count

duels ──────────────────────────────────────────────────────
  id, creator_id(FK), tmdb_id_1, title_1, poster_1,
  tmdb_id_2, title_2, poster_2, votes_1, votes_2, created_at

duel_votes ─────────────────────────────────────────────────
  id, duel_id(FK), user_id(FK), voted_for, voted_at
```

---

## 🔒 Sigurnost

- Lozinke se hashuju pomoću `password_hash()` (bcrypt algoritam)
- Svi SQL upiti koriste **prepared statements** (zaštita od SQL injection)
- PHP sesije za upravljanje autentifikacijom
- Server-side validacija svih ulaznih podataka

---


## 👨‍💻 Autor

**Adna Sarvan**

Politehnički fakultet Zenica / Softversko inženjerstvo

Univerzitet u Zenici

---

## 📄 Licenca

Ovaj projekat je razvijen u obrazovne svrhe.

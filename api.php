<?php
// --- PHP: tiny JSON-file "database" for the feedback board ---
header('Content-Type: application/json');
date_default_timezone_set('Asia/Manila');

$dataFile = __DIR__ . '/feedback.json';

function read_entries(string $file): array {
    if (!file_exists($file)) {
        return [];
    }
    $raw = file_get_contents($file);
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function write_entries(string $file, array $entries): bool {
    $fp = fopen($file, 'c+');
    if (!$fp) {
        return false;
    }
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($entries, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $entries = read_entries($dataFile);
    // Newest first
    $entries = array_reverse($entries);
    echo json_encode(['ok' => true, 'entries' => $entries]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $name    = trim($input['name'] ?? '');
    $message = trim($input['message'] ?? '');

    $errors = [];
    if ($name === '') {
        $errors['name'] = 'Name is required.';
    } elseif (mb_strlen($name) > 60) {
        $errors['name'] = 'Keep it under 60 characters.';
    }

    if ($message === '') {
        $errors['message'] = 'Say something first.';
    } elseif (mb_strlen($message) > 400) {
        $errors['message'] = 'Keep it under 400 characters.';
    }

    if (!empty($errors)) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'errors' => $errors]);
        exit;
    }

    $entry = [
        'id'      => uniqid('sig_', true),
        'name'    => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
        'message' => htmlspecialchars($message, ENT_QUOTES, 'UTF-8'),
        'time'    => date('j M Y, g:i A'),
    ];

    $entries   = read_entries($dataFile);
    $entries[] = $entry;
    write_entries($dataFile, $entries);

    echo json_encode(['ok' => true, 'entry' => $entry, 'count' => count($entries)]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method not allowed']);

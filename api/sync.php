<?php
/**
 * api/sync.php
 *
 * Endpoint minimale per il backup/sincronizzazione online delle routine.
 * Nessuna vera autenticazione: la passphrase stessa fa da "chiave di
 * accesso" (chi la conosce puo' leggere/scrivere quel backup, nessun altro).
 * Un solo backup per passphrase, sempre sovrascritto (nessuno storico).
 *
 * Richieste accettate: solo POST, corpo JSON.
 *   { "action": "pull", "passphrase": "..." }
 *   { "action": "push", "passphrase": "...", "data": {...}, "lastModified": 1234567890 }
 */

header('Content-Type: application/json; charset=utf-8');

function respond($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, array('success' => false, 'error' => 'Metodo non consentito'));
}

$maxBytes = 2 * 1024 * 1024; // 2 MB, ampiamente sufficiente per un backup di routine

$rawBody = file_get_contents('php://input');
if ($rawBody === false || strlen($rawBody) === 0) {
    respond(400, array('success' => false, 'error' => 'Richiesta vuota'));
}
if (strlen($rawBody) > $maxBytes) {
    respond(413, array('success' => false, 'error' => 'Richiesta troppo grande'));
}

$input = json_decode($rawBody, true);
if (!is_array($input)) {
    respond(400, array('success' => false, 'error' => 'JSON non valido'));
}

$action = isset($input['action']) ? $input['action'] : '';
$passphrase = isset($input['passphrase']) ? $input['passphrase'] : '';

if (!is_string($passphrase) || strlen($passphrase) < 8 || strlen($passphrase) > 300) {
    respond(400, array('success' => false, 'error' => 'Passphrase non valida'));
}

// La passphrase non viene mai usata direttamente come nome file: viene
// prima trasformata con un hash a lunghezza fissa. Questo impedisce anche
// solo in linea di principio qualsiasi tentativo di path traversal.
$hash = hash('sha256', $passphrase);
$dataDir = __DIR__ . '/data';
$filePath = $dataDir . '/' . $hash . '.json';

if ($action === 'pull') {

    if (!file_exists($filePath)) {
        respond(200, array('success' => true, 'exists' => false));
    }

    $content = file_get_contents($filePath);
    $stored = json_decode($content, true);
    if (!is_array($stored)) {
        respond(500, array('success' => false, 'error' => 'Backup salvato non leggibile'));
    }

    respond(200, array(
        'success' => true,
        'exists' => true,
        'lastModified' => isset($stored['lastModified']) ? $stored['lastModified'] : null,
        'data' => isset($stored['data']) ? $stored['data'] : null
    ));

} elseif ($action === 'push') {

    if (!isset($input['data']) || !is_array($input['data'])) {
        respond(400, array('success' => false, 'error' => 'Dati mancanti'));
    }

    $lastModified = isset($input['lastModified']) ? $input['lastModified'] : (int) round(microtime(true) * 1000);

    $toStore = array(
        'lastModified' => $lastModified,
        'data' => $input['data']
    );

    $json = json_encode($toStore);
    if ($json === false) {
        respond(400, array('success' => false, 'error' => 'Impossibile serializzare i dati'));
    }
    if (strlen($json) > $maxBytes) {
        respond(413, array('success' => false, 'error' => 'Backup troppo grande'));
    }

    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0755, true);
    }

    $written = @file_put_contents($filePath, $json, LOCK_EX);
    if ($written === false) {
        respond(500, array('success' => false, 'error' => 'Impossibile salvare sul server'));
    }

    respond(200, array('success' => true, 'lastModified' => $lastModified));

} else {
    respond(400, array('success' => false, 'error' => 'Azione non riconosciuta'));
}

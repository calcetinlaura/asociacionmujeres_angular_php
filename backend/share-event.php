<?php
header('Content-Type: text/html; charset=UTF-8');
header('Vary: User-Agent');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
// share-event.php — genera metatags OG para compartir un evento



$id = intval($_GET['id'] ?? 0);
if ($id <= 0) { http_response_code(404); echo 'Not found'; exit; }

// 1) Tu API REAL: /backend/events.php/{id}
function getEventById($id) {
  $api = 'https://asociaciondemujerescallosadesegura.com/backend/events.php/' . $id;
  $ch = curl_init($api);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 5,
  ]);
  $json = curl_exec($ch);
  curl_close($ch);
  if (!$json) return null;

  $decoded = json_decode($json, true);
  if (!$decoded || !is_array($decoded)) return null;
  return $decoded; // tu endpoint devuelve el objeto directamente
}

$event = getEventById($id);
if (!$event) { http_response_code(404); echo 'Not found'; exit; }

// 2) Campos según tu API
$title = $event['title'] ?? 'Evento';
$desc  = $event['description'] ?? '';
$desc  = trim(strip_tags($desc));
$desc  = mb_substr($desc, 0, 160);

// 3) Imagen OG: /uploads/img/EVENTS/{Y}/<img>
$image = null;
if (!empty($event['img'])) {
  $year = null;
  if (!empty($event['start'])) {
    $ts = strtotime($event['start']);
    if ($ts !== false) $year = date('Y', $ts);
  }
  if ($year) {
    $image = "/uploads/img/EVENTS/{$year}/" . $event['img'];
  } else {
    // si no hay fecha, usa una ruta sin año (por si sirve en tu hosting)
    $image = "/uploads/img/EVENTS/" . $event['img'];
  }
}
if (!$image) {
  // fallback
  $image = "/assets/img/default.jpg";
}
// Asegurar absoluta
if (strpos($image, 'http') !== 0) {
  $image = 'https://asociaciondemujerescallosadesegura.com' . $image;
}

// 4) Deep link a la SPA
$url = 'https://asociaciondemujerescallosadesegura.com/events/' . $id;

// (Opcional) Datos extra para JSON-LD
$startISO = !empty($event['start']) ? date(DATE_ATOM, strtotime($event['start'])) : null;
$locName  = $event['place_name']    ?? null;
$locAddr  = $event['place_address'] ?? null;

// Detección de bots que generan previsualización
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isBot = preg_match('/(facebookexternalhit|Facebot|WhatsApp|Twitterbot|Slackbot|TelegramBot|Discordbot|LinkedInBot|Pinterest|Googlebot|SkypeUriPreview|Applebot)/i', $ua);

// Si NO es bot → redirige a la SPA
if (!$isBot) { header('Location: ' . $url, true, 302); exit; }
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title><?= htmlspecialchars($title) ?></title>
<link rel="canonical" href="<?= htmlspecialchars($url) ?>">
<meta name="description" content="<?= htmlspecialchars($desc) ?>">

<!-- Open Graph -->
<meta property="og:type" content="article">
<meta property="og:title" content="<?= htmlspecialchars($title) ?>">
<meta property="og:description" content="<?= htmlspecialchars($desc) ?>">
<meta property="og:image" content="<?= htmlspecialchars($image) ?>">
<meta property="og:url" content="<?= htmlspecialchars($url) ?>">
<meta property="og:site_name" content="Asociación de Mujeres Callosa de Segura">
<meta property="og:locale" content="es_ES">
<meta property="og:image:secure_url" content="<?= htmlspecialchars($image) ?>">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<?= htmlspecialchars($title) ?>">
<meta name="twitter:description" content="<?= htmlspecialchars($desc) ?>">
<meta name="twitter:image" content="<?= htmlspecialchars($image) ?>">

<meta name="robots" content="noindex">
<?php if ($startISO): ?>
<script type="application/ld+json">
<?= json_encode([
  '@context' => 'https://schema.org',
  '@type' => 'Event',
  'name' => $title,
  'startDate' => $startISO,
  'eventStatus' => 'https://schema.org/EventScheduled',
  'description' => $desc,
  'image' => [$image],
  'url' => $url,
  'location' => array_filter([
    '@type' => 'Place',
    'name' => $locName,
    'address' => $locAddr,
  ]),
], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE) ?>
</script>
<?php endif; ?>
</head>
<body>
<p>Vista de compartición del evento. <a href="<?= htmlspecialchars($url) ?>">Ir al evento</a></p>
</body>
</html>

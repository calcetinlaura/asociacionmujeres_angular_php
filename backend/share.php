<?php
// share.php — Previews OG genéricas para Angular SPA

header('Content-Type: text/html; charset=UTF-8');
header('Content-Language: es-ES');
header('Vary: User-Agent');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Robots-Tag: noindex'); // reforzamos noindex

$BASE = 'https://asociaciondemujerescallosadesegura.com'; // 👈 TU dominio

// --- Helpers ---
function h($s){return htmlspecialchars($s ?? '', ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8');}
function absolutize($url){
  global $BASE;
  if (!$url) return '';
  if (stripos($url,'http://')===0 || stripos($url,'https://')===0) return $url;
  return rtrim($BASE,'/').'/'.ltrim($url,'/');
}
function trim_text($htmlOrText,$limit=180){
  $txt = trim(strip_tags($htmlOrText ?? ''));
  return mb_strlen($txt,'UTF-8')>$limit ? mb_substr($txt,0,$limit,'UTF-8').'…' : $txt;
}
function fetch_json($url){
  $ch = curl_init($url);
  curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>true,
    CURLOPT_FOLLOWLOCATION=>true,
    CURLOPT_CONNECTTIMEOUT=>3,
    CURLOPT_TIMEOUT=>5,
    CURLOPT_HTTPHEADER=>['Accept: application/json'],
    CURLOPT_USERAGENT=>'OGFetcher/1.0 (+preview)',
  ]);
  $json = curl_exec($ch);
  curl_close($ch);
  if(!$json) return null;
  $data = json_decode($json,true);
  return is_array($data) ? $data : null;
}
function is_preview_bot(){
  $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
  return (bool)preg_match('/(facebookexternalhit|Facebot|WhatsApp|Twitterbot|Slackbot|TelegramBot|Discordbot|LinkedInBot|Pinterest|SkypeUriPreview)/i',$ua);
}
function basename_safe($f){ $b = basename((string)$f); return str_replace(['..','/','\\'],'',$b); }

// --- Parámetros ---
$type = $_GET['type'] ?? '';
$id   = intval($_GET['id'] ?? 0);

$valid = ['events','books','movies','recipes','macroevents','piteras','podcasts'];
if (!in_array($type,$valid,true) || $id<=0){ http_response_code(404); exit('Not found'); }

// --- Endpoints & URL canónica ---
$apiMap = [
  'events'      => "$BASE/backend/events.php/",
  'books'       => "$BASE/backend/books.php/",
  'movies'      => "$BASE/backend/movies.php/",
  'recipes'     => "$BASE/backend/recipes.php/",
  'macroevents' => "$BASE/backend/macroevents.php/",
  'piteras'     => "$BASE/backend/piteras.php/",
  'podcasts'    => "$BASE/backend/podcasts.php/",
];
$canonUrl = "$BASE/$type/$id";

$item = fetch_json($apiMap[$type].$id);
if(!$item){ http_response_code(404); exit('Not found'); }

// --- Metadatos ---
$title  = 'Contenido';
$desc   = '';
$image  = '';
$ogType = 'article';
$jsonLd = null;

switch($type){

  case 'events':
    $title = $item['title'] ?? 'Evento';
    $desc  = trim_text($item['description'] ?? '');
    $img   = basename_safe($item['img'] ?? '');
    if($img){
      $year = !empty($item['start']) && ($ts=strtotime($item['start']))!==false ? date('Y',$ts) : null;
      $image = $year ? "/uploads/img/EVENTS/$year/$img" : "/uploads/img/EVENTS/$img";
    }
    if(!$image) $image = '/assets/img/default-event.jpg';

    if(!empty($item['start'])){
      $jsonLd = [
        '@context'=>'https://schema.org',
        '@type'=>'Event',
        'name'=>$title,
        'description'=>$desc,
        'image'=>[absolutize($image)],
        'url'=>$canonUrl,
        'startDate'=>date(DATE_ATOM,strtotime($item['start'])),
        'eventStatus'=>'https://schema.org/EventScheduled',
      ];
      if(!empty($item['placeData']['name']) || !empty($item['placeData']['address'])){
        $jsonLd['location'] = [
          '@type'=>'Place',
          'name'=>$item['placeData']['name'] ?? '',
          'address'=>$item['placeData']['address'] ?? '',
        ];
      }
    }
    break;

  case 'books':
  $title = trim(($item['title'] ?? 'Libro') . (!empty($item['author']) ? ' — '.$item['author'] : ''));
  $desc  = trim_text($item['description'] ?? '');
  $img   = basename_safe($item['img'] ?? '');
  if($img){
    $image = "/uploads/img/BOOKS/$img";
  }
  if(!$image) $image = '/assets/img/default-book.jpg';
  break;

case 'movies':
  $title = trim(($item['title'] ?? 'Película') . (!empty($item['director']) ? ' — '.$item['director'] : ''));
  $desc  = trim_text($item['description'] ?? '');
  $img   = basename_safe($item['img'] ?? '');
  if($img){
    $image = "/uploads/img/MOVIES/$img";
  }
  if(!$image) $image = '/assets/img/default-movie.jpg';
  break;

case 'recipes':
  $title = trim(($item['title'] ?? 'Receta') . (!empty($item['owner']) ? ' — '.$item['owner'] : ''));
  $desc  = trim_text($item['introduction'] ?? $item['recipe'] ?? $item['description'] ?? '');
  $img   = basename_safe($item['img'] ?? '');
  if($img){
    $image = "/uploads/img/RECIPES/$img";
  }
  if(!$image) $image = '/assets/img/default-recipe.jpg';
  break;

  case 'macroevents':
    // Título/desc
    $title = $item['title'] ?? 'Macroevento';
    $desc  = trim_text($item['description'] ?? $item['subtitle'] ?? '');

    // Imagen: intenta macroevent img; si no, cae al primer evento
    $img   = basename_safe($item['img'] ?? $item['banner'] ?? '');
    $firstStart = null;
    if (is_array($item['events'] ?? null) && count($item['events'])>0) {
      // Busca el primer start válido
      foreach($item['events'] as $ev){
        if(!empty($ev['start']) && ($ts=strtotime($ev['start']))!==false){
          $firstStart = $ts;
          break;
        }
      }
    }
    if($img){
      $year = !empty($item['year']) ? preg_replace('/\D+/','',(string)$item['year']) :
              ($firstStart ? date('Y',$firstStart) : null);
      // Ajusta carpeta si difiere en tu hosting
      $image = $year ? "/uploads/img/MACROEVENTS/$year/$img" : "/uploads/img/MACROEVENTS/$img";
    }
    // Fallback: usa imagen del primer evento si viene
    if(!$img && is_array($item['events'] ?? null)){
      foreach($item['events'] as $ev){
        $evImg = basename_safe($ev['img'] ?? '');
        if($evImg){
          $y = !empty($ev['start']) && ($ts=strtotime($ev['start']))!==false ? date('Y',$ts) : null;
          $image = $y ? "/uploads/img/EVENTS/$y/$evImg" : "/uploads/img/EVENTS/$evImg";
          break;
        }
      }
    }
    if(!$image) $image = '/assets/img/default-event.jpg';

    // JSON-LD: Event (o EventSeries). Aquí usamos Event con fecha de inicio del primer pase si existe.
    if($firstStart){
      $jsonLd = [
        '@context'=>'https://schema.org',
        '@type'=>'Event',
        'name'=>$title,
        'description'=>$desc,
        'image'=>[absolutize($image)],
        'url'=>$canonUrl,
        'startDate'=>date(DATE_ATOM,$firstStart),
      ];
    }
    break;case 'podcasts':
  // Título: "Título — Ponente/Autor/Host" si hay dato
  $speaker = $item['speaker'] ?? $item['author'] ?? $item['owner'] ?? $item['host'] ?? '';
  $title = trim(($item['title'] ?? 'Podcast') . ($speaker ? ' — '.$speaker : ''));
  // Descripción: intenta summary/description
  $desc  = trim_text($item['summary'] ?? $item['description'] ?? '');
  // Imagen
  $img   = basename_safe($item['img'] ?? $item['cover'] ?? '');
  if($img){
    $image = "/uploads/img/PODCASTS/$img";
  }
  if(!$image) $image = '/assets/img/default-podcast.jpg';
  break;

case 'piteras':
  $title = $item['title'] ?? 'Piteras';
  $desc  = trim_text($item['description'] ?? $item['subtitle'] ?? '');
  $img   = basename_safe($item['img'] ?? $item['banner'] ?? '');
  if($img){
    $image = "/uploads/img/PITERAS/$img";
  }
  if(!$image) $image = '/assets/img/default-generic.jpg';
  break;
}

// Imagen absoluta
$imageAbs = absolutize($image);

// Humanos → a la SPA
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if(!in_array($method,['GET','HEAD'],true) || !is_preview_bot()){
  header('Location: '.$canonUrl, true, 302);
  exit;
}

// HTML para bots (con metatags)
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title><?= h($title) ?></title>
  <link rel="canonical" href="<?= h($canonUrl) ?>">
  <meta name="description" content="<?= h($desc) ?>">

  <!-- Open Graph -->
  <meta property="og:type" content="<?= h($ogType) ?>">
  <meta property="og:title" content="<?= h($title) ?>">
  <meta property="og:description" content="<?= h($desc) ?>">
  <meta property="og:image" content="<?= h($imageAbs) ?>">
  <meta property="og:image:alt" content="<?= h($title) ?>">
  <meta property="og:url" content="<?= h($canonUrl) ?>">
  <meta property="og:site_name" content="Asociación de Mujeres Callosa de Segura">
  <meta property="og:locale" content="es_ES">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= h($title) ?>">
  <meta name="twitter:description" content="<?= h($desc) ?>">
  <meta name="twitter:image" content="<?= h($imageAbs) ?>">

  <meta name="robots" content="noindex">

  <?php if ($jsonLd): ?>
  <script type="application/ld+json">
  <?= json_encode($jsonLd, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE) ?>
  </script>
  <?php endif; ?>
</head>
<body>
  <p>Vista de compartición. <a href="<?= h($canonUrl) ?>">Abrir contenido</a></p>
</body>
</html>

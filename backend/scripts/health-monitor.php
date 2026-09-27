<?php
// ── Config ────────────────────────────────────────────────────────────────────

$ACCESS_KEY  = 'nuke_monitor_2026';

$DB_HOST     = getenv('MYSQL_HOST')     ?: '103.27.232.6';
$DB_PORT     = getenv('MYSQL_PORT')     ?: 3306;
$DB_USER     = getenv('MYSQL_USER')     ?: 'root';
$DB_PASS     = getenv('MYSQL_PASSWORD') ?: '';
$DB_NAME     = getenv('MYSQL_DATABASE') ?: 'purat';

$REDIS_HOST  = getenv('REDIS_HOST')     ?: '127.0.0.1';
$REDIS_PORT  = getenv('REDIS_PORT')     ?: 6379;

$BACKEND_URL = 'http://127.0.0.1:3005/health';  // local — skip DNS + SSL overhead
$ENGINE_URL  = 'http://127.0.0.1:3050/health';

// ── Auth ──────────────────────────────────────────────────────────────────────

$key = $_GET['key'] ?? '';
if ($key !== $ACCESS_KEY) {
    http_response_code(403);
    die('403 Forbidden');
}

$section = $_GET['section'] ?? '';

// ── JSON API mode ─────────────────────────────────────────────────────────────

if ($section) {
    header('Content-Type: application/json');
    header('Cache-Control: no-store');

    function fmt_bytes(int $b): string {
        if ($b >= 1073741824) return round($b/1073741824, 1).' GB';
        if ($b >= 1048576)    return round($b/1048576, 1).' MB';
        return round($b/1024, 1).' KB';
    }

    switch ($section) {

        // ── System: instant, no network I/O ──────────────────────────────────
        case 'system':
            $load     = sys_getloadavg();
            $cpuCount = (int)(trim(shell_exec('nproc 2>/dev/null') ?: '1')) ?: 1;
            $cpuPct   = round(($load[0] / $cpuCount) * 100, 1);

            $mem      = file_get_contents('/proc/meminfo');
            preg_match('/MemTotal:\s+(\d+)/',     $mem, $mt);
            preg_match('/MemAvailable:\s+(\d+)/', $mem, $ma);
            $memTotal = (int)($mt[1]??0)*1024;
            $memAvail = (int)($ma[1]??0)*1024;
            $memUsed  = $memTotal - $memAvail;
            $memPct   = $memTotal ? round($memUsed/$memTotal*100,1) : 0;

            $diskTotal = disk_total_space('/');
            $diskFree  = disk_free_space('/');
            $diskUsed  = $diskTotal - $diskFree;
            $diskPct   = $diskTotal ? round($diskUsed/$diskTotal*100,1) : 0;

            $up = (float)file_get_contents('/proc/uptime');
            echo json_encode([
                'cpuPct'    => $cpuPct,
                'cpuCount'  => $cpuCount,
                'load'      => $load,
                'memPct'    => $memPct,
                'memUsed'   => fmt_bytes($memUsed),
                'memTotal'  => fmt_bytes($memTotal),
                'diskPct'   => $diskPct,
                'diskUsed'  => fmt_bytes($diskUsed),
                'diskTotal' => fmt_bytes($diskTotal),
                'diskFree'  => fmt_bytes($diskFree),
                'uptime'    => floor($up/86400).'d '.floor(($up%86400)/3600).'h '.floor(($up%3600)/60).'m',
            ]);
            break;

        // ── Database ──────────────────────────────────────────────────────────
        case 'db':
            try {
                $t   = microtime(true);
                $pdo = new PDO("mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
                    $DB_USER, $DB_PASS,
                    [PDO::ATTR_TIMEOUT => 3, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                $ms  = round((microtime(true)-$t)*1000);
                $today = date('Y-m-d');
                $q = fn($s) => $pdo->query($s)->fetchColumn();
                $conn = $pdo->query("SHOW STATUS LIKE 'Threads_connected'")->fetch(PDO::FETCH_ASSOC);
                echo json_encode([
                    'ok'        => true,
                    'ms'        => $ms,
                    'sent'      => (int)$q("SELECT COUNT(*) FROM mob_no3 WHERE status='sent' AND delivery_date='$today'"),
                    'failed'    => (int)$q("SELECT COUNT(*) FROM mob_no3 WHERE status='failed' AND DATE(created_at)='$today'"),
                    'pending'   => (int)$q("SELECT COUNT(*) FROM mob_no3 WHERE status IN ('PPC59','PP1','PPC','49')"),
                    'campaigns' => (int)$q("SELECT COUNT(*) FROM campaign_details WHERE DATE(created_at)='$today'"),
                    'conns'     => $conn['Value'] ?? '?',
                ]);
            } catch (Exception $e) {
                echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
            }
            break;

        // ── Redis ─────────────────────────────────────────────────────────────
        case 'redis':
            $t    = microtime(true);
            $sock = @fsockopen($REDIS_HOST, $REDIS_PORT, $errno, $errstr, 1);
            $ms   = round((microtime(true)-$t)*1000);
            if (!$sock) { echo json_encode(['ok'=>false,'error'=>"$errstr ($errno)"]); break; }
            fwrite($sock, "INFO\r\n");
            stream_set_timeout($sock, 1);
            $raw = '';
            while (!feof($sock)) { $l=fgets($sock,256); if(trim($l)==='') break; $raw.=$l; }
            fclose($sock);
            $info = ['ok'=>true,'ms'=>$ms];
            foreach (explode("\n",$raw) as $l) {
                if (strpos($l,':')!==false) { [$k,$v]=explode(':',$l,2); $info[trim($k)]=trim($v); }
            }
            echo json_encode($info);
            break;

        // ── API health (parallel curl_multi) ──────────────────────────────────
        case 'api':
            $mh = curl_multi_init();
            $handles = [];
            $t0 = microtime(true);
            foreach (['backend'=>$BACKEND_URL,'engine'=>$ENGINE_URL] as $k=>$url) {
                $ch = curl_init($url);
                curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>2,
                    CURLOPT_CONNECTTIMEOUT=>2,CURLOPT_SSL_VERIFYPEER=>false,CURLOPT_FOLLOWLOCATION=>false]);
                curl_multi_add_handle($mh,$ch); $handles[$k]=$ch;
            }
            do { curl_multi_exec($mh,$active); curl_multi_select($mh,0.05); } while ($active);
            $res = [];
            foreach ($handles as $k=>$ch) {
                $code = curl_getinfo($ch,CURLINFO_HTTP_CODE);
                $res[$k] = ['ok'=>$code>=200&&$code<400,'code'=>$code,
                    'ms'=>round((microtime(true)-$t0)*1000)];
                curl_multi_remove_handle($mh,$ch); curl_close($ch);
            }
            curl_multi_close($mh);
            echo json_encode($res);
            break;

        // ── PM2 ───────────────────────────────────────────────────────────────
        case 'pm2':
            $raw = shell_exec('timeout 3 pm2 jlist 2>/dev/null');
            if (!$raw) { echo json_encode(['error'=>'pm2 not accessible']); break; }
            $data = json_decode($raw, true);
            if (!is_array($data)) { echo json_encode(['error'=>'pm2 JSON parse failed']); break; }
            $procs = [];
            foreach ($data as $p) {
                $uptime = $p['pm2_env']['pm_uptime'] ?? 0;
                $procs[] = [
                    'name'     => $p['name'] ?? '?',
                    'status'   => $p['pm2_env']['status'] ?? '?',
                    'uptime'   => $uptime ? round((time()*1000-$uptime)/60000).'m' : '-',
                    'cpu'      => ($p['monit']['cpu'] ?? 0).'%',
                    'mem'      => fmt_bytes((int)($p['monit']['memory'] ?? 0)),
                    'restarts' => $p['pm2_env']['restart_time'] ?? 0,
                    'ok'       => ($p['pm2_env']['status'] ?? '') === 'online',
                    'engine'   => str_starts_with($p['name'] ?? '', 'codefirstsystem-32'),
                ];
            }
            echo json_encode($procs);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error'=>'unknown section']);
    }
    exit;
}

// ── HTML Shell (loads instantly — JS fetches each section in parallel) ─────────

$base = '?key=' . urlencode($key);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>System Health Monitor</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0f172a;color:#e2e8f0;font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;padding:1.5rem}
  h1{font-size:1.4rem;font-weight:700;color:#f8fafc;margin-bottom:.2rem}
  .sub{color:#64748b;font-size:.8rem;margin-bottom:1.5rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;margin-bottom:1rem}
  .card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:1rem}
  .ct{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:.75rem}
  .badge{display:inline-block;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:4px;color:#fff}
  .row{display:flex;justify-content:space-between;align-items:center;padding:.3rem 0;border-bottom:1px solid #ffffff08}
  .row:last-child{border-bottom:none}
  .lbl{color:#94a3b8}.val{font-weight:600;color:#f1f5f9}
  .bwrap{background:#1e3a5f;border-radius:4px;height:8px;flex:1;margin:0 .6rem;overflow:hidden}
  .bbar{height:100%;border-radius:4px;transition:width .4s}
  .blbl{font-size:.7rem;color:#94a3b8;white-space:nowrap;min-width:90px;text-align:right}
  .brow{display:flex;align-items:center;gap:.4rem;margin:.35rem 0}
  .brow .lbl{min-width:55px}
  table{width:100%;border-collapse:collapse;font-size:.78rem}
  th{color:#64748b;font-weight:600;text-align:left;padding:.3rem .5rem;border-bottom:1px solid #334155}
  td{padding:.3rem .5rem;border-bottom:1px solid #1e293b;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#263348}
  .ok{color:#22c55e}.err{color:#ef4444}.warn{color:#f59e0b}
  .hbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:.5rem}
  .alert{background:#7f1d1d;border:1px solid #ef4444;border-radius:8px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.82rem}
  .slbl{font-size:.75rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.1em;margin:1rem 0 .5rem}
  .spin{display:inline-block;width:10px;height:10px;border:2px solid #334155;border-top-color:#3b82f6;border-radius:50%;animation:sp .7s linear infinite;margin-right:4px;vertical-align:middle}
  @keyframes sp{to{transform:rotate(360deg)}}
</style>
</head>
<body>

<div class="hbar">
  <div>
    <h1>⚡ System Health Monitor</h1>
    <div class="sub" id="ts">Loading…</div>
  </div>
  <div id="sbar" style="font-size:.75rem;color:#475569"><span class="spin"></span> Fetching…</div>
</div>

<div id="alerts"></div>

<div class="grid">
  <div class="card" id="c-sys"><div class="ct">🖥 System Resources</div><span class="spin"></span></div>
  <div class="card" id="c-db"><div class="ct">🗄 MySQL</div><span class="spin"></span></div>
  <div class="card" id="c-redis"><div class="ct">⚡ Redis</div><span class="spin"></span></div>
  <div class="card" id="c-api"><div class="ct">🌐 Service Health</div><span class="spin"></span></div>
</div>

<div class="slbl">⚙️ Engine Workers (codefirstsystem-32)</div>
<div class="card" id="c-eng" style="margin-bottom:1rem"><span class="spin"></span></div>

<div class="slbl">📋 All PM2 Processes</div>
<div class="card" id="c-pm2"><span class="spin"></span></div>

<div class="sub" style="margin-top:1rem;text-align:right">
  Next refresh in <span id="cd">30</span>s &nbsp;·&nbsp;
  <a href="<?= htmlspecialchars($base) ?>" style="color:#3b82f6">Refresh now</a>
</div>

<script>
const B = <?= json_encode($base) ?>;
const badge = (ok,y='UP',n='DOWN') => `<span class="badge" style="background:${ok?'#22c55e':'#ef4444'}">${ok?y:n}</span>`;
const bar   = p => { const c=p>85?'#ef4444':p>65?'#f59e0b':'#3b82f6'; return `<div class="bwrap"><div class="bbar" style="width:${p}%;background:${c}"></div></div>`; };
const row   = (l,v) => `<div class="row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`;
const brow  = (l,p,r) => `<div class="brow"><span class="lbl">${l}</span>${bar(p)}<span class="blbl">${r}</span></div>`;
const tbl   = rows => `<table><tr><th>Process</th><th>Status</th><th>Uptime</th><th>CPU</th><th>Memory</th><th>Restarts</th></tr>${
  rows.map(p=>`<tr><td>${p.name}</td><td>${badge(p.ok,'online',p.status)}</td><td>${p.uptime}</td>
    <td class="${parseInt(p.cpu)>80?'warn':''}">${p.cpu}</td><td>${p.mem}</td>
    <td class="${p.restarts>10?'warn':''}">${p.restarts}</td></tr>`).join('')}</table>`;

const api = s => fetch(`${B}&section=${s}`).then(r=>r.json());

// All 5 sections fire in parallel
Promise.allSettled([
  api('system').then(d => {
    document.getElementById('c-sys').innerHTML = `<div class="ct">🖥 System Resources</div>
      ${brow('CPU',d.cpuPct,`${d.cpuPct}% · load ${d.load[0]}`)}
      ${brow('Memory',parseFloat(d.memPct),`${d.memUsed} / ${d.memTotal}`)}
      ${brow('Disk',parseFloat(d.diskPct),`${d.diskUsed} / ${d.diskTotal}`)}
      ${row('Uptime',d.uptime)}${row('Load 1/5/15',`${d.load[0]} / ${d.load[1]} / ${d.load[2]}`)}
      ${row('CPU cores',d.cpuCount)}${row('Free disk',d.diskFree)}`;
  }),

  api('db').then(d => {
    const el = document.getElementById('c-db');
    if (!d.ok) { el.innerHTML=`<div class="ct">🗄 MySQL &nbsp;${badge(false)}</div><div class="err">${d.error||'Failed'}</div>`; return; }
    el.innerHTML = `<div class="ct">🗄 MySQL &nbsp;${badge(true)}</div>
      ${row('Connect time',d.ms+'ms')}${row('Connections',d.conns)}
      ${row('Campaigns today',d.campaigns)}
      ${row('Sent today',`<span class="ok">${d.sent}</span>`)}
      ${row('Failed today',d.failed>0?`<span class="err">${d.failed}</span>`:d.failed)}
      ${row('Pending queue',d.pending>0?`<span class="warn">${d.pending}</span>`:d.pending)}`;
  }),

  api('redis').then(d => {
    const el = document.getElementById('c-redis');
    if (!d.ok) { el.innerHTML=`<div class="ct">⚡ Redis &nbsp;${badge(false)}</div><div class="err">${d.error||'Failed'}</div>`; return; }
    el.innerHTML = `<div class="ct">⚡ Redis &nbsp;${badge(true)}</div>
      ${row('Connect time',d.ms+'ms')}${row('Version',d.redis_version||'?')}
      ${row('Clients',d.connected_clients||'?')}${row('Memory',d.used_memory_human||'?')}
      ${row('Peak mem',d.used_memory_peak_human||'?')}
      ${row('Uptime',(d.uptime_in_days||'?')+' days')}${row('Keyspace hits',d.keyspace_hits||'?')}`;
  }),

  api('api').then(d => {
    const b=d.backend, e=d.engine;
    document.getElementById('c-api').innerHTML = `<div class="ct">🌐 Service Health</div>
      ${row('Backend API',`${badge(b.ok)} &nbsp;${b.ms}ms &nbsp;HTTP ${b.code}`)}
      ${row('Engine API',`${badge(e.ok)} &nbsp;${e.ms}ms &nbsp;HTTP ${e.code}`)}`;
  }),

  api('pm2').then(d => {
    if (d.error) {
      document.getElementById('c-eng').innerHTML = `<div class="warn">${d.error}</div>`;
      document.getElementById('c-pm2').innerHTML = `<div class="warn">${d.error}</div>`;
      return;
    }
    const eng   = d.filter(p=>p.engine);
    const other = d.filter(p=>!p.engine);
    const down  = eng.filter(p=>!p.ok);
    if (down.length)
      document.getElementById('alerts').innerHTML =
        `<div class="alert">⚠️ <strong>${down.length} engine worker(s) DOWN:</strong> ${down.map(p=>p.name).join(', ')}</div>`;
    document.getElementById('c-eng').innerHTML = `<div class="ct">⚙️ Engine Workers</div>` + (eng.length ? tbl(eng) : '<div class="lbl">None</div>');
    document.getElementById('c-pm2').innerHTML = other.length ? tbl(other) : '<div class="lbl">No other processes</div>';
  }),

]).then(() => {
  document.getElementById('sbar').textContent = 'Updated: ' + new Date().toLocaleTimeString();
}).catch(() => {});

document.getElementById('ts').textContent = 'Auto-refreshes every 30s · ' + new Date().toLocaleString();

let s = 30;
const ti = setInterval(() => { document.getElementById('cd').textContent = --s; if(s<=0){clearInterval(ti);location.reload();} }, 1000);
</script>
</body>
</html>

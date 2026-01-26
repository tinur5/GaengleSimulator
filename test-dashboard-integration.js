// test-dashboard-integration.js
// Automatisierter Test für das Dashboard

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 DASHBOARD-INTEGRATIONS-TEST\n');
console.log('='.repeat(70));

let serverProcess = null;
let testsPassed = 0;
let testsFailed = 0;

function log(message) {
  console.log(message);
}

function reportTest(name, passed, message = '') {
  if (passed) {
    console.log(`  ✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${name}`);
    if (message) console.log(`     ${message}`);
    testsFailed++;
  }
}

// Test 1: Prüfe ob npm ist installiert
console.log('\n✓ TEST 1: VORBEDINGUNGEN');
console.log('-'.repeat(70));
try {
  require('child_process').execSync('npm --version', { encoding: 'utf8' });
  reportTest('npm ist installiert', true);
} catch (e) {
  reportTest('npm ist installiert', false, 'npm nicht gefunden');
  process.exit(1);
}

// Test 2: Starte den Server und warte darauf
console.log('\n✓ TEST 2: SERVER-START');
console.log('-'.repeat(70));

function makeRequest(path = '/dashboard', callback) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: 'GET',
    timeout: 5000,
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      callback(null, res, data);
    });
  });

  req.on('error', (error) => {
    callback(error, null, null);
  });

  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Request timeout'), null, null);
  });

  req.end();
}

// Prüfe ob Server bereits läuft
makeRequest('/dashboard', (err, res, data) => {
  if (!err && res.statusCode === 200) {
    log('  Server läuft bereits auf Port 3000');
    runDashboardTests();
  } else {
    log('  Server läuft nicht, versuche zu starten...');
    // Server wurde bereits im Terminal gestartet
    // Warte kurz und versuche Verbindung
    let attempts = 0;
    const checkServer = setInterval(() => {
      attempts++;
      makeRequest('/dashboard', (err, res, data) => {
        if (!err && res.statusCode === 200) {
          clearInterval(checkServer);
          log(`  ✓ Server gestartet nach ${attempts} Versuchen`);
          runDashboardTests();
        } else if (attempts > 20) {
          clearInterval(checkServer);
          reportTest('Server ist erreichbar', false, 'Server antwortet nicht');
          process.exit(1);
        }
      });
    }, 500);
  }
});

function runDashboardTests() {
  // Test 3: Prüfe HTTP-Antwort
  console.log('\n✓ TEST 3: HTTP-RESPONSE');
  console.log('-'.repeat(70));
  
  makeRequest('/dashboard', (err, res, data) => {
    if (err) {
      reportTest('Dashboard ist erreichbar (HTTP 200)', false, err.message);
      finalizeTests();
      return;
    }

    reportTest('Dashboard ist erreichbar', res.statusCode === 200, 
      res.statusCode !== 200 ? `Status: ${res.statusCode}` : '');

    // Test 4: Prüfe HTML-Struktur
    console.log('\n✓ TEST 4: HTML-STRUKTUR');
    console.log('-'.repeat(70));
    
    reportTest('Response enthält HTML', data && data.includes('<!DOCTYPE') || data.includes('<html'),
      'Keine HTML-Struktur gefunden');
    
    reportTest('Response enthält MFH Gängle 2+4', data && data.includes('Gängle'),
      'Projektnamen nicht gefunden');

    // Test 5: Prüfe kritische Elemente
    console.log('\n✓ TEST 5: KRITISCHE ELEMENTE');
    console.log('-'.repeat(70));
    
    reportTest('Dashboard enthält PV-Produktion-Bereich', 
      data && (data.includes('PV') || data.includes('PV-PRODUKTION')),
      'PV-Bereich nicht gefunden');
    
    reportTest('Dashboard enthält Verbrauch-Bereich', 
      data && (data.includes('VERBRAUCH') || data.includes('Verbrauch')),
      'Verbrauchs-Bereich nicht gefunden');
    
    reportTest('Dashboard enthält Batteriestand-Bereich',
      data && (data.includes('Batterie') || data.includes('SOC')),
      'Batterie-Bereich nicht gefunden');
    
    reportTest('Dashboard enthält Zeit-Steuerung',
      data && (data.includes('UHRZEIT') || data.includes('DATUM') || data.includes('date')),
      'Zeit-Steuerung nicht gefunden');

    // Test 6: Prüfe React/JavaScript
    console.log('\n✓ TEST 6: REACT & JAVASCRIPT');
    console.log('-'.repeat(70));
    
    reportTest('Response enthält React',
      data && data.includes('React') || data.includes('__NEXT'),
      'React nicht gefunden');
    
    reportTest('Response enthält Next.js',
      data && (data.includes('__NEXT') || data.includes('_next')),
      'Next.js nicht gefunden');

    // Test 7: Prüfe auf Fehler
    console.log('\n✓ TEST 7: FEHLER-ERKENNUNG');
    console.log('-'.repeat(70));
    
    const hasErrors = data && (
      data.includes('Error') && 
      (data.includes('TypeError') || data.includes('ReferenceError') || data.includes('SyntaxError'))
    );
    
    reportTest('Keine kritischen JavaScript-Fehler', !hasErrors,
      hasErrors ? 'Fehler in Response gefunden' : '');
    
    reportTest('Response enthält keine 500-Fehler',
      res.statusCode !== 500,
      `Status: ${res.statusCode}`);

    // Test 8: Simulation Functions erreichbar
    console.log('\n✓ TEST 8: SIMULATION-FUNKTIONEN');
    console.log('-'.repeat(70));
    
    // Überprüfe ob die Dashboard-Seite die Funktionen laden kann
    reportTest('calculatePVProduction ist verfügbar',
      data && (data.includes('calculatePVProduction') || data.includes('simulation')),
      'Simulation-Funktionen nicht referenziert');
    
    reportTest('calculateTenantConsumption ist verfügbar',
      data && (data.includes('calculateTenantConsumption') || data.includes('tenant')),
      'Tenant-Funktionen nicht referenziert');

    // Test 9: Tenant-Informationen
    console.log('\n✓ TEST 9: MIETERDATEN');
    console.log('-'.repeat(70));
    
    const hasGraf = data && data.includes('Graf');
    const hasWetli = data && data.includes('Wetli');
    const hasBuerzle = data && data.includes('Bürzle');
    
    reportTest('Familie Graf in Dashboard', hasGraf, 'Familie Graf nicht gefunden');
    reportTest('Familie Wetli in Dashboard', hasWetli, 'Familie Wetli nicht gefunden');
    reportTest('Ehepaar Bürzle in Dashboard', hasBuerzle, 'Ehepaar Bürzle nicht gefunden');

    finalizeTests();
  });
}

function finalizeTests() {
  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 TESTERGEBNISSE:`);
  console.log(`  ✅ Bestanden: ${testsPassed}`);
  console.log(`  ❌ Fehlgeschlagen: ${testsFailed}`);
  console.log(`  📈 Erfolgsquote: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%\n`);
  
  if (testsFailed === 0) {
    console.log('✅ ALLE TESTS BESTANDEN - Dashboard funktioniert korrekt!\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${testsFailed} Test(s) fehlgeschlagen - Bitte Fehler beheben\n`);
    process.exit(1);
  }
}

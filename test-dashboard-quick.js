// test-dashboard-quick.js
// Schneller HTTP-Test für das Dashboard

const http = require('http');

console.log('🧪 DASHBOARD-VERFÜGBARKEITS-TEST\n');
console.log('='.repeat(70));

let testsPassed = 0;
let testsFailed = 0;

function makeRequest(path = '/dashboard', callback) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: 'GET',
    timeout: 10000,
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

function reportTest(name, passed, message = '') {
  if (passed) {
    console.log(`  ✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${name}`);
    if (message) console.log(`     Fehler: ${message}`);
    testsFailed++;
  }
}

console.log('\n✓ TEST 1: SERVER-VERBINDUNG');
console.log('-'.repeat(70));

makeRequest('/dashboard', (err, res, data) => {
  if (err) {
    reportTest('Server antwortet', false, err.message);
    console.log('\n❌ Server läuft nicht auf Port 3000');
    console.log('   Bitte starte: npm run dev\n');
    process.exit(1);
  }

  reportTest('Server antwortet', res.statusCode === 200, 
    `Status: ${res.statusCode}`);

  console.log('\n✓ TEST 2: HTML-STRUKTUR');
  console.log('-'.repeat(70));
  
  reportTest('Antwortet mit HTML', data && data.includes('<html'),
    'Keine HTML gefunden');
  
  reportTest('Enthält DOCTYPE', data && data.includes('<!DOCTYPE'),
    'DOCTYPE fehlt');

  console.log('\n✓ TEST 3: DASHBOARD-INHALTE');
  console.log('-'.repeat(70));
  
  reportTest('Titel: MFH Gängle 2+4', data && data.includes('Gängle'),
    'Projektnamen nicht gefunden');
  
  reportTest('PV-Bereich vorhanden', data && data.includes('PV'),
    'PV nicht erwähnt');
  
  reportTest('Verbrauch-Bereich vorhanden', 
    data && (data.includes('VERBRAUCH') || data.includes('Verbrauch')),
    'Verbrauchsbereich nicht gefunden');
  
  reportTest('Batterie-Bereich vorhanden',
    data && data.includes('Batterie'),
    'Batterie-Bereich nicht gefunden');
  
  reportTest('Zeit-Kontrolle vorhanden',
    data && (data.includes('UHRZEIT') || data.includes('DATUM')),
    'Zeit-Steuerung nicht gefunden');

  console.log('\n✓ TEST 4: MIETER-DATEN');
  console.log('-'.repeat(70));
  
  reportTest('Familie Graf vorhanden', data && data.includes('Graf'),
    'Familie Graf nicht gefunden');
  
  reportTest('Familie Wetli vorhanden', data && data.includes('Wetli'),
    'Familie Wetli nicht gefunden');
  
  reportTest('Ehepaar Bürzle vorhanden', data && data.includes('Bürzle'),
    'Ehepaar Bürzle nicht gefunden');

  console.log('\n✓ TEST 5: JAVASCRIPT & REACT');
  console.log('-'.repeat(70));
  
  reportTest('Next.js Scripts vorhanden',
    data && (data.includes('_next') || data.includes('__NEXT')),
    'Next.js-Skripte nicht gefunden');
  
  reportTest('React vorhanden',
    data && (data.includes('React') || data.includes('react')),
    'React nicht gefunden');

  console.log('\n✓ TEST 6: FEHLER-CHECK');
  console.log('-'.repeat(70));
  
  const hasJSError = data && data.includes('Error') && 
    (data.includes('TypeError') || data.includes('ReferenceError'));
  reportTest('Keine kritischen JS-Fehler', !hasJSError,
    'Fehler in Response erkannt');
  
  reportTest('HTTP Status ist 200', res.statusCode === 200,
    `Erhalten: ${res.statusCode}`);

  console.log('\n✓ TEST 7: SIMULATION-FUNKTIONEN');
  console.log('-'.repeat(70));
  
  reportTest('Simulation-Module geladen',
    data && (data.includes('simulation') || data.includes('calculatePV')),
    'Simulation-Module nicht referenziert');

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 TESTERGEBNISSE:`);
  console.log(`  ✅ Bestanden:        ${testsPassed}`);
  console.log(`  ❌ Fehlgeschlagen:   ${testsFailed}`);
  const total = testsPassed + testsFailed;
  const percent = Math.round((testsPassed / total) * 100);
  console.log(`  📈 Erfolgsquote:     ${percent}%\n`);
  
  if (testsFailed === 0) {
    console.log('✅ ALLE TESTS BESTANDEN');
    console.log('🎉 Dashboard funktioniert korrekt!\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${testsFailed} Test(s) fehlgeschlagen`);
    console.log('   Bitte Fehler überprüfen und Dashboard neu laden\n');
    process.exit(1);
  }
});

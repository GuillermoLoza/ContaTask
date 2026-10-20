const fs = require('fs');

async function testMenu() {
  const state = 'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAADdAADZXhlcHQABnBhcmFtc3QASyomKiYvY2wtdGktaXRtZW51L01lbnVJbnRlcm5ldC5odG0mYjY0ZDI2YThiNWFmMDkxOTIzYjIzYjY0MDdhMWMxZGI0MWU3MzNhNnQABGV4ZWNweA==';
  const postData = new URLSearchParams({
    tipo: '2',
    dni: '',
    custom_ruc: process.env.SUNAT_TEST_RUC || '20000000001',
    j_username: process.env.SUNAT_TEST_USER || 'MODDATOS',
    j_password: process.env.SUNAT_TEST_PASSWORD || 'moddatos',
    captcha: '',
    originalUrl: 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/AutenticaMenuInternet.htm',
    lang: 'es-PE',
    state: state
  });

  const jar = new Map();
  function save(res) {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
    if (!raw) return;
    for (const c of raw) {
      if (!c) continue;
      const part = c.split(';')[0];
      const eqIdx = part.indexOf('=');
      if (eqIdx !== -1) {
        const k = part.substring(0, eqIdx).trim();
        const v = part.substring(eqIdx + 1).trim();
        jar.set(k, v);
      }
    }
  }
  function cookies() {
    return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  // 1. Post to j_security_check
  const res1 = await fetch('https://api-seguridad.sunat.gob.pe/v1/clientessol/4f3b88b3-d9d6-402a-b85d-6a0bc857746a/oauth2/j_security_check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: postData.toString(),
    redirect: 'manual'
  });
  save(res1);
  const loc1 = res1.headers.get('location');
  console.log('loc1:', loc1 ? loc1.substring(0, 100) : 'none');

  // 2. GET AutenticaMenuInternet.htm
  const res2 = await fetch(loc1, {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    redirect: 'manual'
  });
  save(res2);
  const loc2 = res2.headers.get('location');
  console.log('loc2:', loc2);

  // 3. GET MenuInternet.htm?pestana=*&agrupacion=*
  const res3 = await fetch(loc2, {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': loc1
    }
  });
  save(res3);
  console.log('res3 status:', res3.status);
  const html = await res3.text();
  console.log('res3 length:', html.length);
  fs.writeFileSync('menu_internet.html', html);

  const buzonMatches = html.match(/.{0,60}(?:buzon|notifica|mensaje|casilla|sol).{0,60}/gi);
  console.log('Buzon matches in MenuInternet:', buzonMatches ? buzonMatches.slice(0, 15) : 'none');

  // Also check if there are any JSON scripts or menu data
  const jsonMatches = html.match(/var\s+[a-zA-Z0-9_]+\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\});/g);
  console.log('JSON variables found:', jsonMatches ? jsonMatches.length : 0);
  if (jsonMatches) {
    jsonMatches.forEach(m => console.log('VAR MATCH:', m.substring(0, 200)));
  }
}

testMenu().catch(console.error);

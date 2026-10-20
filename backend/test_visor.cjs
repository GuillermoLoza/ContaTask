const fs = require('fs');

async function testVisor() {
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

  // 1. Login
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

  // 2. Auth redirect
  const res2 = await fetch(res1.headers.get('location'), {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    redirect: 'manual'
  });
  save(res2);

  // 3. MenuInternet
  const res3 = await fetch(res2.headers.get('location'), {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': res1.headers.get('location')
    }
  });
  save(res3);

  // 4. GET buzon action
  const resBuzon = await fetch('https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?action=buzon&s=ww1', {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*'
    },
    redirect: 'manual'
  });
  save(resBuzon);

  const visorUrl = resBuzon.headers.get('location');
  console.log('Visor URL:', visorUrl ? visorUrl.substring(0, 100) : 'none');

  if (visorUrl) {
    const resVisor = await fetch(visorUrl, {
      headers: {
        'Cookie': cookies(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm'
      },
      redirect: 'manual'
    });
    save(resVisor);
    console.log('resVisor status:', resVisor.status);
    console.log('resVisor loc:', resVisor.headers.get('location'));
    const visorHtml = await resVisor.text();
    console.log('resVisor length:', visorHtml.length);
    fs.writeFileSync('visor.html', visorHtml);
    console.log('resVisor preview:\n', visorHtml.substring(0, 1200));

    // If it redirected, follow next redirect
    if (resVisor.status === 302 || resVisor.status === 301) {
      const nextLoc = new URL(resVisor.headers.get('location'), visorUrl).toString();
      console.log('Next Visor Loc:', nextLoc);
      const resNext = await fetch(nextLoc, {
        headers: {
          'Cookie': cookies(),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': visorUrl
        }
      });
      save(resNext);
      console.log('resNext status:', resNext.status);
      const nextHtml = await resNext.text();
      fs.writeFileSync('visor_next.html', nextHtml);
      console.log('resNext length:', nextHtml.length);
      console.log('resNext preview:\n', nextHtml.substring(0, 1200));
    }
  }
}

testVisor().catch(console.error);

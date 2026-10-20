const fs = require('fs');

async function testActionBuzon() {
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
  const loc1 = res1.headers.get('location');

  // 2. Auth redirect
  const res2 = await fetch(loc1, {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    redirect: 'manual'
  });
  save(res2);
  const loc2 = res2.headers.get('location');

  // 3. MenuInternet
  const res3 = await fetch(loc2, {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': loc1
    }
  });
  save(res3);
  console.log('Logged in successfully. Cookies count:', jar.size);

  // 4. Try GET MenuInternet.htm?action=buzon&s=ww1
  const resGet = await fetch('https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?action=buzon&s=ww1', {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*'
    },
    redirect: 'manual'
  });
  save(resGet);
  console.log('GET buzon status:', resGet.status, 'location:', resGet.headers.get('location'));
  const textGet = await resGet.text();
  console.log('GET buzon preview:', textGet.substring(0, 300));

  // 5. Try POST action=buzon
  const resPost = await fetch('https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*'
    },
    body: 'action=buzon',
    redirect: 'manual'
  });
  save(resPost);
  console.log('POST buzon status:', resPost.status, 'location:', resPost.headers.get('location'));
  const textPost = await resPost.text();
  console.log('POST buzon preview:', textPost.substring(0, 300));
}

testActionBuzon().catch(console.error);

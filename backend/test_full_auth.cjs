const fs = require('fs');

async function testFullAuth() {
  const state = 'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAADdAADZXhlcHQABnBhcmFtc3QASyomKiYvY2wtdGktaXRtZW51L01lbnVJbnRlcm5ldC5odG0mYjY0ZDI2YThiNWFmMDkxOTIzYjIzYjY0MDdhMWMxZGI0MWU3MzNhNnQABGV4ZWNweA==';
  const authenUrl = `https://api-seguridad.sunat.gob.pe/v1/clientessol/4f3b88b3-d9d6-402a-b85d-6a0bc857746a/oauth2/authen?redirect_uri=https://e-menu.sunat.gob.pe/cl-ti-itmenu/AutenticaMenuInternet.htm&state=${encodeURIComponent(state)}&client_id=4f3b88b3-d9d6-402a-b85d-6a0bc857746a&response_type=code`;

  const jar = new Map();
  function saveCookies(headers) {
    const raw = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie')];
    if (!raw) return;
    for (const c of raw) {
      if (!c) continue;
      const part = c.split(';')[0];
      const [k, v] = part.split('=');
      if (k && v) jar.set(k.trim(), v.trim());
    }
  }
  function getCookieHeader() {
    return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  // 1. GET authen
  const res1 = await fetch(authenUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  saveCookies(res1.headers);
  console.log('Step 1 cookies:', getCookieHeader());

  // 2. POST j_security_check
  const postData = new URLSearchParams({
    tipo: '2',
    dni: '',
    custom_ruc: process.env.SUNAT_TEST_RUC || '20000000001',
    j_username: process.env.SUNAT_TEST_USER || 'MODDATOS',
    j_password: process.env.SUNAT_TEST_PASSWORD || 'moddatos',
    captcha: '',
    originalUrl: '',
    lang: '',
    state: state
  });

  const res2 = await fetch('https://api-seguridad.sunat.gob.pe/v1/clientessol/4f3b88b3-d9d6-402a-b85d-6a0bc857746a/oauth2/j_security_check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': getCookieHeader(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': authenUrl
    },
    body: postData.toString(),
    redirect: 'manual'
  });
  saveCookies(res2.headers);
  console.log('Step 2 status:', res2.status);
  const location = res2.headers.get('location');
  console.log('Step 2 location:', location ? location.substring(0, 120) : 'none');

  if (location) {
    // 3. Follow redirect to AutenticaMenuInternet.htm
    const res3 = await fetch(location, {
      headers: {
        'Cookie': getCookieHeader(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://api-seguridad.sunat.gob.pe/'
      },
      redirect: 'manual'
    });
    saveCookies(res3.headers);
    console.log('Step 3 status:', res3.status);
    console.log('Step 3 location:', res3.headers.get('location'));
    const body3 = await res3.text();
    console.log('Step 3 body snippet:\n', body3.substring(0, 1000));
  }
}

testFullAuth().catch(console.error);

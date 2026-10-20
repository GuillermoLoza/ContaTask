const fs = require('fs');

async function getRealBuzon() {
  const ruc = process.env.SUNAT_TEST_RUC || '20000000001';
  const usuario = process.env.SUNAT_TEST_USER || 'MODDATOS';
  const clave = process.env.SUNAT_TEST_PASSWORD || 'moddatos';

  console.log('Logging in to SUNAT for RUC:', ruc);
  const state = 'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAADdAADZXhlcHQABnBhcmFtc3QASyomKiYvY2wtdGktaXRtZW51L01lbnVJbnRlcm5ldC5odG0mYjY0ZDI2YThiNWFmMDkxOTIzYjIzYjY0MDdhMWMxZGI0MWU3MzNhNnQABGV4ZWNweA==';
  const postData = new URLSearchParams({
    tipo: '2',
    dni: '',
    custom_ruc: ruc,
    j_username: usuario,
    j_password: clave,
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

  // Step 1: POST to j_security_check
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

  // Step 2: Auth redirect
  const res2 = await fetch(loc1, {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    redirect: 'manual'
  });
  save(res2);
  const loc2 = res2.headers.get('location');

  // Step 3: MenuInternet
  const res3 = await fetch(loc2, {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': loc1
    }
  });
  save(res3);

  // Step 4: GET buzon action
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
  console.log('Visor URL:', visorUrl ? visorUrl.substring(0, 80) : 'none');

  // Step 5: GET Visor page to initialize visor session
  const resVisor = await fetch(visorUrl, {
    headers: {
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm'
    }
  });
  save(resVisor);

  // Step 6: Fetch NOTIFICACIONES (tipoMsj = 2)
  console.log('\n--- FETCHING NOTIFICACIONES (tipoMsj = 2) ---');
  const notiParams = new URLSearchParams({
    tipoMsj: '2',
    codCarpeta: '00',
    codEtiqueta: '',
    page: '1',
    des_asunto: '',
    codMensaje: '',
    tipoOrden: 'TODOS'
  });

  const resNoti = await fetch('https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/listNotiMenPag?' + notiParams.toString(), {
    headers: {
      'X-Ruc': ruc,
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': visorUrl,
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  save(resNoti);
  console.log('resNoti status:', resNoti.status);
  const dataNoti = await resNoti.json().catch(async () => await resNoti.text());
  console.log('Notificaciones response preview:\n', JSON.stringify(dataNoti, null, 2).substring(0, 1500));

  // Step 7: Fetch MENSAJES (tipoMsj = 1)
  console.log('\n--- FETCHING MENSAJES (tipoMsj = 1) ---');
  const menParams = new URLSearchParams({
    tipoMsj: '1',
    codCarpeta: '00',
    codEtiqueta: '',
    page: '1',
    des_asunto: '',
    codMensaje: '',
    tipoOrden: 'TODOS'
  });

  const resMen = await fetch('https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/listNotiMenPag?' + menParams.toString(), {
    headers: {
      'X-Ruc': ruc,
      'Cookie': cookies(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': visorUrl,
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  save(resMen);
  console.log('resMen status:', resMen.status);
  const dataMen = await resMen.json().catch(async () => await resMen.text());
  console.log('Mensajes response preview:\n', JSON.stringify(dataMen, null, 2).substring(0, 1500));
}

getRealBuzon().catch(console.error);

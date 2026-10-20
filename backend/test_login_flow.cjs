const fs = require('fs');

async function main() {
  const res = await fetch('https://api-seguridad.sunat.gob.pe/v1/clientessol/4f3b88b3-d9d6-402a-b85d-6a0bc857746a/oauth2/authen?redirect_uri=https://e-menu.sunat.gob.pe/cl-ti-itmenu/AutenticaMenuInternet.htm&state=rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAADdAADZXhlcHQABnBhcmFtc3QASyomKiYvY2wtdGktaXRtZW51L01lbnVJbnRlcm5ldC5odG0mYjY0ZDI2YThiNWFmMDkxOTIzYjIzYjY0MDdhMWMxZGI0MWU3MzNhNnQABGV4ZWNweA==&client_id=4f3b88b3-d9d6-402a-b85d-6a0bc857746a&response_type=code', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  console.log('Authen cookies:', cookies);

  const text = await res.text();
  const formIdx = text.indexOf('name="LoginForm"');
  console.log('FORM:\n', text.substring(formIdx - 10, formIdx + 700));

  // Also check if there is any code setting originalUrl, lang, or state
  const stateMatch = text.match(/name="state"[^>]*value="([^"]*)"/i);
  console.log('state in HTML:', stateMatch ? stateMatch[1] : 'empty');
  
  const origMatch = text.match(/name="originalUrl"[^>]*value="([^"]*)"/i);
  console.log('orig in HTML:', origMatch ? origMatch[1] : 'empty');

  // Let's check how state is initialized in the script:
  const scriptState = text.match(/state[\s\S]{0,100}val\([^)]*\)/gi);
  console.log('script state matches:', scriptState);
}

main().catch(console.error);

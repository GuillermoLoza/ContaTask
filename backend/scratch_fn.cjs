const fs = require('fs');
const html = fs.readFileSync('visor.html', 'utf8');

// Find VAR_CONTEXT
const contextMatch = html.match(/var\s+VAR_CONTEXT\s*=\s*['"][^'"]*['"]/i);
console.log('VAR_CONTEXT:', contextMatch ? contextMatch[0] : 'not found');

// Find fListarNotiMen function
const fnIdx = html.indexOf('function fListarNotiMen(');
if (fnIdx !== -1) {
  console.log('fListarNotiMen:\n', html.substring(fnIdx, fnIdx + 2000));
} else {
  console.log('fListarNotiMen not defined inline, searching fListarNotiMen occurrences...');
  const occ = html.match(/.{0,50}fListarNotiMen.{0,100}/gi);
  console.log(occ);
}

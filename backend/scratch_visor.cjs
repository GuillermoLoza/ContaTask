const fs = require('fs');
const html = fs.readFileSync('visor.html', 'utf8');

// Find all URLs, AJAX calls, and scripts in visor.html
const ajaxCalls = html.match(/\$\.(?:ajax|get|post)\s*\(\{[\s\S]*?\}\)/gi) || [];
console.log('AJAX calls count:', ajaxCalls.length);
ajaxCalls.forEach((a, i) => console.log('AJAX ' + i + ':\n' + a.substring(0, 300)));

const urls = html.match(/(?:url|action)\s*:\s*['"][^'"]+['"]/gi) || [];
console.log('URL matches in visor.html:\n', urls);

// Also look for keywords: notifica, mensaje, list, tabla, grid, json
const keywordMatches = html.match(/.{0,50}(?:notifica|mensaje|buzon|bandeja|inbox|comunicacion).{0,50}/gi) || [];
console.log('Keyword matches count:', keywordMatches.length);
console.log('Keywords sample:\n', keywordMatches.slice(0, 15).map(s => s.trim()));

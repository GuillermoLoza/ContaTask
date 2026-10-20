const fs = require('fs');
const html = fs.readFileSync('menu_internet.html', 'utf8');

const idx = html.indexOf('function cargaBuzon()');
console.log(html.substring(idx - 200, idx + 800));

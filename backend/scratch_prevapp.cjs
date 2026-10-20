const fs = require('fs');
const html = fs.readFileSync('menu_internet.html', 'utf8');

let idx = 0;
while (true) {
  const found = html.indexOf('prevApp', idx);
  if (found === -1) break;
  console.log('--- FOUND AT ' + found + ' ---');
  console.log(html.substring(found - 100, found + 800));
  idx = found + 10;
}

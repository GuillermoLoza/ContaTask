const fs = require('fs');
const html = fs.readFileSync('visor.html', 'utf8');

const detIdx = html.indexOf('/obtenerDetalleNotiMen');
console.log('obtenerDetalleNotiMen:\n', html.substring(detIdx - 100, detIdx + 1200));

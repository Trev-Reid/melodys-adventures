/** HUD art pass, 2026-10-26. Original geometric pixel drawings; no delivered masters.
 * Draw on a 30px canvas and export at 2x. Only these four authorised badges.
 */
import { writePng } from './png';

const colors = ['142c29', '29463c', '64765a', 'e0c68e', 'f3e6c8'];
for (const name of ['sprint', 'strength', 'sniff', 'bark']) {
  const pixels = new Uint8Array(30 * 30);
  const dot = (x: number, y: number, c: number) => { if (x >= 0 && x < 30 && y >= 0 && y < 30) pixels[y * 30 + x] = c; };
  const rect = (x: number, y: number, w: number, h: number, c: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) dot(xx, yy, c);
  };
  const ellipse = (cx: number, cy: number, rx: number, ry: number, c: number) => {
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) if (((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1) dot(x,y,c);
  };
  const poly = (points: number[][], c: number) => {
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) {
      let inside = false;
      for (let i = 0, j = points.length-1; i < points.length; j = i++) {
        const [xi,yi] = points[i], [xj,yj] = points[j];
        if ((yi > y) !== (yj > y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) inside = !inside;
      }
      if (inside) dot(x,y,c);
    }
  };
  // Stepped circular silhouette, upper-left rim lit in gold.
  ellipse(14.5,14.5,14.5,14.5,1);
  ellipse(14.5,14.5,13.5,13.5,3);
  ellipse(14,14,13,13,4);
  ellipse(14.5,14.5,12,12,2);
  ellipse(15,15,11,11,1);
  if (name === 'sprint') {
    poly([[15,5],[21,5],[17,12],[22,12],[11,26],[13,17],[8,17]],4);
    poly([[15,5],[19,5],[15,13],[12,13]],5);
  } else if (name === 'strength') {
    // Upright closed fist, bent forearm, biceps and broad horizontal upper arm.
    poly([[6,22],[6,17],[9,14],[13,14],[16,17],[18,15],[18,10],[16,10],[16,6],[21,6],[23,8],[23,18],[20,23],[10,24]],4);
    poly([[7,18],[10,15],[13,15],[15,17],[12,17],[10,19]],5);
    rect(17,6,4,2,5);
    rect(19,11,2,5,5);
    rect(12,21,7,2,3);
  } else if (name === 'sniff') {
    ellipse(14.5,19,6,5,4);
    ellipse(7,12,2,3,4); ellipse(12,8,2,3,4);
    ellipse(18,8,2,3,4); ellipse(23,12,2,3,4);
    rect(12,16,4,2,5);
  } else {
    rect(6,12,5,7,4);
    poly([[10,12],[17,7],[17,24],[10,19]],4);
    rect(6,12,4,2,5); rect(15,10,1,10,5);
    // Separate stepped sound waves, with a full art pixel of clear space.
    rect(19,12,2,7,5); rect(18,10,2,2,5); rect(18,19,2,2,4);
    rect(24,11,2,9,4); rect(22,8,2,3,4); rect(22,20,2,3,4);
  }
  const data = new Uint8Array(60*60*4);
  for (let y = 0; y < 60; y++) for (let x = 0; x < 60; x++) {
    const c = pixels[Math.floor(y/2)*30+Math.floor(x/2)];
    if (!c) continue;
    const hex = colors[c-1]; const i = (y*60+x)*4;
    data.set([parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),255],i);
  }
  writePng(`public/assets/ui/badge-${name}.png`, {width:60,height:60,data});
}

import fs from 'fs';
import path from 'path';
import { generateSitemapXML, generateRobotsTxt } from '../src/utils/sitemap';

const publicDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), generateSitemapXML());
fs.writeFileSync(path.join(publicDir, 'robots.txt'), generateRobotsTxt());

console.log('✅ sitemap.xml and robots.txt successfully generated in /public!');

// Copies the built single-file team app into public/ so the incharge app can hand it out.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
const src = 'dist-team/index.html';
if (!existsSync(src)) { console.error('dist-team/index.html not found. Run "npm run build:team" first.'); process.exit(1); }
mkdirSync('public', { recursive: true });
copyFileSync(src, 'public/team-template.html');
console.log('Team app template copied to public/team-template.html');

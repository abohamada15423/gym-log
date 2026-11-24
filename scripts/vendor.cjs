// Copies the browser build of supabase-js into js/vendor/, so the app loads it from its own site
// (and the service worker can keep it for offline use). Run after changing its version in package.json:
//   npm install && npm run vendor
const fs = require('node:fs');
const pkg = require('@supabase/supabase-js/package.json');
const src = require.resolve('@supabase/supabase-js/dist/umd/supabase.js');
const header = `/*! @supabase/supabase-js ${pkg.version} | MIT License | https://github.com/supabase/supabase-js\n` +
  `   Copied unchanged from node_modules/@supabase/supabase-js/dist/umd/supabase.js (npm run vendor). */\n`;
fs.mkdirSync('js/vendor', { recursive: true });
fs.writeFileSync('js/vendor/supabase.js', header + fs.readFileSync(src, 'utf8'));
console.log(`js/vendor/supabase.js: supabase-js ${pkg.version}`);

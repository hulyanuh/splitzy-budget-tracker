const fs = require('fs');
const path = 'node_modules/@expo/cli/build/src/start/server/metro/externals.js';
let content = fs.readFileSync(path, 'utf8');

// Only patch if not already patched
if (!content.includes('if (shimDir.includes(":")) continue;')) {
  content = content.replace(
    'await _fs.default.promises.mkdir(shimDir,',
    'if (shimDir.includes(":")) continue; await _fs.default.promises.mkdir(shimDir,'
  );
  fs.writeFileSync(path, content);
  console.log('Patched externals.js');
} else {
  console.log('Already patched, skipping');
}

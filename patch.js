const fs = require('fs');
const path = 'node_modules/@expo/cli/build/src/start/server/metro/externals.js';

try {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
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
  } else {
    console.log('Patch file not found (SDK 54+ handles this natively), skipping');
  }
} catch (e) {
  console.log('Patch skipped due to error:', e.message);
}

const fs = require('fs');
const path = require('path');

const buildDir = path.resolve(__dirname, '..', 'build');

function walk(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function backup(originalPath, text) {
  const bak = originalPath + '.bak';
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, text, 'utf8');
}

function fixFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.html', '.js', '.css', '.json'].includes(ext)) return;
  let text = fs.readFileSync(filePath, 'utf8');
  backup(filePath, text);

  // Patterns to replace:
  // 1) src="/something" or src='/something' -> src="something"
  // 2) href="/something"
  // 3) url(/something) in CSS -> url(something)
  // Avoid touching protocol-relative URLs (//example.com) or absolute protocol (http://)

  // Replace attributes src= or href= with a leading single slash (but not //)
  text = text.replace(/(\b(?:src|href)\s*=\s*)(["']?)\/(?!\/)/gi, (m, p1, quote) => {
    return p1 + (quote || '"');
  });

  // Replace url(/path) but not url(//...)
  text = text.replace(/url\(\s*\/(?!\/)/gi, 'url(');

  // Also handle JavaScript string literals that start with '/': '/asset' -> 'asset'
  // Only perform on .js/.json files to be conservative
  if (ext === '.js' || ext === '.json') {
    text = text.replace(/(["'])\/(?!\/)/g, '$1');
  }

  fs.writeFileSync(filePath, text, 'utf8');
  console.log('Fixed', path.relative(buildDir, filePath));
}

if (!fs.existsSync(buildDir)) {
  console.error('build directory not found:', buildDir);
  process.exit(1);
}

const all = walk(buildDir);
all.forEach(fixFile);
console.log('Done fixing build paths');

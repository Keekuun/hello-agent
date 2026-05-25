/**
 * 确保 better-sqlite3 原生模块与当前 Node 版本匹配。
 * 切换 Node 大版本后若报 bindings / NODE_MODULE_VERSION 错误，会强制重新下载预编译包。
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadSqlite() {
  return require('better-sqlite3');
}

function needsRebuild(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('NODE_MODULE_VERSION') ||
    message.includes('bindings file') ||
    message.includes('Could not locate the bindings')
  );
}

function rebuildSqlite() {
  const pkgDir = path.dirname(require.resolve('better-sqlite3/package.json'));
  const buildDir = path.join(pkgDir, 'build');
  fs.rmSync(buildDir, { recursive: true, force: true });
  execSync('npx prebuild-install --force', { cwd: pkgDir, stdio: 'inherit' });
}

try {
  const Database = loadSqlite();
  const db = new Database(':memory:');
  db.close();
} catch (error) {
  if (!needsRebuild(error)) {
    throw error;
  }
  console.log('[postinstall] Rebuilding better-sqlite3 for Node', process.version, '...');
  rebuildSqlite();
  const Database = loadSqlite();
  const db = new Database(':memory:');
  db.close();
  console.log('[postinstall] better-sqlite3 is ready.');
}

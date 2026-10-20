const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const VER = require(path.join(root, 'package.json')).version;
const skipObfuscation = process.argv.includes('--no-obfuscate');

const run = (cmd) => {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit' });
};
const rm = (p) => fs.rmSync(path.join(root, p), { recursive: true, force: true });

console.log(`Iniciando empaquetado de producción v${VER}`);

rm('build');
rm('binaries');
rm('dist');
fs.mkdirSync(path.join(root, 'build'));
fs.mkdirSync(path.join(root, 'binaries'));

run('npx tsc');
if (!skipObfuscation) run('node scripts/obfuscate.js');

fs.cpSync(path.join(root, 'dist'), path.join(root, 'build', 'dist'), { recursive: true });
for (const file of ['package.json', 'package-lock.json', 'ecosystem.config.js']) {
    fs.copyFileSync(path.join(root, file), path.join(root, 'build', file));
}

const archive = `pms_be_${VER}.tgz`;
run(`tar -czf binaries/${archive} -C build .`);

console.log(`Paquete generado: binaries/${archive}`);
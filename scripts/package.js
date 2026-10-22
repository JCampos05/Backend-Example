const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const VER = require(path.join(root, 'package.json')).version;
const skipObfuscation = process.argv.includes('--no-obfuscate');
const build = path.join(root, 'build');
const binaries = path.join(root, 'binaries');
const archive = path.join(binaries, `pms_be_${VER}.tgz`);

const run = (cmd) => {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: root, stdio: 'inherit' });
};

console.log(`Iniciando empaquetado de producción v${VER}`);

fs.rmSync(build, { recursive: true, force: true });
fs.rmSync(binaries, { recursive: true, force: true });
fs.mkdirSync(binaries, { recursive: true });

// Compila solo src/ (sin tests) directo a build/dist
run('npx tsc -p tsconfig.build.json');
if (!skipObfuscation) run('node scripts/obfuscate.js build/dist');

for (const file of ['package.json', 'package-lock.json', 'ecosystem.config.js']) {
    fs.copyFileSync(path.join(root, file), path.join(build, file));
}

run(`tar -czf "${archive}" -C "${build}" .`);
console.log(`Paquete generado: ${archive}`);
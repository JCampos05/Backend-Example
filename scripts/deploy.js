const { spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const { version } = require(path.join(root, 'package.json'));
const archiveName = `pms_be_${version}.tgz`;
const archive = path.join(root, 'binaries', archiveName);
const release = path.join(root, 'release');
const pm2Bin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'pm2.cmd' : 'pm2');
const APPS = ['pms-backend', 'pms-worker', 'pms-audit-worker', 'pms-analytics-worker'];

const log = (m) => console.log(m);
const banner = (m) => { log('=========================================='); log(m); log('=========================================='); };
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });
const fail = (m) => { console.error(`\n[ERROR] ${m}`); process.exit(1); };

function waitPort(port, name, timeoutMs = 60000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const s = net.connect(port, '127.0.0.1');
            s.once('connect', () => { s.destroy(); resolve(); });
            s.once('error', () => {
                s.destroy();
                if (Date.now() - start > timeoutMs) reject(new Error(`${name} (puerto ${port}) no respondió`));
                else setTimeout(attempt, 1000);
            });
        };
        attempt();
    });
}

function ensureEnv() {
    const env = path.join(root, '.env');
    if (fs.existsSync(env)) return;
    const example = path.join(root, '.env.example');
    if (!fs.existsSync(example)) fail('No existe .env ni .env.example. Crea un .env con la configuración.');
    fs.copyFileSync(example, env);
    log('Se creó .env a partir de .env.example (revisa sus valores, sobre todo los secretos).');
}

async function deployLocal() {
    banner(`Despliegue LOCAL de PMS backend v${version}`);
    ensureEnv();

    if (!flag('--no-infra')) {
        log('Levantando infraestructura con Docker (postgres, redis, rabbitmq)...');
        try { sh('docker --version', root); } catch { fail('Docker no está disponible. Instálalo o usa --no-infra si ya tienes Postgres y Redis.'); }
        sh('docker compose --env-file .env -f docker/docker-compose.yml up -d postgres redis rabbitmq');
        log('Esperando a que respondan...');
        await waitPort(5432, 'PostgreSQL');
        await waitPort(6379, 'Redis');
    }

    if (!fs.existsSync(path.join(root, 'node_modules'))) { log('Instalando dependencias...'); sh('npm ci'); }

    sh('node scripts/package.js');

    stopLocal(true);

    log(`Instalando el paquete en ${release} ...`);
    fs.rmSync(path.join(release, 'dist'), { recursive: true, force: true });
    fs.mkdirSync(release, { recursive: true });
    sh(`tar -xzf "${archive}" -C "${release}"`);
    fs.copyFileSync(path.join(root, '.env'), path.join(release, '.env'));
    sh('npm ci --omit=dev', release);

    log('Arrancando con PM2...');
    sh(`"${pm2Bin}" startOrRestart ecosystem.config.js --env production`, release);
    sh(`"${pm2Bin}" status`, release);
    banner('Listo. Logs: npx pm2 logs  |  Detener: npm run deploy:stop');
}

function stopLocal(quiet = false) {
    if (!fs.existsSync(pm2Bin)) {
        if (quiet) return;
        fail('PM2 no está instalado (npm i -D pm2).');
    }
    try {
        execSync(`"${pm2Bin}" delete ${APPS.join(' ')}`, { cwd: root, stdio: quiet ? 'ignore' : 'inherit' });
    } catch {
        if (!quiet) fail('No había nada que detener (o PM2 no respondió).');
    }
}

function deployRemote() {
    const host = process.env.DEPLOY_HOST || 'localhost';
    const port = process.env.DEPLOY_PORT || '2222';
    const user = process.env.DEPLOY_USER || 'ubuntu';
    const key = path.resolve(root, process.env.DEPLOY_KEY || 'docker/ec2-sim/mi_clave_ec2');
    const dir = process.env.DEPLOY_DIR || `/home/${user}/pms-backend`;
    const envFile = path.join(root, '.env.production');

    if (!fs.existsSync(key)) fail(`No existe la clave SSH: ${key}`);
    banner(`Desplegando v${version} hacia ${user}@${host}:${port}`);
    sh('node scripts/package.js');

    const sshOpts = ['-i', key, '-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=yes'];
    const target = `${user}@${host}`;
    const run = (cmd, a, input) => {
        const r = spawnSync(cmd, a, { stdio: ['pipe', 'inherit', 'inherit'], input });
        if (r.error) fail(r.error.message);
        if (r.status !== 0) fail(`Falló: ${cmd} (código ${r.status})`);
    };
    const ssh = (script) => run('ssh', [...sshOpts, '-p', port, target, 'bash -s'], script);
    const scp = (file, dest) => run('scp', [...sshOpts, '-P', port, file, `${target}:${dest}`]);

    ssh(`mkdir -p ${dir}\n`);
    log('Transfiriendo paquete...');
    scp(archive, `${dir}/${archiveName}`);
    if (fs.existsSync(envFile)) { log('Transfiriendo .env.production como .env ...'); scp(envFile, `${dir}/.env`); }
    else log('(No hay .env.production local: se usa el .env que ya exista en el servidor)');

    log('Instalando y reiniciando en el servidor...');
    ssh(`set -e
cd ${dir}
rm -rf dist
tar -xzf ${archiveName}
rm -f ${archiveName}
npm ci --omit=dev
pm2 startOrRestart ecosystem.config.js --env production
pm2 save
pm2 status
`);
    banner('Despliegue finalizado exitosamente.');
}

(async () => {
    try {
        if (flag('--stop')) stopLocal();
        else if (flag('--ssh')) deployRemote();
        else await deployLocal();
    } catch (e) { fail(e.message); }
})();
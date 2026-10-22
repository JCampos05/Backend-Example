require('dotenv').config({ quiet: true });

const base = {
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    env_production: { NODE_ENV: 'production' },
};

const apps = [
    { ...base, name: 'pms-backend', script: 'dist/src/main.js', max_memory_restart: '500M' },
    { ...base, name: 'pms-worker', script: 'dist/src/workers/main.worker.js' },
];

if (process.env.RABBITMQ_URL) {
    apps.push(
        { ...base, name: 'pms-audit-worker', script: 'dist/src/workers/main.audit.js' },
        { ...base, name: 'pms-analytics-worker', script: 'dist/src/workers/main.analytics.js' },
    );
}

module.exports = { apps };
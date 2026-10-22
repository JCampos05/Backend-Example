const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('node:fs');
const path = require('node:path');

const options = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.8,
    unicodeEscapeSequence: false,
};

function obfuscateDirectory(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            obfuscateDirectory(full);
        } else if (entry.name.endsWith('.js')) {
            const code = fs.readFileSync(full, 'utf8');
            fs.writeFileSync(full, JavaScriptObfuscator.obfuscate(code, options).getObfuscatedCode(), 'utf8');
            console.log(`[Ofuscado] ${full}`);
        }
    }
}

const target = path.resolve(process.argv[2] || path.join(__dirname, '..', 'build', 'dist'));
if (!fs.existsSync(target)) {
    console.error(`No existe la carpeta a ofuscar: ${target}`);
    process.exit(1);
}
obfuscateDirectory(target);
console.log('Ofuscación completada exitosamente.');
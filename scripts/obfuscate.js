const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('node:fs');
const path = require('node:path');

const obfuscatorOptions = {
    target: 'node',
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false, 
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false,
};

function obfuscateDirectory(dirPath) {
    for (const file of fs.readdirSync(dirPath)) {
        const fullPath = path.join(dirPath, file);

        if (fs.statSync(fullPath).isDirectory()) {
            obfuscateDirectory(fullPath);
        } else if (file.endsWith('.js')) {
            if (file.endsWith('.entity.js')) {
                console.log(`[Omitido ] ${fullPath} (entidad TypeORM)`);
                continue;
            }
            const source = fs.readFileSync(fullPath, 'utf8');
            const result = JavaScriptObfuscator.obfuscate(source, obfuscatorOptions);
            fs.writeFileSync(fullPath, result.getObfuscatedCode(), 'utf8');
            console.log(`[Ofuscado] ${fullPath}`);
        }
    }
}

obfuscateDirectory(path.join(__dirname, '..', 'dist'));
console.log('Ofuscación completada exitosamente.');
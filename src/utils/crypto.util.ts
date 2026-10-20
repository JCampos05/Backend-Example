import crypto from 'crypto';

// La clave (32 bytes en hexadecimal = 64 caracteres) viene de ENCRYPTION_KEY
const getKey = (): Buffer => {
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error('ENCRYPTION_KEY debe tener 64 caracteres hexadecimales (32 bytes)');
    }
    return Buffer.from(hex, 'hex');
};

// AES-256-GCM: cifra y además detecta si el texto cifrado fue alterado
export const cryptoUtil = {
    encrypt(plain: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
        const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return [iv, tag, encrypted].map((part) => part.toString('base64')).join('.');
    },

    decrypt(payload: string): string {
        const [iv, tag, encrypted] = payload.split('.').map((part) => Buffer.from(part, 'base64'));
        const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    },
};
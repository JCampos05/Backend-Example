import { expect } from 'chai';
import { AuthUtil } from '../../src/utils/auth.util';

describe('Pruebas unitarias: AuthUtil', () => {
    const mockPayload = { user_id: 'usr-1234-uuid', email: 'admin@pms.com', username: 'admin' };

    it('debe generar un token JWT válido y no nulo', () => {
        const token = AuthUtil.generateAccessToken(mockPayload);
        expect(token).to.be.a('string');
        expect(token.split('.')).to.have.lengthOf(3);
    });

    it('debe decodificar correctamente el payload de un token generado', () => {
        const token = AuthUtil.generateAccessToken(mockPayload);
        const decoded = AuthUtil.verifyToken(token);
        expect(decoded).to.have.property('user_id', 'usr-1234-uuid');
        expect(decoded).to.have.property('username', 'admin');
    });

    it('debe lanzar una excepción al verificar un token con firma alterada', () => {
        const token = AuthUtil.generateAccessToken(mockPayload);
        const tamperedToken = token + 'invalid';
        expect(() => {
            AuthUtil.verifyToken(tamperedToken);
        }).to.throw();
    });
});
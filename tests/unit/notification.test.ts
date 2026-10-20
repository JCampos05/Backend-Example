import sinon from 'sinon';
import { expect } from 'chai';
import { NotificationUtil } from '../../src/utils/notification.util';

describe('Pruebas aisladas con stubs: NotificationUtil', () => {
    let enqueueStub: sinon.SinonStub;

    beforeEach(() => {
        enqueueStub = sinon.stub(NotificationUtil, 'enqueueEmail').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('debe invocar el encolamiento con la dirección y asunto correctos sin enviar un email real', async () => {
        const result = await NotificationUtil.notifyTaskAssigned('dev@pms.com', 'Implementación de API REST');

        expect(result).to.equal(true);
        expect(enqueueStub.calledOnce).to.be.true;
        expect(enqueueStub.firstCall.args[0]).to.equal('dev@pms.com');
        expect(enqueueStub.firstCall.args[1]).to.contain('Implementación de API REST');
    });
});
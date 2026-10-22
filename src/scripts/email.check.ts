import 'dotenv/config';
import { NotificationUtil } from '../utils/notification.util';

(async () => {
    const to = process.argv[2] || 'prueba@pms.local';
    await NotificationUtil.notifyTaskAssigned(to, 'Tarea de prueba');
    console.log(`Correo encolado para ${to}. Revisa tu bandeja (el worker debe estar corriendo).`);
    await NotificationUtil.emailQueue.close();
})();
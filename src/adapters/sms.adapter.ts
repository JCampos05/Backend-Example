export interface ISmsNotifier {
    sendSms(phoneNumber: string, message: string): Promise<boolean>;
}

// Cliente de un proveedor externo con interfaz distinta 
class TwilioLegacyClient {
    public async dispatchMessage(opts: { to: string; body: string; fromNumber: string }): Promise<{ status: string }> {
        console.log(`[SMS simulado] ${opts.fromNumber} -> ${opts.to}: ${opts.body}`);
        return { status: 'delivered' };
    }
}

// Adaptador: traduce sendSms(...) a la forma que exige el proveedor
export class TwilioSmsAdapter implements ISmsNotifier {
    private twilioClient = new TwilioLegacyClient();

    constructor(private readonly fromNumber: string) {}

    public async sendSms(phoneNumber: string, message: string): Promise<boolean> {
        try {
            const response = await this.twilioClient.dispatchMessage({
                to: phoneNumber,
                body: message,
                fromNumber: this.fromNumber,
            });
            return response.status === 'delivered';
        } catch (error) {
            console.error('Error en TwilioSmsAdapter:', error);
            return false;
        }
    }
}
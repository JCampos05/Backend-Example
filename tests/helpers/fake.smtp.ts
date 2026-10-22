import net, { AddressInfo, Socket } from 'net';

export interface CapturedMail {
    from: string;
    to: string[];
    data: string;
}

// Servidor SMTP mínimo para pruebas: guarda los correos que recibe, sin enviar nada a internet.
export class FakeSmtpServer {
    public mails: CapturedMail[] = [];
    public rejectNext = 0; // cuántas conexiones rechazar (554) antes de aceptar correos
    public port = 0;
    private server = net.createServer((socket) => this.handle(socket));

    public async start(): Promise<void> {
        await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
        this.port = (this.server.address() as AddressInfo).port;
    }

    public async stop(): Promise<void> {
        await new Promise<void>((resolve) => this.server.close(() => resolve()));
    }

    private handle(socket: Socket): void {
        if (this.rejectNext > 0) {
            this.rejectNext--;
            socket.end('554 5.3.2 Rechazado por la prueba\r\n');
            return;
        }
        socket.write('220 fake.smtp ESMTP\r\n');
        let buffer = '';
        let inData = false;
        let current: CapturedMail = { from: '', to: [], data: '' };

        socket.on('error', () => undefined);
        socket.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            let idx: number;
            while ((idx = buffer.indexOf('\r\n')) !== -1) {
                const line = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 2);

                if (inData) {
                    if (line === '.') {
                        this.mails.push(current);
                        current = { from: '', to: [], data: '' };
                        inData = false;
                        socket.write('250 OK queued\r\n');
                    } else {
                        current.data += (line.startsWith('..') ? line.slice(1) : line) + '\r\n';
                    }
                    continue;
                }

                const cmd = line.toUpperCase();
                if (cmd.startsWith('EHLO') || cmd.startsWith('HELO')) socket.write('250-fake.smtp\r\n250 8BITMIME\r\n');
                else if (cmd.startsWith('MAIL FROM')) { current.from = line.replace(/^MAIL FROM:\s*<?|>?(\s.*)?$/gi, ''); socket.write('250 OK\r\n'); }
                else if (cmd.startsWith('RCPT TO')) { current.to.push(line.replace(/^RCPT TO:\s*<?|>?(\s.*)?$/gi, '')); socket.write('250 OK\r\n'); }
                else if (cmd === 'DATA') { inData = true; socket.write('354 Termina con <CRLF>.<CRLF>\r\n'); }
                else if (cmd === 'QUIT') { socket.end('221 Bye\r\n'); }
                else if (cmd === 'RSET' || cmd === 'NOOP') socket.write('250 OK\r\n');
                else socket.write('502 Comando no soportado\r\n');
            }
        });
    }
}
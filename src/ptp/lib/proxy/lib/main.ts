import * as https from 'https';
import * as http from 'http';
import * as net from 'net';
import { 
    ProxyScrape, 
    ProxyList 
} from './scrape.js';
import { Proxy } from './types.js';
import { 
    HttpParser, 
    Request,
    Response, 
    Headers,
} from '@lib/http';
import { Destination } from './types.js';
import { 
    Tor, 
    TorOptions 
} from './tor.js';
import { 
    SocksHandler, 
    SocksOptions 
} from './socks.js';
import { Log } from "@lib/log";

export interface Options {
    host : string;
    port : number;
    key: Buffer; // fs.readFileSync('./cert/key.pem')
    cert: Buffer; // fs.readFileSync('./cert/cert.pem')
    tor: TorOptions;
};

export class LocalProxy {
  
    private listening : boolean = false;
    private server : https.Server;
    private proxys : ProxyList = [];
    private scrape : ProxyScrape = new ProxyScrape();
    private options : Options;
    private tor : Tor;

    public constructor(options : Options){
        Log.init(process.cwd() + "/log.txt", true);
        
        this.options = options;
        if(this.options.host) this.options.host = '127.0.0.1';
        
        this.tor = new Tor(this.options.tor);

        this.scrape.on('loaded', () => {
            Log.log(Log.STATUS, "Proxys loaded! Finding valid proxies...");
            this.scrape.findValidProxys();
        });

        this.scrape.on('found', (proxy : Proxy) => {
            Log.log(Log.INFO, `Proxy found: ${proxy.ip}:${proxy.port}`);
            if(!this.listening){
                this.listen();
            };
            this.proxys.push(proxy);
        });

        this.findNewProxys();
    };

    private findNewProxys(){
        this.proxys = [];
        this.scrape.getProxys();
    };
    
    private handler = (req : http.IncomingMessage, res : http.ServerResponse) => {
        let body : string = '';
        req.on('data', (chunk : Buffer) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            const url : URL = new URL(req.url);
            const dest : Destination = {
                host: url.hostname,
                port: parseInt(url.port) || (url.protocol === 'http:') ? 80 : 443,
            };

            let request : Request = {
                requestLine: {
                    method: req.method,
                    version: 'HTTP/' + req.httpVersion,
                    path: `${url.pathname || '/'}${url.search}${url.hash}`,
                },
                headers: <Headers> req.headers,
            };
            if(body.length > 0) request.body = body;
            const raw : string = HttpParser.build(request);

            try {
                const socksSocket : SocksHandler = await this.tunnel(dest);
                socksSocket.on('ready', (sock : net.Socket) => {
                    sock.pipe(req.socket); // Pipe recived from sock to clientSocket
                    sock.write(raw);
                });
            } catch(err){
                this.error(res.socket, req, 'ERROR while creating the tunnel.' + (err as Error).message);
            };
        });
    };

    private error(sock : net.Socket, req : http.IncomingMessage, msg : string) : void {
        Log.log(Log.ERROR, msg);
        const response : Response = {
            statusLine: {
                version: 'HTTP/' + req.httpVersion,
                status: 500,
                message: 'Internal server error!'
            },
            headers: {}
        };
        const str : string = HttpParser.build(response);
        sock.write(str);
        sock.destroy();
    };

    private async tunnel(dest : Destination) : Promise<SocksHandler> {
        const proxy : Destination = {
            host: this.scrape.validProxys[0].ip,
            port: this.scrape.validProxys[0].port,
        };
        const torSocket : net.Socket = await this.tor.connect(proxy);
        const socksHandlerOptions : SocksOptions = {
            tor: torSocket,
            proxy: {
                ip: proxy.host,
                port: proxy.port,
            },
            version: 5,
            destination: <Destination> dest,
        };
        const socksHandler : SocksHandler = new SocksHandler(socksHandlerOptions);
        socksHandler.on('ready', (sock : net.Socket) => {
            Log.log(Log.STATUS, "Tunnel done it successfully!");
        });

        return socksHandler;
    };

    /**
     * idk the usage of head param, it's always void.
     */
    private connect = async (req : http.IncomingMessage, clientSocket : net.Socket, head : Buffer) : Promise<void> => {
        Log.log(Log.INFO, "CONNECT method recived!");
        const url : URL = new URL(`http://${req.url}`);
        const dest : Destination = {
            host: url.hostname,
            port: parseInt(url.port),
        };
        try {
            const socksSocket : SocksHandler = await this.tunnel(dest);
            socksSocket.on('ready', (sock : net.Socket) => {
                clientSocket.pipe(sock); // Pipe recived from clientSocket to sock
                sock.pipe(clientSocket); // Pipe recived from sock to clientSocket
                clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-agent: Node.js-Proxy\r\n' + // Remove this header maybe
                '\r\n');
            });
        } catch(err){
            this.error(clientSocket, req, 'ERROR while creating the tunnel.' + (err as Error).message);
        };
    };

    private listen() : void {
        this.listening = true;

        const options : https.ServerOptions = {
            key: this.options.key,
            cert: this.options.cert,
            rejectUnauthorized: false,
        };
        
        this.server = https.createServer(options, this.handler);
        this.server.on('connect', this.connect);
        this.server.listen(this.options.port, 
            this.options.host, 
            () => {
                Log.log(Log.STATUS, `Local proxy listening on ${this.options.host}:${this.options.port}`);
            });
    };
};
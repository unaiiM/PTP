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
    Headers, 
    UrlExtractor, 
    UrlDestination 
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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface Options {
    host : string;
    port : number;
    key: Buffer; // fs.readFileSync('./cert/key.pem')
    cert: Buffer; // fs.readFileSync('./cert/cert.pem')
    tor: TorOptions;
};

export class ProxyHandler {
  
    private listening : boolean = false;
    private server : https.Server;
    private proxys : ProxyList = [];
    private scrape : ProxyScrape = new ProxyScrape();
    private options : Options;
    private tor : Tor;

    public constructor(options : Options){
        this.options = options;
        this.tor = new Tor(this.options.tor);
        this.scrape.on('loaded', () => {
            this.scrape.findValidProxys();
        });

        this.scrape.on('found', (proxy : Proxy) => {
            if(!this.listening){
                console.log('Setuping server!');
                this.listen();
            };
            this.proxys.push(proxy);
        });

        console.log('Server is waiting to start...');
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
            let extractor : UrlExtractor = new UrlExtractor(req.url);
            let proto : string = extractor.protocol();
            let dest : UrlDestination = extractor.host();
            if(!dest.port) dest.port = (proto === 'http') ? 80 : 443;

            let request : Request = {
                requestLine: {
                    method: req.method,
                    version: 'HTTP/' + req.httpVersion,
                    path: extractor.url,
                },
                headers: <Headers> req.headers,
            };
            if(body.length > 0) request.body = body;
            const raw : string = HttpParser.build(request);

            const proxy : Destination = {
                host: this.scrape.validProxys[0].ip,
                port: this.scrape.validProxys[0].port,
            };
            const torSocket : net.Socket = await this.tor.connect(proxy);
            const socksHandlerOptions : SocksOptions = {
                tor: torSocket,
                proxy: this.scrape.validProxys[0], // need to do that bcs idk why I can't left the socks proxy options void
                                                   // if I alredy have an existing socket, idk, idk...
                version: 5,
                destination: <Destination> dest,
            };

            const socksHandler : SocksHandler = new SocksHandler(socksHandlerOptions);
            socksHandler.on('ready', (sock : net.Socket) => {
                console.log('Socket ready!');
                sock.on('data', (buff : Buffer) => {
                    console.log(buff.toString());
                });
                sock.write(raw);
            });
        });

        res.writeHead(200);
        res.end(`hello world\n`);
    };

    /**
     * idk the usage of head param, it's always void.
     */
    private connect = async (req : http.IncomingMessage, clientSocket : net.Socket, head : Buffer) : Promise<void> => {

        const url : URL = new URL(`http://${req.url}`);
        console.log('CONNECT method recived: ' + url.hostname + ':' + url.port);

        const proxy : Destination = {
            host: this.scrape.validProxys[0].ip,
            port: this.scrape.validProxys[0].port,
        };
        const dest : Destination = {
            host: url.hostname,
            port: parseInt(url.port),
        };
        const torSocket : net.Socket = await this.tor.connect(proxy);

        const socksHandlerOptions : SocksOptions = {
            tor: torSocket,
            proxy: this.scrape.validProxys[0],
            version: 5,
            destination: <Destination> dest,
        };
        const socksHandler : SocksHandler = new SocksHandler(socksHandlerOptions);
        socksHandler.on('ready', () => {
            console.log('Connect endpoint socket success!');
            clientSocket.pipe(torSocket); // Pipe recived from clientSocket to sock
            torSocket.pipe(clientSocket); // Pipe recived from sock to clientSocket
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node.js-Proxy\r\n' +
            '\r\n');
        });

    };

    private listen() : void {
        this.listening = true;

        const options : https.ServerOptions = {
            key: this.options.key,
            cert: this.options.cert,
            rejectUnauthorized: false, // don't know why, but just in case
        };
        
        this.server = https.createServer(options, this.handler);
        this.server.on('connect', this.connect);
        this.server.listen(this.options.port, 
            this.options.host ?? '127.0.0.1', 
            () => {
                console.log('Https proxy server successfully listening!');
            });
    };
};
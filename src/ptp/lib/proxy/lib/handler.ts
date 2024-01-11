import * as https from "https";
import * as http from "http";
import * as net from "net";
import { ProxyScrape, ProxyList } from "./scrape.js";
import { Proxy } from "./types.js";
import { HttpParser, Request, Headers } from "@lib/http";
import { Destination } from "./types.js";
import { Tor, TorOptions } from "./tor.js";
import { SocksHandler, SocksOptions } from "./socks.js";

export interface Options {
    host : string;
    port : number;
    key: Buffer; // fs.readFileSync("./cert/key.pem")
    cert: Buffer; // fs.readFileSync("./cert/cert.pem")
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
        this.scrape.on("loaded", () => {
            this.scrape.findValidProxys();
        });

        this.scrape.on("found", (proxy : Proxy) => {
            if(!this.listening){
                console.log("Setuping server!");
                this.listen();
            };
            this.proxys.push(proxy);
        });

        this.server = https.createServer({

        }, this.requestHandler);
        console.log("Server is waiting to start...");
        this.findNewProxys();
    };

    private findNewProxys(){
        this.proxys = [];
        this.scrape.getProxys();
    };
    
    private requestHandler = (req : http.IncomingMessage, res : http.ServerResponse) => {
        let body = '';

        req.on('data', (chunk : Buffer) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            let extractor : UrlExtractor = new UrlExtractor(req.url);
            let proto : string = extractor.protocol();
            let dest : UrlDestination = extractor.host();
            if(!dest.port) dest.port = (proto === "http") ? 80 : 443;

            let request : Request = {
                requestLine: {
                    method: req.method,
                    version: "HTTP/" + req.httpVersion,
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
                proxy: this.scrape.validProxys[0],
                version: 5,
                destination: <Destination> dest,
            };

            const socksHandler : SocksHandler = new SocksHandler(socksHandlerOptions);
            socksHandler.on("ready", (sock : net.Socket) => {
                console.log("Socket ready!");
                sock.on("data", (buff : Buffer) => {
                    console.log(buff.toString());
                });
                sock.write(raw);
            });
        });

        res.writeHead(200);
        res.end(`hello world\n`);
    };

    private listen() : void {
        this.listening = true;

        const options : https.ServerOptions = {
            key: this.options.key,
            cert: this.options.cert,
            rejectUnauthorized: false, // don't know why, but just in case
        };
        const server : https.Server = https.createServer(options, this.requestHandler);

        server.listen(this.options.port, 
            this.options.host ?? "127.0.0.1", 
            () => {
                console.log("Https proxy server successfully listening!");
            });
    };
};

interface UrlDestination {
    host : string;
    port? : number;
}

class UrlExtractor {

    public url : string;
    private isProtocolExtracted : boolean = false;

    constructor(url : string){
        this.url = url;
    };

    public protocol() : string {
        if(this.isProtocolExtracted) return "";
        let delimiter : string = "://";
        let index : number = this.url.indexOf(delimiter);
        let proto : string = this.url.slice(0, index);
        this.url = this.url.slice(index + delimiter.length);
        return proto;
    };

    /**
     * To extract the host, first the protocol needs to be extracted
     */
    public host() : UrlDestination {
        if(!this.isProtocolExtracted) this.protocol();
        let index : number = this.url.indexOf("/");
        let foo : string = this.url.slice(0, index);
        this.url = this.url.slice(index);
        index = foo.indexOf(":");
        let dest : UrlDestination = {
            host: "",
        };

        if(index === -1){
            dest.host = foo;
        }else {
            let arr : string[] = foo.split(":");
            dest.host = arr[0];
            dest.port = parseInt(arr[1]);
        };

        return dest;
    };
};
import * as http from 'http';
import * as https from 'https';
import * as tls from 'tls';
import { EventEmitter } from 'events';
import { 
    SocksClient, 
    SocksClientOptions, 
    SocksClientChainOptions 
} from 'socks';
import { 
    HttpHandler, 
    RequestOptions, 
    Response 
} from '@lib/http';
import { SocksClientEstablishedEvent } from 'socks/typings/common/constants.js';
import { Proxy } from './types.js';
import { Log } from '@lib/log/index.js';

export interface ScrapeOptions {
    protocol : string;
    timeout : number;
    country : string;
    ssl : string;
    anonymity : string;
};

export type ProxyList = Proxy[];

/**
 * Example Url: https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all&ssl=yes&anonymity=all
 * Notes:
 *  - When trying a proxy it would be better to save the timeout to in future use the fastest one.
 */
export class ProxyScrape extends EventEmitter {

    /**
     * displayproxies: display the proxies in the browser
     * getproxies: download the proxies
     */
    public readonly request : string = 'displayproxies';
    /**
     * Protocol of the proxies:
     * http, socks4, socks5 or all
     */
    public protocol : string;
    /**
     * The maximum timeout of the proxies in miliseconds.
     */
    public timeout : number;
    /**
     * The country parameter can be any Alpha 2 ISO country code or 'all'. 
     */
    public country : string;
    /**
     * Should the proxies support SSL:
     * all, yes or no
     */
    public ssl : string = '';
    /**
     * Define which anonymity level the proxies should have:
     * elite, anonymous, transparent or all
     */
    public anonymity : string;


    private ProxyMaxTimeout = 6000;
    private MaxQueueProxyTest = 5;
    private url : string = 'https://api.proxyscrape.com/v2/';
    public proxys : ProxyList; 
    public validProxys : ProxyList;

    public constructor(options : Partial<ScrapeOptions> = {}){
        super();
        this.protocol = options.protocol ?? 'socks5';
        this.timeout = options.timeout ?? 10000;
        this.country = options.country ?? 'all';
        this.ssl = options.ssl ?? 'yes';
        this.anonymity = options.anonymity ?? 'all';
        this.generate();
    };

    public generate() : void {
        let query : string = `request=${this.request}&protocol=${this.protocol}&timeout=${this.timeout}` +
        `&country=${this.country}&ssl=${this.ssl}&anonymity=${this.anonymity}`;
        this.url += '?' + query;
    };

    public async getProxys() : Promise<void> {
        this.reset();

        let content : string = await new Promise((resolv, reject) => {
            let req : http.ClientRequest = https.get(this.url, (res : http.IncomingMessage) => {
                let content : string = '';
                res.on('data', (buff : Buffer) => content += buff.toString());
                res.on('end', () => {
                    resolv(content);
                });
            });
            req.end();
        });

        let foo : string[] = content.split('\n');

        for(let str of foo){
            let foo : string[] = str.split(':');
            let proxy : Proxy = {
                ip: foo[0],
                port: parseInt(foo[1])
            };

            this.proxys.push(proxy);
        };

        this.emit('loaded');
    };

    public async findValidProxys() : Promise<void> {
        for(let done = 0; done < this.proxys.length; done += this.MaxQueueProxyTest){
            let len : number = done;
            if(done + this.MaxQueueProxyTest > this.proxys.length) len += (done + this.MaxQueueProxyTest) - this.proxys.length;
            else len += this.MaxQueueProxyTest;

            let proxys : ProxyList = this.proxys.slice(done, len);
            let valid : ProxyList = await this.tryRangeOfProxys(proxys);
            this.validProxys = this.validProxys.concat(valid);

            if(this.validProxys.length > 0){
                Log.log(Log.TMP, "Stopped finding valid proxies!");
                break; 
            };
        };
    };

    private tryRangeOfProxys(proxys : ProxyList) : Promise<ProxyList> {
        let done : number = 0;
        let validProxys : ProxyList = [];

        return new Promise((resolv, reject) => {
            proxys.forEach(proxy => {

                this.tryProxy(proxy, (valid : boolean) => {
                    if(valid){
                        validProxys.push(proxy);
                        this.emit('found', proxy);
                    };
                    
                    if(++done === proxys.length) resolv(validProxys);
                });

            });
        });
    };

    public tryProxy(proxy : Proxy, cb? : (valid : boolean) => void) : Promise<boolean> {
        return new Promise( async (resolv, reject) => {
            let info : SocksClientEstablishedEvent;
            let tlsSocket : tls.TLSSocket;
            
            /**
             * Temporary, this is relly bad, bcs imagine the socks connection
             * takes more than the maxiumum specified timeout, then the timeout
             * wouldn't be executed after the socks connection responds with some
             * error or something. Make a thread and killing it when timeout
             * ends will be a good solution, bcs the new thread will create a 
             * new Agent and a new Execution Thread, making the timeout independent
             * of the await blocking.
             */
            const timeoutId : NodeJS.Timeout = setTimeout(() => {
                if(tlsSocket) tlsSocket.destroy();
                if(info?.socket) info.socket.destroy();
                cb(false);
                resolv(false);
            }, this.ProxyMaxTimeout);
            
            const socksOptions : SocksClientOptions = {
                proxy: {
                  host: proxy.ip,
                  port: proxy.port,
                  type: 5
                },
                command: 'connect',
                destination: {
                  host: 'example.com',
                  port: 443
                }
            };
            try {
                info = await SocksClient.createConnection(socksOptions);
                tlsSocket = tls.connect({ socket: info.socket, rejectUnauthorized: false }, () => {
                    const options : RequestOptions = {
                        method: 'GET',
                        path: '/',
                        headers: {
                            'Host': 'example.com',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
                        },
                    };

                    const handler : HttpHandler = new HttpHandler(tlsSocket);
                    handler.on('end', (info : Response) => {
                        let valid : boolean = info.statusLine.status === 200;
                        cb(valid);
                        resolv(valid);
                        clearTimeout(timeoutId);
                    });
                    handler.request(options);
                });

                tlsSocket.on('error', (err : Error) => {
                    Log.log(Log.ERROR, "Error while connecting to the proxy: " + err.message);
                    throw err;
                });
            } catch(err : any){
                cb(false);
                resolv(false);
            };
        });
    };

    public reset() : void {
        this.proxys = [];
        this.validProxys = [];
    };

};
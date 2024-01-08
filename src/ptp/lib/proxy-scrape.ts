import * as http from "http";
import * as https from "https";
import { EventEmitter } from "events";
import { SocksClient, SocksClientOptions, SocksClientChainOptions } from 'socks';
import * as tls from "tls";
import HttpHandler, { RequestOptions } from "./http-handler.js";

export interface Options {
    protocol : string;
    timeout : number;
    country : string;
    ssl : string;
    anonymity : string;
};

export interface Proxy {
    ip : string;
    port : number;
};

export type ProxyList = Proxy[];

/**
 * Example Url: https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all&ssl=yes&anonymity=all
 * Notes:
 *  - When trying a proxy it would be better to save the timeout to in future use the fastest one.
 */
export default class ProxyScrape extends EventEmitter {

    /**
     * displayproxies: display the proxies in the browser
     * getproxies: download the proxies
     */
    public readonly request : string = "displayproxies";
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
    public ssl : string = "";
    /**
     * Define which anonymity level the proxies should have:
     * elite, anonymous, transparent or all
     */
    public anonymity : string;


    private ProxyMaxTimeout = 4000;
    private MaxQueueProxyTest = 5;
    private url : string = "https://api.proxyscrape.com/v2/";
    public proxys : ProxyList; 
    public validProxys : ProxyList;

    public constructor(options : Partial<Options> = {}){
        super();
        this.protocol = options.protocol ?? "socks5";
        this.timeout = options.timeout ?? 10000;
        this.country = options.country ?? "all";
        this.ssl = options.ssl ?? "yes";
        this.anonymity = options.anonymity ?? "all";
        this.generate();
    };

    public generate() : void {
        let query : string = `request=${this.request}&protocol=${this.protocol}&timeout=${this.timeout}` +
        `&country=${this.country}&ssl=${this.ssl}&anonymity=${this.anonymity}`;
        this.url += "?" + query;
    };

    public async getProxys() : Promise<void> {
        this.reset();

        let content : string = await new Promise((resolv, reject) => {
            console.log(this.url);
            let req : http.ClientRequest = https.get(this.url, (res : http.IncomingMessage) => {
                let content : string = "";
                res.on("data", (buff : Buffer) => content += buff.toString());
                res.on("end", () => {
                    resolv(content);
                });
            });
            req.end();
        });

        let foo : string[] = content.split("\n");

        for(let str of foo){
            let foo : string[] = str.split(":");
            let proxy : Proxy = {
                ip: foo[0],
                port: parseInt(foo[1])
            };

            this.proxys.push(proxy);
        };

        this.emit("loaded");
    };

    public async findValidProxys() : Promise<void> {
        for(let done = 0; done < this.proxys.length;){
            let proxys : ProxyList = this.proxys.slice(done, done += this.MaxQueueProxyTest);
            let valid : ProxyList = await this.tryRangeOfProxys(proxys);
            this.validProxys = this.validProxys.concat(valid);
        };
    };

    private tryRangeOfProxys(proxys : ProxyList) : Promise<ProxyList> {
        let done : number = 0;
        let validProxys : ProxyList = [];
        return new Promise((resolv, reject) => {
            proxys.forEach(proxy => {
                this.tryProxy(proxy, (valid : boolean) => {
                    console.log("Proxy " + done + " tried is " + valid);
                    if(valid){
                        this.emit("found", proxy);
                    };
                    if(++done === proxys.length) resolv(validProxys);
                });
            });
        });
    };

    public tryProxy(proxy : Proxy, cb? : (valid : boolean) => void) : Promise<boolean> {
        return new Promise( async (resolv, reject) => {
            /*let req : http.ClientRequest;
            let timeoutId : NodeJS.Timeout = setTimeout(() => {
                if(req) req.destroy();
            }, this.ProxyMaxTimeout);

            const options : https.RequestOptions = {
                host: proxy.ip, 
                port: proxy.port,
                path: 'https://example.com/',
                method: 'GET',
                rejectUnauthorized: false
            };

            req = https.request(options, (res : http.IncomingMessage) => {
                clearTimeout(timeoutId);
                console.log("Response from proxy " + res.statusCode);

                let valid : boolean = res.statusCode === 200;
                resolv(valid);
                if(cb) cb(valid);
            });

            req.on("error", (err : Error) => {
                console.log(err);
                if(cb) cb(false);
                resolv(false);
            });
            req.end();*/

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
                const info = await SocksClient.createConnection(socksOptions);
                const tlsSocket = tls.connect({ socket: info.socket }, () => {
                    console.log("TLS connection done!");

                    const options : RequestOptions = {
                        method: "GET",
                        path: "http://example.com/",
                        headers: {
                            "Host": "example.com",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
                        },
                    };
                    const handler : HttpHandler = new HttpHandler(tlsSocket);
                    tlsSocket.on("data", (buff) => console.log(buff.toString()));
                    handler.request(options);
                });
                console.log(info.socket);

            } catch (err) {
                // Handle errors
            }

        });
    };

    public reset() : void {
        this.proxys = [];
        this.validProxys = [];
    };

};
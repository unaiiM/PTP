import * as http from "http";
import * as https from "https";
import * as socks from "socks";
import * as net from "net";

interface Options {
    protocol : string;
    timeout : number;
    country : string;
    ssl : string;
    anonymity : string;
};

interface Proxy {
    ip : string;
    port : number;
};

type ProxyList = Proxy[];
type Tor = Proxy;

/**
 * Example Url: https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all
 */
export default class API {

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

    private url : string = "https://api.proxyscrape.com/v2/";
    private proxys : ProxyList = []; 
    private tor : Tor = {
        ip: '127.0.0.1',
        port: 9050
    };

    public constructor(options? : Partial<Options>, tor? : Tor){
        this.protocol = options.protocol ?? "https";
        this.timeout = options.timeout ?? 10000;
        this.country = options.country ?? "all";
        this.ssl = options.ssl ?? "yes";
        this.anonymity = options.anonymity ?? "all";
        if(tor) this.tor = tor;
        this.generate();
    };

    public generate() : void {
        let query : string = `request=${this.request}&protocol=${this.protocol}&timeout=${this.timeout}`
        + `&country=${this.country}&ssl=${this.ssl}&anonymity=${this.anonymity}`;
        this.url + "?" + query;
    };

    public async getProxys() : Promise<void> {
        let content : string = await new Promise((resolv, reject) => {
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
    };

    public async tryProxy(proxy : Proxy) : boolean {
        const options : socks.SocksClientOptions = {
            proxy: {
              host: this.tor.ip,
              port: this.tor.port,
              type: 5 
            },
            command: 'connect',
            destination: {
              host: proxy.ip, 
              port: proxy.port
            }
        };

        try {
            const info = await socks.SocksClient.createConnection(options);          
            const sock : net.Socket = info.socket;

            const options : http.RequestOptions = {
                hostname: 'example.com',
                port: 443,
                path: '/path',
                method: 'GET',
                socket: sock
            };            

        } catch (err) {
            // some error log
            return false;
        };
          
        return true;
    };

};
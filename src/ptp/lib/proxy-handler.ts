import ProxyScrape, { ProxyList, Proxy } from "./proxy-scrape.js";
import * as https from "https";
import * as http from "http";
import * as fs from "fs";

interface Options {
    host : string;
    port : number;
    key: Buffer; // fs.readFileSync("./cert/key.pem")
    cert: Buffer; // fs.readFileSync("./cert/cert.pem")
};

export default class ProxyHandler {
  
    private server : https.Server;
    private proxys : ProxyList = [];
    private scrape : ProxyScrape = new ProxyScrape();

    public constructor(options : Options){
        this.scrape.on("loaded", () => {
            this.scrape.findValidProxys();
        });

        this.scrape.on("found", (proxy : Proxy) => {
            if(!this.server.listening){
                console.log("Server started!");
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

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            console.log(body);
        });
    };
};
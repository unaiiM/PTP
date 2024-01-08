/*import ProxyScrape, { Proxy } from "../ptp/lib/proxy-scrape.js";
import * as https from "http";

const scrape : ProxyScrape = new ProxyScrape();

scrape.on("loaded", async () => { 
    console.log("Proxies loaded!");
    console.log(scrape.proxys);
    const options : https.RequestOptions = {
        host: '106.105.218.244', 
        port: 80,
        path: 'https://example.com/',
        method: 'GET'
    };

    let req = https.request(options, (res) => {
        console.log("Response from proxy " + res.statusCode);
    });

    req.on("error", (err : Error) => {
        console.log(err);
    });

    //scrape.findValidProxys();
});

scrape.on("found", async (proxy : Proxy) => {
    console.log(proxy);
});

scrape.getProxys();

import HttpHandler, { RequestOptions } from "../ptp/lib/http-handler.js";
import * as net from "net";
import { Proxy } from "../ptp/lib/proxy-scrape.js";

const ip : string = "106.105.218.244";
const port : number = 80;

const options : RequestOptions = {
    method: "GET",
    path: "http://example.com/",
    headers: {
        "Host": "example.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    },
};

const sock : net.Socket = net.createConnection({ host: ip, port: port });
const handler : HttpHandler = new HttpHandler(sock);

sock.on("data", (buff) => { console.log(buff.toString())});
sock.on("error", (err : Error) => console.log(err));
sock.on("connect", () => {
    console.log("connected!")
    handler.request(options);
});
sock.on("close", () => console.log("Closed!"));*/

import { SocksClient, SocksClientOptions, SocksClientChainOptions } from 'socks';
import * as tls from "tls";
import HttpHandler, { RequestOptions } from "./../ptp/lib/http-handler.js";

const socksOptions : SocksClientOptions = {
    proxy: {
      host: "98.178.72.21",
      port: 10919,
      type: 5
    },
  
    command: 'connect',
  
    destination: {
      host: 'example.com',
      port: 443
    }
};

try {
    SocksClient.createConnection(socksOptions).then((info) => {
        const tlsSocket = tls.connect({ socket: info.socket, rejectUnauthorized: false }, () => {
            console.log("TLS connection done!");

            const options : RequestOptions = {
                method: "GET",
                path: "/",
                version: "HTTP/1.1",
                headers: {
                    "Host": "example.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
                    "Accept": "*/*",
                },
            };
            const handler : HttpHandler = new HttpHandler(tlsSocket);
            tlsSocket.on("data", (buff) => console.log(buff.toString()));
            handler.request(options);
        });

        tlsSocket.on('secured', (cleartextStream) => {
            const negotiatedProtocol = cleartextStream.alpnProtocol;
            console.log('Negotiated protocol:', negotiatedProtocol);
          
            // Now you can use the 'cleartextStream' for secure communication
            cleartextStream.write('Hello, server!\n');
          });
    });
} catch (err) {
    // Handle errors
}
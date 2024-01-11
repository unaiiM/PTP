import * as net from "net";
import { SocksHandler, ConnectOptions as SocksHandlerConnectOptions, Version } from "./socks.js";
import { Destination } from "./types.js";

export interface TorOptions {
    host : string;
    port : number;
    version? : Version; // socks version
}

export class Tor {
    
    private options : TorOptions;
    
    constructor(options : TorOptions){
        this.options = options;
    };

    public connect(destination : Destination) : Promise<net.Socket> {
        const options : SocksHandlerConnectOptions = {
            proxy: {
                ip: this.options.host,
                port: this.options.port
            },
            version: this.options.version ?? 5,
            destination: destination,
        };
        
        return SocksHandler.connect(options);
    };
};
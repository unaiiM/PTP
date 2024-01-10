import SocksHandler, { ConnectOptions as SocksHandlerConnectOptions, Version } from "./socks-handler.js";
import { Destination } from "./types.js";
import * as net from "net";

export interface Options {
    host : string;
    port : number;
    version? : Version; // socks version
}

export default class Tor {
    
    private options : Options;
    
    constructor(options : Options){
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
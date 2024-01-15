import * as net from 'net';
import { EventEmitter } from 'events';
import { 
    SocksClient, 
    SocksClientOptions, 
    SocksClientChainOptions 
} from 'socks';
import { 
    SocksClientEstablishedEvent, 
    SocksProxyType as _Version 
} from 'socks/typings/common/constants.js';
import { 
    Destination, 
    Proxy, 
    Route 
} from './types.js';

export type Version = _Version;

export interface ConnectOptions {
    proxy : Proxy;
    version : Version;
    destination : Destination;
};

export interface SocksOptions extends Route {
    version: Version
};

export class SocksHandler extends EventEmitter {
    public static connect(options : ConnectOptions, socket? : net.Socket) : Promise<net.Socket> {
        return new Promise(async (resolv, reject) => {

            let socksOptions : SocksClientOptions = {
                proxy: {    
                    host: options.proxy.ip, 
                    port: options.proxy.port,
                    type: options.version,
                },
                command: 'connect',
                destination: {
                    host: options.destination.host,
                    port: options.destination.port
                }
            };

            if(socket) socksOptions.existing_socket = socket;

            try {
                const info : SocksClientEstablishedEvent = await SocksClient.createConnection(socksOptions);
                resolv(info.socket);
            } catch(err){
                reject(err);
            };

        });
    };

    private socket : net.Socket;

    constructor(options : SocksOptions){
        super();
        
        const conn : ConnectOptions = {
            proxy: options.proxy,
            version: options.version,
            destination: options.destination,
        };  

        SocksHandler.connect(conn, options.tor)
            .then((sock : net.Socket) => {
                this.socket = sock;

                this.socket.on('close', () => {
                    if(!options.tor.closed) options.tor.destroy();
                });

                this.socket.on('error', (err : Error) => {
                    throw err;
                });

                this.emit('ready', sock);
            });
    };
};
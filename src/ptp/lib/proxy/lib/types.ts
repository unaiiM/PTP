import * as net from 'net';

export interface Destination {
    host : string;
    port : number;
};

export interface Proxy {
    ip : string;
    port : number;
};

export interface Route {
    tor : net.Socket,
    proxy : Proxy,
    destination : Destination
};
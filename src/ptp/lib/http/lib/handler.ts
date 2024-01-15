import * as tls from 'tls';
import * as net from 'net';
import { EventEmitter } from 'events';
import { 
  HttpParser, 
  Request, 
  Response 
} from './parser.js';
import { Headers } from './types.js';
import { Log } from '@lib/log/index.js';

export interface RequestOptions {
  method : string,
  path : string,
  version? : string,
  headers? : Headers,
  body? : string;
};

export class HttpHandler extends EventEmitter {

    public socket : tls.TLSSocket | net.Socket;
    private parser : HttpParser = new HttpParser();

    constructor(sock : tls.TLSSocket | net.Socket){
      super();

      this.parser.on('end', (struct : Response | Request) =>  {
        this.emit('end', struct);
      });

      this.socket = sock;
      this.socket.on('data', (buff : Buffer) => {
        this.parser.next(buff);
      });
    };

    request(options : RequestOptions) : void {
      let parserOptions : Request = { // maybe simplify that
        requestLine: {
          method: options.method ?? 'GET',
          version: options.version ?? 'HTTP/1.1',
          path: options.path ?? '/',
        },
        headers: options.headers ?? {},
        body: options.body,
      };

      const request : string = HttpParser.build(parserOptions);
      Log.log(Log.TMP, "Request generated: " + JSON.stringify(request));
      this.socket.write(request);
    };
};
import * as tls from "tls";
import * as net from "net";
import { EventEmitter } from "events";
import { HttpParser, Request, Response } from "./parser.js";
import { Headers } from "./types.js";

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

      this.parser.on("end", (struct : Response | Request) =>  {
        this.emit("end", struct);
      });

      this.socket = sock;
      this.socket.on("data", (buff : Buffer) => {
        this.parser.next(buff);
      });
    };

    request(options : RequestOptions) : void {
      let parserOptions : Request = { // maybe simplify that
        requestLine: {
          method: options.method ?? "GET",
          version: options.version ?? "HTTP/1.1",
          path: options.path ?? "/",
        },
        headers: options.headers ?? {},
        body: options.body,
      };
      let req : string = HttpParser.build(parserOptions);
      console.log(JSON.stringify(req));
      this.socket.write(req);
    };
};
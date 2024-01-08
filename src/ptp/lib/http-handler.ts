import * as tls from "tls";
import * as net from "net";
import HttpParser, { Headers as _Headers, Request, Response, RequestLine } from "./http-parser.js";
import { EventEmitter } from "events";

export type Headers = _Headers;

export interface RequestOptions {
  method : string,
  path : string,
  version? : string,
  headers? : Headers,
  body? : string;
};

export default class HttpHandler extends EventEmitter {

    public socket : tls.TLSSocket | net.Socket;
    private parser : HttpParser = new HttpParser();

    constructor(sock : tls.TLSSocket | net.Socket){
      super();

      this.parser.on("end", (res : Response) =>  {
        console.log("End recived!");
        if(HttpParser.isResponse(res)){
          console.log(res.statusLine);
        };
      });

      this.socket = sock;
      this.socket.on("data", (buff : Buffer) => {
        console.log(buff.length);
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
      console.log(req);
      this.socket.write(req);
    };
};
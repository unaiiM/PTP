import * as tls from "tls";
import * as net from "net";
import HttpParser, { Headers, Request, Response, RequestLine } from "./http-parser";
import { EventEmitter } from "events";

class HttpsHandler extends EventEmitter {

    public socket : tls.TLSSocket;
    private parser : HttpParser = new HttpParser();

    constructor(sock : net.Socket){
      super();

      this.parser.on("end", (res : Request | Response) =>  {
        if(HttpParser.isResponse(res)){
          res = res as Response;
                    
        };
      });

      this.socket = new tls.TLSSocket(sock);
      this.socket.on("data", (buff : Buffer) => {
        this.parser.next(buff);
      });
    };

};
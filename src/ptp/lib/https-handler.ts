import * as tls from "tls";
import * as net from "net";
import * as http from "http";
import HttpParser, { Headers, Request, RequestLine } from "./http-parser";

class HttpsHandler {

    public socket : tls.TLSSocket;
    private parser : HttpParser = new HttpParser();

    constructor(sock : net.Socket){
      this.parser.on("end", (res) =>  {

      });

      this.socket = new tls.TLSSocket(sock);
      this.socket.on("data", (buff : Buffer) => {
        this.parser.next(buff);
      });
    };

};
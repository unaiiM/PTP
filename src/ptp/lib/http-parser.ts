import { EventEmitter } from "events";

export interface RequestLine {
    method : string;
    path : string;
    version : string;
};

export interface StatusLine {
    version : string;
    status : number;
    message : string;
};

export type Headers = Record<string, string>;

export interface Request {
    requestLine : RequestLine;
    headers : Headers;
    body? : string;
};

export interface Response {
    statusLine : StatusLine;
    headers : Headers;
    body? : string;
};

/**
 * Notes:
 *  - Headers never can be 0 bcs the Host header is required on http protocol, if is not
 *    specified the server must return 400 response.
 */
export default class HttpParser extends EventEmitter {

    private EndOfHeadersDelimiter = "\r\n\r\n";
    private SampleDelimiter = "\r\n";
    private static EndOfHeadersDelimiter = "\r\n\r\n";
    private static SampleDelimiter = "\r\n";

    private proto : Partial<Request> & Partial<Response> = {};
    private data : string = "";
    private isEndOfHeaders : boolean = false;
    private isBody : boolean = false;
    private contentLength : number = 0;
    private requestLength : number = 0;
    private isEndOfFirstLine : boolean = false;
    private isResponse : boolean = false;

    constructor(){
        super();
    };

    public next(chunk : Buffer | string = "") : void {
        this.data += (chunk instanceof Buffer) ? chunk.toString() : chunk;

        if(this.isEndOfFirstLine){
            if(this.isEndOfHeaders) {
                if(this.isBody){
                    if(this.data.length >= this.requestLength) this.getBody();
                }else this.end();
            }else this.checkHeaders();   
        }else this.checkFirstLine();
    };

    private checkFirstLine() : void {
        let index = this.data.indexOf(this.SampleDelimiter);
        if(index !== -1){

            let line : string[] = this.data.slice(0, index).split(" ");
            this.isResponse = line[0].includes("HTTP"); // true if is response, false if is request

            if(this.isResponse){
                let statusLine : StatusLine = {
                    version: line[0],
                    status: parseInt(line[1]),
                    message: line[2]
                };
                this.proto.statusLine = statusLine;
                this.emit("statusLine", statusLine);
            }else {
                let requestLine : RequestLine = {
                    method: line[0],
                    path: line[1],
                    version: line[2],
                };
                this.proto.requestLine = requestLine;
                this.emit("requestLine", requestLine);
            };

            this.isEndOfFirstLine = true;
            this.next();
        };
    };

    private checkHeaders() : void {

        if(!this.isEndOfHeaders && this.data.indexOf(this.EndOfHeadersDelimiter) !== -1) this.isEndOfHeaders = true;

        if(this.isEndOfHeaders){
            let headers : Headers = this.getHeaders();
            let keys : string[] = Object.keys(headers);
            let index : number = keys.indexOf("content-length"); 

            this.requestLength = this.data.indexOf(this.EndOfHeadersDelimiter) + this.EndOfHeadersDelimiter.length;

            if(index !== -1){
                this.isBody = true;
                this.contentLength = parseInt(headers[keys[index]]);
                this.requestLength += this.contentLength;
            };

            this.proto.headers = headers;
            this.emit("headers", headers);
        };
    };

    private getHeaders() : Headers {
        let headers : Headers = {};  
        let splitedHeaders : string[] = this.data.slice(
            this.data.indexOf(this.SampleDelimiter) + this.SampleDelimiter.length,  // avoid the request line
            this.data.indexOf(this.EndOfHeadersDelimiter))
            .split(this.SampleDelimiter);

        splitedHeaders.forEach((header : string) => {
            let foo : string[] = header.split(":");
            headers[foo[0].toLowerCase()] = foo[1].trim();
        })

        return headers;
    };

    private getBody() : void {
        let body : string = this.data.slice(-this.contentLength);

        this.proto.body = body;
        this.emit("body", body);
        this.end();
    };

    private end() : void {
        this.emit("end", <Request | Response> this.proto);
        this.reset();
    };

    public reset() : void {
        this.data = this.data.slice(this.requestLength, this.data.length);
        this.isEndOfHeaders = false;
    };

    public static build(options : Request) : string {
        let request : string = options.requestLine.method + " " +
            options.requestLine.path + " " +
            options.requestLine.version +
            this.SampleDelimiter;
        let isContentLength : boolean = false;

        const headers : string[] = Object.keys(options.headers);
        for(let i : number = 0; i < headers.length; i++){
            const header : string = headers[i];
            if(header.toLowerCase() === "content-length") isContentLength = true;
            request += header + ": " + options.headers[header];
            if(i + 1 < headers.length) request += this.SampleDelimiter;
        };

        if(options.body && !isContentLength) request += this.SampleDelimiter + "Content-Length: " + options.body.length;
        request += this.EndOfHeadersDelimiter;
        if(options.body) request += options.body;

        return request;
    };

    public static isResponse(struct : Request | Response) : boolean {
        return 'statusLine' in struct;
    };
};
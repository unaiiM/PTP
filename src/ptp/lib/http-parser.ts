import { EventEmitter } from "stream";

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

    private EndOfHeadersDelimiter = "\n\r\n\r";
    private SampleDelimiter = "\n\r";
    private static EndOfHeadersDelimiter = "\n\r\n\r";
    private static SampleDelimiter = "\n\r";

    private proto : Request | Response;
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

    public next(chunk : Buffer | string) : void {
        this.data += (chunk instanceof Buffer) ? chunk.toString() : chunk;

        if(this.isEndOfFirstLine){
            this.checkHeaders();

            if(this.isBody && this.data.length >= this.requestLength) this.getBody();
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

                this.emit("statusLine", statusLine);
            }else {
                let requestLine : RequestLine = {
                    method: line[0],
                    path: line[1],
                    version: line[2]
                };
                
                this.emit("requestLine", requestLine);
            };

            this.isEndOfFirstLine = true;
        };
    };

    private checkHeaders() : void {
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

            this.request.headers = headers;
            this.emit("headers", headers);
        }else {          
            if(this.data.indexOf(this.EndOfHeadersDelimiter) !== -1) this.isEndOfHeaders = true;
            this.checkHeaders();
        };
    };

    private getHeaders() : Headers {
        let headers : Headers = {};  
        let splitedHeaders : string[] = this.data.slice(
            this.data.indexOf(this.SampleDelimiter) + this.SampleDelimiter.length,  // avoid the request line
            this.data.indexOf(this.EndOfHeadersDelimiter))
            .split(this.SampleDelimiter)
            .slice(0, -1);  // every header has \n\r then there will be an empty item, remove it

        splitedHeaders.forEach((header : string) => {
            let foo : string[] = header.split(":");
            headers[foo[0].toLowerCase()] = foo[1].trim();
        })

        return headers;
    };

    private getBody() : void {
        let body : string = this.data.slice(-this.contentLength);

        this.request.body = body;
        this.emit("body", body);
        this.emit("end", this.request as Request);
        this.reset();
    };

    public reset() : void {
        this.data = this.data.slice(this.requestLength, this.data.length);
        this.isEndOfHeaders = false;
    };

    public static build(options : Request) : string {
        let request : string = Object.values(options.requestLine).join(" ") + this.SampleDelimiter;
        let isContentLength : boolean = false;

        for(const header in options.headers){
            if(header.toLowerCase() === "content-length") isContentLength = true;
            request += header + options.headers[header] + this.SampleDelimiter;
        };

        if(options.body && !isContentLength) request += "Content-Length: " + options.body.length + this.SampleDelimiter;
        request += this.EndOfHeadersDelimiter;
        if(options.body) request += options.body;

        return request;
    };
};
export interface UrlDestination {
    host : string;
    port? : number;
}

export class UrlExtractor {

    public url : string;
    private isProtocolExtracted : boolean = false;

    constructor(url : string){
        this.url = url;
    };

    public protocol() : string {
        if(this.isProtocolExtracted) return "";
        let delimiter : string = "://";
        let index : number = this.url.indexOf(delimiter);
        let proto : string = this.url.slice(0, index);
        this.url = this.url.slice(index + delimiter.length);
        return proto;
    };

    /**
     * To extract the host, first the protocol needs to be extracted
     */
    public host() : UrlDestination {
        if(!this.isProtocolExtracted) this.protocol();
        let index : number = this.url.indexOf("/");
        let foo : string = this.url.slice(0, (index === -1) ? this.url.length : index);
        this.url = this.url.slice(index);
        index = foo.indexOf(":");
        let dest : UrlDestination = {
            host: "",
        };

        if(index === -1){
            dest.host = foo;
        }else {
            let arr : string[] = foo.split(":");
            dest.host = arr[0];
            dest.port = parseInt(arr[1]);
        };

        return dest;
    };
};
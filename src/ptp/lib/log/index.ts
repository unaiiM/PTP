import * as fs from "fs";

export class Log {

    public static types : Record<string, string> = {
        INFO: "INFO",
        ERROR: "ERROR",
        OTHER: "OTHER", 
    };

    private file : string;
    private display : boolean;

    constructor(file : string, display : boolean = false){
        this.file = file;
        this.display = display;
    };

    public log();

};
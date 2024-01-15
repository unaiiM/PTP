import * as fs from "fs";

export class Log {

    public static INFO : string = "INFO";
    public static ERROR : string = "ERROR";
    public static STATUS : string = "STATUS";
    public static TMP : string = "TMP"; // temporary log
    public static OTHER : string = "OTHER";

    private static file : string;
    private static display : boolean;

    public static init(file : string, display : boolean = false){
        this.file = file;
        fs.writeFileSync(file, "");
        this.display = display;
    };

    public static log(type : string, msg : string) : void {
        let str : string = `[${type}] ${msg}`;
        if(this.display) console.log(str);
        fs.writeFileSync(this.file, str + "\n");
    };

};
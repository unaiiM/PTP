import * as https from "https";
import * as fs from "fs";

const options = {
key:fs.readFileSync('./cert/key.pem'),
cert:fs.readFileSync('./cert/cert.pem'),
};
console.log(options.key);
https.createServer(options, (req, res) => {
    res.writeHead(200);
    res.end(`hello world\n`);
  }).listen(8000);
import { ProxyHandler, Options } from '@lib/proxy';
import * as fs from 'fs';

const options : Options = {
    host: '0.0.0.0',
    port: 4445,
    key: fs.readFileSync(String.raw`C:\Users\usuario\Documents\Unai\Proj\PTP\cert\key.pem`),
    cert: fs.readFileSync(String.raw`C:\Users\usuario\Documents\Unai\Proj\PTP\cert\cert.pem`),
    tor: {
        host: '172.30.102.119',
        port: 9050,
    },
};

const ph : ProxyHandler = new ProxyHandler(options);

/*import * as https from 'https';
import * as fs from 'fs';

const options : https.ServerOptions = {
    key: fs.readFileSync(String.raw`C:\Users\usuario\Documents\Unai\Proj\PTP\cert\key.pem`),
    cert: fs.readFileSync(String.raw`C:\Users\usuario\Documents\Unai\Proj\PTP\cert\cert.pem`),
    rejectUnauthorized: false, // don't know why, but just in case
};
const server : https.Server = https.createServer(options, (req, res) => {
    console.log(req.httpVersion, req.url, req.headers);  
    res.writeHead(200);
    res.end(`hello world\n`);
});

server.listen(4445, 
    '127.0.0.1', 
    () => {
        console.log('Https proxy server successfully listening!');
    });*/

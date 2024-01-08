import * as net from "net";

const ip = "106.105.218.244";
const port = 80;


const sock = net.createConnection({ host: ip, port: port });

sock.on("error", (err) => console.log(err));
sock.on("connect", () => {
    console.log("connected!")
});
sock.on("close", () => console.log("Closed!"));
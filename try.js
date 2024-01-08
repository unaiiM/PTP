import * as tls from "tls";

/*import { SocksClient } from 'socks';

const socksOptions = {
    proxy: {
      host: "98.178.72.21",
      port: 10919,
      type: 5
    },
  
    command: 'connect',
  
    destination: {
      host: 'example.com',
      port: 443
    }
};

    SocksClient.createConnection(socksOptions).then((info) => {*/
        const tlsSocket = tls.connect({ host: 'example.com', port: 443, rejectUnauthorized: false }, () => {
            console.log("TLS connection done!");
            console.log(tlsSocket.alpnProtocol);

            tlsSocket.on("data", (buff) => console.log(buff.toString()));
	    tlsSocket.write("GET / HTTP/1.1\r\nHost: example.com\r\nUser-Agent: curl\r\n\r\n")
        });
    //});
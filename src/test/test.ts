import ProxyScrape, { Proxy } from "../ptp/lib/proxy-scrape.js";

const scrape : ProxyScrape = new ProxyScrape();

scrape.on("loaded", () => {
    console.log(scrape.proxys);
    scrape.findValidProxys();
});

scrape.on("found", (proxy : Proxy) => {
    console.log("Valid proxy found: ", proxy);
});

scrape.getProxys();
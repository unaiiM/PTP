import ProxyScrape from "../ptp/lib/proxy-scrape.js";

const scrape : ProxyScrape = new ProxyScrape();

scrape.on("loaded", async () => {
    console.log(scrape.proxys)  
    let foo : boolean = await scrape.tryProxy(scrape.proxys[0]);
    console.log(foo);  
});

scrape.getProxys();
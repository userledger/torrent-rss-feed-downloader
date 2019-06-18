const Feed = require('rss-to-json');
const download = require('download-file');
const fs = require('fs');
const storage = require('node-persist');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const RSS_FEED = 'https://example.com/your/rss/feed/';
const RUN_SCRIPT_EVERY_X_MINUTE = 60;
const TORRENTS_PER_DAY = 20;
const TORRENT_DOWNLOAD_LOCATION = "/home/pi/Downloads/torrents/auto";

let options = {
    directory: "./torrents",
};

let checkForDownload = (_file)=>{
    return new Promise(async (resolve, reject)=>{
        let date = new Date().toString().slice(0,10);
        let todayAdded = await storage.getItem(date);
        if(typeof todayAdded === "undefined")
            todayAdded=0;
        if(todayAdded<TORRENTS_PER_DAY){
            try{
                 const { stdout, stderr } = await exec(
                     `deluge-console "add -p ${TORRENT_DOWNLOAD_LOCATION} '${_file}'"`
                 );
                console.info(stdout);
            }catch (e) {
                console.info("rejected");
            }
            todayAdded++;
            await storage.setItem(date,todayAdded);
        }
        resolve();
    })
};

let torrentFileDownloader = (fileLocation,_link)=>{
    return new Promise(function(resolve, reject) {
        if (!fs.existsSync(fileLocation)) {
            console.info("DOWNLOAD torrent file:",fileLocation)
            download(_link, options, function(err){
                if (err) throw err;
                resolve();
            })
        }
    });
};

let initialize = async ()=>{
    await storage.init({
        dir: './storage/',
        stringify: JSON.stringify,
        parse: JSON.parse,
        encoding: 'utf8',
        logging: false,
        ttl: false,
        expiredInterval: 10 * 60 * 1000,
        forgiveParseErrors: false
    });

};

let readRssFeed = ()=>{
    console.info(`Reading feed: ${RSS_FEED}`);
    Feed.load(RSS_FEED, async function(err, rss){
        for(let i=0;i<rss.items.length;i++){
            let _link = rss.items[i].link;
            let filename = rss.items[i].title+".torrent";
            options = {...options,...{filename}};
            let fileLocation = `${options.directory}/${filename}`;
            await torrentFileDownloader(fileLocation,_link);
            await checkForDownload(fileLocation);
        }
    });
};

initialize().then(()=>{
    readRssFeed();
});

setInterval(readRssFeed,1000*60*RUN_SCRIPT_EVERY_X_MINUTE);






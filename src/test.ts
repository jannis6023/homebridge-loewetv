import LoeweAPI from "./LoeweAPI";

const loewe = new LoeweAPI("http://10.1.1.119:905");
loewe.connect()
    .then(async () => {
        const lists = await loewe.getChannelLists();
        loewe.getChannels(lists[1])
            .then(r => {
                console.log(r[0].locator);
            });
    });
import axios from "axios";
import * as xml2js from "xml2js";

interface ChannelList{
    View: string;
    Name: string;
    TotalResults: string;
}

interface Channel{
    mediaItemUuid: string;
    shortInfo: string;
    locator: string;
    caption: string;
}

export default class LoeweAPI{
    private host: string;
    private clientId = "?";
    private fcId: number;

    constructor(host) {
        this.host = host;
        this.fcId = this.getFCID();
    }

    connect(){
        this.fcId = this.getFCID();
        return this.request("RequestAccess", `<DeviceType>HomeBridge</DeviceType><DeviceName>HomeBridgePlugin</DeviceName><DeviceUUID>${this.getMacAddress()}</DeviceUUID><RequesterName>HomeBridge API</RequesterName>`)
            .then(r => {
                this.clientId = r.RequestAccessResponse.ClientId;
                console.log("Successfully authenticated with CID " + r.RequestAccessResponse.ClientId + " and FCID " + this.fcId);
                return true;
            })
            .catch(() => false);
    }

    getChannelLists(){
        return this.request("GetListOfChannelLists", "<QueryParameters> <Range startIndex=\"0\" maxItems=\"100\"/><MediaItemInformation>true</MediaItemInformation><MediaItemClass></MediaItemClass></QueryParameters>")
            .then(r => r.GetListOfChannelListsResponse.ResultItemChannelLists.ResultItemChannelList as ChannelList[]);
    }

    getChannels(list: ChannelList){
        return this.request("GetChannelList", "<ChannelListView>" + list.View + "</ChannelListView> <QueryParameters> <Range startIndex=\"0\" maxItems=\"50\"/> <MediaItemInformation>true</MediaItemInformation> <MediaItemClass></MediaItemClass> </QueryParameters>")
            .then(r => r.GetChannelListResponse.ResultItemFragment.ResultItemReference.map(re => re.$) as Channel[]);
    }

    tvOn(){
        return this.injectRCKey("22");
    }

    tvOff(){
        return this.injectRCKey("25");
    }

    injectRCKey(id: string){
        return this.request("InjectRCKey", `<InputEventSequence> <RCKeyEvent alphabet="l2700" mode="press" value="${id}"/> <RCKeyEvent alphabet="l2700" mode="release" value="${id}"/> </InputEventSequence>`);
    }

    private request(soapAction, xmlString){
        const xml = `<?xml version="1.0"?><env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ltv="urn:loewe.de:RemoteTV:Tablet"><env:Header/><env:Body><ltv:${soapAction}><fcid>${this.fcId}</fcid><ClientId>${this.clientId}</ClientId>${xmlString}</ltv:${soapAction}></env:Body></env:Envelope>`;
        return axios.post(this.host + "/loewe_tablet_0001", xml, {
            headers: {
                "SOAPACTION": soapAction,
                "Content-Type": "application/xml",
            },
        })
            .then(r => {
                const options = {
                    tagNameProcessors: [xml2js.processors.stripPrefix],
                    explicitArray: false,
                };
                return xml2js.parseStringPromise(r.data, options)
                    .then(decoded => decoded.Envelope.Body);
            });
    }

    private getFCID() {
        const min = Math.ceil(10);
        const max = Math.floor(99);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    private getMacAddress(){
        return "XX:XX:XX:XX:XX:XX".replace(/X/g, () => {
            return "0123456789ABCDEF".charAt(Math.floor(Math.random() * 16));
        });
    }

}
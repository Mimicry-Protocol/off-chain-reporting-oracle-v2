import { BigNumber } from "ethers";
import { Chain, Currency, Metric } from "../../../enums";
import { NftCollectionInfo, ThrottleConfig } from "../../../types";
import { NftCollectionDataProvider } from "../NftCollectionDataProvider";
import { RestfulProvider } from "../../RestfulProvider";
import ky from "ky";

export class NftGo extends RestfulProvider implements NftCollectionDataProvider {
    
    constructor(apiKey: string) {
        const apiHost = 'https://data-api.nftgo.io';
        super(apiKey, apiHost);
    }

    getThrottleConfig(): ThrottleConfig {
        return {
            limit: 2,
            interval: 1000
        }
    }

    async getMarketCap(data: NftCollectionInfo): Promise<BigNumber> {
        data.metric = Metric.MARKET_CAP;
        return this.getMarketData(data);
    }

    async getMarketData(data: NftCollectionInfo): Promise<BigNumber> {
        const { 
            address, 
            currency,
            metric,
            chain,
        } = data;
    
        if (chain !== Chain.ETHEREUM) {
            throw new Error(`Chain (${chain}) not supported by NFTGo`);
        }
        const _chain = 'eth';
        
        const url = this.config.host
            + '/' + _chain
            + '/v1'
            + '/collection'
            + '/' + address
            + '/metrics';
    
        let collection: any;
        try {
            console.log(`Fetching ${url}`)
            collection = await ky.create({
                headers: {
                    'X-API-KEY': this.config.key
                }
            }).get(url, { timeout: 5_000, retry: 0 }).json();
        } catch (err) {
            throw new Error(this.constructor.name + ": " + err);
        }
    
        let returnValue = 0;
    
        if (metric === Metric.MARKET_CAP) {
            if (currency === Currency.USD) {
                returnValue = collection.market_cap_usd;
            } else if (currency === Currency.ETH) {
                returnValue = collection.market_cap_eth;
            }
        } else {
            throw new Error(`Metric (${metric}) not supported by NFTGo`);
        }
        
        return BigNumber.from(Math.round(returnValue));
    }
}

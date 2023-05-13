import { BigNumber } from "ethers";
import { NftCollectionInfo } from "../../../types";
import { Currency, Metric } from "../../../enums";
import { NftCollectionDataProvider } from "../NftCollectionDataProvider";
import { RestfulProvider } from "../../RestfulProvider";
import ky from "ky";

export class Center extends RestfulProvider implements NftCollectionDataProvider {
    
    constructor(apiKey: string) {
        const apiHost = 'https://api.center.dev/v1';
        super(apiKey, apiHost);
    }
    
    async getMarketCap(data: NftCollectionInfo): Promise<BigNumber> {
        data.metric = Metric.MARKET_CAP;
        return this.getMarketData(data);
    }

    async getMarketData(data: NftCollectionInfo): Promise<BigNumber> {
        const { 
            address, 
            chain,
            metric,
            currency,   // Center only supports 'eth' for now
        } = data;
    
        if (currency !== Currency.ETH) {
            throw new Error(`Currency (${currency}) not supported by Center`);
        }

        let _metric: string = metric;
        if (metric === Metric.MARKET_CAP) {
            _metric = 'market-cap';
        }

        const url = this.config.host
            + '/' + chain
            + '/' + address
            + '/market-data'
            + '/' + _metric;
    
        let collection: any;
        try {
            collection = await ky.create({
                headers: {
                    'X-API-Key': this.config.key
                }
            }).get(url, { timeout: 5_000, retry: 0 }).json();
        } catch (err) {
            throw new Error(this.constructor.name + ": " + err);
        }
        const returnValue = collection.amount.wholeAmount;
        return BigNumber.from(Math.round(returnValue));
    }
}

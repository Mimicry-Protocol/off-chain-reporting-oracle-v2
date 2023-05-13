import { BigNumber } from "ethers";
import { TokenInfo } from "../../../types";
import { Chain, Currency } from "../../../enums";
import { TokenDataProvider } from "../TokenDataProvider";
import { RestfulProvider } from "../../RestfulProvider";
import ky from "ky";

export class CoinGecko extends RestfulProvider implements TokenDataProvider {
    
    constructor(apiKey: string) {
        const apiHost = 'https://api.coingecko.com/api/v3';
        super(apiKey, apiHost);
    }
    
    async getMarketCap(data: TokenInfo): Promise<BigNumber> {
        return this.getMarketData(data);
    }

    async getMarketData(data: TokenInfo): Promise<BigNumber> {
        const { 
            address, 
            chain,
            currency,
        } = data;
    
        let _chain = '';
        
        if (chain === Chain.ETHEREUM) {
            _chain = 'ethereum';
        } else if (chain === Chain.POLYGON) {
            _chain = 'polygon-pos';
        } else if (chain === Chain.SOLANA) {
            _chain = 'solana';
        } else {
            throw new Error(`Chain (${chain}) not supported by CoinGecko`);
        }

        const url = this.config.host
            + '/simple'
            + '/token_price'
            + '/' + _chain
            + '?'
            + new URLSearchParams({
                contract_addresses: address,
                vs_currencies: currency,
                include_market_cap: 'true',
                include_24hr_vol: 'false',
                include_24hr_change: 'false',
                include_last_updated_at: 'false'
            });

        let token;
        try {
            token = await ky.create({
                headers: {
                    'x-cg-pro-api-key': this.config.key
                }
            }).get(url, { timeout: 5_000, retry: 0 }).json();
        } catch (err) {
            throw new Error(err);
        }

        let returnValue;
        for (const tok in token) {
            if (currency === Currency.USD) {
                returnValue = token[tok].usd_market_cap;
            } else if (currency === Currency.ETH) {
                returnValue = token[tok].eth_market_cap;
            } else {
                throw new Error(`Currency (${currency}) not supported by CoinGecko`);
            }
        }

        return BigNumber.from(Math.round(returnValue));
    }
}
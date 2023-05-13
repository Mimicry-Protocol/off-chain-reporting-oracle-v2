import { BigNumber } from "ethers";
import { 
    TokenInfo, 
    ThrottleConfig
} from "../../types";

export abstract class TokenDataProvider  {
    abstract getMarketCap(data: TokenInfo): Promise<BigNumber>;
    abstract getThrottleConfig(): ThrottleConfig;
}
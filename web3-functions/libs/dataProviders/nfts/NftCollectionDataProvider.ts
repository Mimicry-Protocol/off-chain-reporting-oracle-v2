import { BigNumber } from "ethers";
import { 
    NftCollectionInfo,
    ThrottleConfig
} from "../../types";

export abstract class NftCollectionDataProvider  {
    abstract getMarketCap(data: NftCollectionInfo): Promise<BigNumber>;
    abstract getThrottleConfig(): ThrottleConfig;
}
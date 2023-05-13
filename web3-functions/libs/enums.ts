/**
 * All enums are case-sensitive
 */

export enum Chain {
    ETHEREUM = 'ethereum-mainnet',
    POLYGON = 'polygon-mainnet',
    MUMBAI = 'polygon-mumbai',
    SOLANA = 'solana-mainnet',
}

// Must match methods in src/web3-functions/libs/consensusFilters.ts
export enum ConsensusFilter {
    NONE = "none",          // No filter
    MAD = "mad",            // Mean Absolute Deviation of all provider values
    MAJORITY = "majority",  // Majority of all provider values
}

// Must match methods in src/web3-functions/libs/consensusMethods.ts
export enum ConsensusMethod {
    MEDIAN = "median",      // Median of all provider values
    MEAN = "mean",          // Average of all provider values
    RANDOM = "random",      // Pick a random provider values
}

export enum Currency {
    ETH = "eth",
    USD = "usd",
}

export enum Metric {
    MARKET_CAP = "MarketCap",
    // FLOOR_PRICE = "floor-price",
}

export enum OpenMarketsOracleAddress {
    MUMBAI = "0x1C60320EF9aeD1ad1edf25afD82596167832F557", // Mumbai OMO
    POLYGON = "0x454F9C0ab3119f8B9209B52A3f0191268e2b8812", // Polygon OMO
}

export enum Provider {
    NFTGO = "NftGo",
    CENTER = "Center",
    COINGECKO = "CoinGecko",
}
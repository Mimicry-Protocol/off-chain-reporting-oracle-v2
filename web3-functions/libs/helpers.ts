import {
  ConsensusMechanism,
  ContractPointer,
  NftCollectionInfo,
  TokenInfo,
} from "./types";
import {
  Chain,
  ConsensusFilter,
  ConsensusMethod,
  Currency,
  Metric,
  Provider,
} from "./enums";
import * as ConsensusFilters from "./consensusFilters";
import * as ConsensusMethods from "./consensusMethods";
import { NftGo } from "./dataProviders/nfts/workers/NftGo";
import { Center } from "./dataProviders/nfts/workers/Center";
import { CoinGecko } from "./dataProviders/tokens/workers/CoinGecko";
import { BigNumber, ethers } from "ethers";
import pThrottle from "p-throttle";

export function unwrapContractPointers(
  contractsList: string[]
): Array<ContractPointer> {
  const pointers: ContractPointer[] = [];

  // If the contractsList is empty, or if it has one item
  // as an empty string, return an empty array.
  if (
    contractsList.length === 0 ||
    (contractsList.length === 1 && contractsList[0] === "")
  ) {
    return pointers;
  }

  for (const contract of contractsList) {
    const parts = contract.split(":");
    const pointer: ContractPointer = {
      chain: parts[0] as Chain,
      address: parts[1],
    };
    if (!pointer.chain || !pointer.address) {
      throw new Error(`Invalid contract pointer: ${JSON.stringify(pointer)}`);
    }

    pointers.push(pointer);
  }

  return pointers;
}

/**
 * Unwrap a consensus filter and method from a string that
 * is in the format "filter:method" (e.g. "mad:mean").
 *
 * Only accept valid filters and methods.
 *
 * @param consensusMechanismString
 * @returns ConsensusMechanism
 */
export function unwrapConsensusMechanism(
  consensusMechanismString: string
): ConsensusMechanism {
  const parts = consensusMechanismString.split(":");
  const filter = parts[0] as ConsensusFilter;
  const method = parts[1] as ConsensusMethod;

  if (!Object.values(ConsensusFilter).includes(filter)) {
    throw new Error(`Invalid consensus filter: ${filter}`);
  }
  if (!Object.values(ConsensusMethod).includes(method)) {
    throw new Error(`Invalid consensus method: ${method}`);
  }

  return {
    filter,
    method,
  };
}

export async function nftCollectionRunner(
  provider: Provider,
  apiKey: string,
  nftCollections: ContractPointer[],
  currency: Currency,
  metric: Metric
): Promise<BigNumber> {
  let providerClass: any;
  if (provider === Provider.NFTGO) {
    providerClass = new NftGo(apiKey);
  } else if (provider === Provider.CENTER) {
    providerClass = new Center(apiKey);
  } else {
    throw new Error(`Provider ${provider} not supported`);
  }

  let providerFunction = "";
  if (metric === Metric.MARKET_CAP) {
    providerFunction = "getMarketCap";
  } else {
    throw new Error(`Metric ${metric} not supported by nft collections`);
  }

  // If nftCollections is empty, return 0
  if (nftCollections.length === 0) {
    return BigNumber.from(0);
  }

  const throttle = pThrottle(providerClass.getThrottleConfig());
  const promises: Promise<BigNumber>[] = nftCollections.map(
    throttle(async (nftCollection: any) => {
      const { chain, address } = nftCollection;
      const nftCollectionInfo: NftCollectionInfo = {
        address,
        chain,
        currency,
        metric,
      };
      return await providerClass[providerFunction](nftCollectionInfo);
    })
  );
  const values = await Promise.all(promises);
  const value = values.reduce((a, b) => a.add(b));
  console.log(`${provider} ${currency} ${metric}: ${value}`);

  return value;
}

export async function tokenRunner(
  provider: Provider,
  apiKey: string,
  tokens: ContractPointer[],
  currency: Currency
): Promise<BigNumber> {
  let providerClass: any;
  if (provider === Provider.COINGECKO) {
    providerClass = new CoinGecko(apiKey);
  } else {
    throw new Error(`Provider ${provider} not supported`);
  }

  // If tokens is empty, return 0
  if (tokens.length === 0) {
    return BigNumber.from(0);
  }

  const throttle = pThrottle(providerClass.getThrottleConfig());
  const promises: Promise<BigNumber>[] = tokens.map(
    throttle(async (token: any) => {
      const { chain, address } = token;
      const tokenInfo: TokenInfo = { address, chain, currency };
      return await providerClass.getMarketCap(tokenInfo);
    })
  );
  const values = await Promise.all(promises);
  const value = values.reduce((a, b) => a.add(b));
  console.log(`${provider} ${currency}: ${value}`);

  return value;
}

/**
 * Return the consensus value of a list of BigNumber values
 * using the given consensus mechanism.
 *
 * Only accept valid consensus mechanisms.
 *
 * First filter the list of values using the given filter.
 * Then apply the given method to the filtered list.
 *
 * @param values A list of BigNumber values
 * @param consensusMechanism
 * @returns BigNumber
 */
export function reachConsensus(
  values: Array<BigNumber>,
  consensusMechanism: ConsensusMechanism
): BigNumber {
  const { filter, method } = consensusMechanism;
  if (!Object.values(ConsensusFilter).includes(filter)) {
    throw new Error(`Invalid consensus filter: ${filter}`);
  }
  if (!Object.values(ConsensusMethod).includes(method)) {
    throw new Error(`Invalid consensus method: ${method}`);
  }

  values = ConsensusFilters[filter](values);
  return ConsensusMethods[method](values);
}

/**
 * Return ABI Encoded schema params
 * @param userArgs A data object
 * @returns string
 */
export function getAbiEncodedParams(userArgs: any): string {
  const abiCoder = ethers.utils.defaultAbiCoder;
  const encodedData = abiCoder.encode(["string"], [JSON.stringify(userArgs)]);
  return encodedData;
}

/**
 * Return Keccak256 hash of a string
 * @param str A string
 * @returns string
 * @see https://docs.ethers.io/v5/api/utils/hashing/#utils-keccak256
 */
export function getKeccak256Hash(str: string): string {
  return ethers.utils.keccak256(str);
}

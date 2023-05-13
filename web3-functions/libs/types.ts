import {
  ConsensusFilter,
  ConsensusMethod,
  Chain,
  Currency,
  Metric,
} from "./enums";

export interface ApiConfig {
  key: string;
  host: string;
}

export interface ContractPointer {
  chain: Chain;
  address: string;
}

export interface ConsensusMechanism {
  filter: ConsensusFilter;
  method: ConsensusMethod;
}

export interface NftCollectionInfo {
  chain: Chain;
  address: string;
  currency: Currency;
  metric: Metric;
}

export interface TokenInfo {
  chain: Chain;
  address: string;
  currency: Currency;
}

export interface ThrottleConfig {
  limit: number; // number of requests allowed per interval
  interval: number; // in milliseconds
}

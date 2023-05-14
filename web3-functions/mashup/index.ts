/**
 * Mimicry Mashup
 *
 * This function takes the market capitalization of a set of NFT projects
 * and/or tokens and writes them on-chain as a single value.
 */
export const version = "2.1.0";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber } from "ethers";
import {
  ConsensusFilter,
  ConsensusMethod,
  Currency,
  Metric,
  OpenMarketsOracleAddress,
  Provider,
} from "../libs/enums";
import { ConsensusMechanism, ContractPointer } from "../libs/types";
import {
  unwrapConsensusMechanism,
  unwrapContractPointers,
  nftCollectionRunner,
  tokenRunner,
  reachConsensus,
  getRulesHash,
  isDeviationThresholdReached,
  isHeartbeatThresholdReached,
} from "../libs/helpers";
import { OpenMarketsOracle__factory } from "../../typechain";


Web3Function.onRun(async (context: Web3FunctionContext) => {
  try {
    const { userArgs, gelatoArgs, multiChainProvider } = context;
    console.log("Mimicry Mashup v" + version);
    // console.log(userArgs);

    // STEP 1. SETUP THE ORACLE
    // @dev: We currently only support Polygon
    const provider = multiChainProvider.chainId(137);
    const oracle = OpenMarketsOracle__factory.connect(
      OpenMarketsOracleAddress.POLYGON,
      provider
    );
    const nickname = (userArgs.nickname as string) ?? "";
    if (nickname === "") throw new Error("A nickname must be provided");

    // STEP 2. CONFIGURE THE ORACLE
    const deviation = (userArgs.deviation as number) ?? 50; // 0.50% deviation
    const heartbeat = (userArgs.heartbeat as number) ?? 3600; // 1 hour heartbeat
    const providers = (userArgs.providers as Array<string>) ?? [];
    if (providers.length === 0)
      throw new Error(
        "An array of one or more providers must be provided" +
          " in the form of an array of strings" +
          ' (e.g. "NftGo")'
      );
    const consensusMechanismString =
      (userArgs.consensusMechanism as string) ??
      ConsensusFilter.MAD + ":" + ConsensusMethod.MEAN;
    const consensusMechanism: ConsensusMechanism = unwrapConsensusMechanism(
      consensusMechanismString
    );
    const currency = (userArgs.currency as Currency) ?? Currency.USD; // usd as default currency
    const metric = (userArgs.metric as Metric) ?? Metric.MARKET_CAP; // MarketCap as default metric

    // STEP 3. UNWRAP NFT COLLECTIONS AND TOKENS
    let nftCollections: Array<ContractPointer> = [];
    const nftCollectionsList = (userArgs.nftCollections as string[]) ?? [];
    nftCollections = unwrapContractPointers(nftCollectionsList);
    let tokens: Array<ContractPointer> = [];
    const tokensList = (userArgs.tokens as string[]) ?? [];
    tokens = unwrapContractPointers(tokensList);
    if (nftCollections.length === 0 && tokens.length === 0) {
      throw new Error(
        "An array of one or more NFT collections and/or tokens" +
          " must be provided" +
          " in the form of an array of contract pointers" +
          ' (e.g. "ethereum-mainnet:0x1234...")'
      );
    }
    console.log("All checks passed!");


    // STEP 4. CREATE A DATA FEED IF ONE DOESN'T EXIST ALREADY
    let dataFeedInfo: any;
    const hashArgs = { ...userArgs };
    delete hashArgs.nickname;
    const rulesHash = getRulesHash(hashArgs);
    const authorizedSender = await context.secrets.get("AUTHORIZED_SENDER");
    if (!authorizedSender) throw new Error("AUTHORIZED_SENDER not set in secrets");
    try {
      dataFeedInfo = await oracle["getDataFeedInfoByHash(bytes32,address)"](rulesHash, authorizedSender);
    } catch (error: any) {
      // If the data feed doesn't exist, create it
      console.log("Creating new data feed...");
      return {
        canExec: true,
        callData: [
          {
            to: OpenMarketsOracleAddress.POLYGON,
            data: oracle.interface.encodeFunctionData("createDataFeed", [
              nickname + ": (" + JSON.stringify(hashArgs) + ")",
              rulesHash,
            ]),
          },
        ],
      };
    }

    // STEP 5. GET DATA FROM PROVIDERS
    const nftProviderValues: Array<BigNumber> = [];
    const tokenProviderValues: Array<BigNumber> = [];
    for (const provider of providers) {
      switch (provider) {
        case Provider.NFTGO: {
          const apiKey = await context.secrets.get("NFTGO_API_KEY");
          if (!apiKey) throw new Error("NFTGO_API_KEY not set in secrets");

          const newValue = await nftCollectionRunner(
            Provider.NFTGO,
            apiKey,
            nftCollections,
            currency,
            metric
          );
          nftProviderValues.push(newValue);
          break;
        }
        case Provider.CENTER: {
          const apiKey = await context.secrets.get("CENTER_API_KEY");
          if (!apiKey) throw new Error("CENTER_API_KEY not set in secrets");

          const newValue = await nftCollectionRunner(
            Provider.CENTER,
            apiKey,
            nftCollections,
            currency,
            metric
          );
          nftProviderValues.push(newValue);
          break;
        }
        case Provider.COINGECKO: {
          const apiKey = await context.secrets.get("COINGECKO_API_KEY");
          if (!apiKey) throw new Error("COINGECKO_API_KEY not set in secrets");

          const newValue = await tokenRunner(
            Provider.COINGECKO,
            apiKey,
            tokens,
            currency
          );
          tokenProviderValues.push(newValue);
          break;
        }
        default: {
          throw new Error(`Provider ${provider} not supported`);
        }
      }
    }

    // STEP 6. CALCULATE THE CONSENSUS VALUE
    const newValue: BigNumber = reachConsensus(
      nftProviderValues,
      consensusMechanism
    ).add(reachConsensus(tokenProviderValues, consensusMechanism));
    console.log(`New value: ${newValue}`);

    // STEP 7. CHECK FOR SUFFICIENT DEVIATION AND/OR TIMESTAMP
    const latestOracleValue: BigNumber = dataFeedInfo.latestValue.value;
    const latestUpdateTimestamp: BigNumber = dataFeedInfo.latestValue.timestamp;
    console.log(`Latest value in the oracle: ${latestOracleValue}`);

    // Exit if the values are the same
    if (newValue.eq(latestOracleValue)) {
      return { canExec: false, message: `The oracle value has not changed` };
    }

    if (latestOracleValue.gt(0)) {
      // Is value difference less than the deviation percentage?
      // and was the last update time less than the number of seconds per heartbeat?
      const block = await provider.getBlock("latest");
      const heartbeatTest = isHeartbeatThresholdReached(
        BigNumber.from(block.timestamp),
        latestUpdateTimestamp,
        heartbeat
      );
      const deviationTest = isDeviationThresholdReached(
        newValue,
        latestOracleValue,
        deviation
      );
      if (!heartbeatTest && !deviationTest) {
        return {
          canExec: false,
          message: `Heartbeat and deviation thresholds not reached`,
        };
      }
    }
    console.log(`Updating destination oracle value to: ${newValue}`);

    // STEP 8. UPDATE THE DESTINATION ORACLES WITH THE NEW VALUE
    return {
      canExec: true,
      callData: [
        {
          to: OpenMarketsOracleAddress.POLYGON,
          data: oracle.interface.encodeFunctionData("updateValue", [
            dataFeedInfo.id,
            newValue,
          ]),
        },
      ],
    };
  } catch (err: any) {
    return { canExec: false, message: err.message };
  }
});

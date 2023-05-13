/**
 * Mimicry Mashup v2.0.0
 * 
 * This function takes the market capitalization of a set of NFT projects
 * and/or tokens and writes them on-chain to a single oracle.
 */
export const version = "2.0.0";
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
import { 
    ConsensusMechanism, 
    ContractPointer 
} from "../libs/types";
import { 
    unwrapConsensusMechanism,
    unwrapContractPointers,
    nftCollectionRunner,
    tokenRunner,
    reachConsensus
} from "../libs/helpers";
import { OpenMarketsOracle__factory } from "../../typechain-types";

Web3Function.onRun(async (context: Web3FunctionContext) => {
    try {
        const { userArgs, multiChainProvider } = context;
        console.log("Mimicry Mashup v" + version);
        // console.log(userArgs);


        // STEP 1. SETUP THE ORACLE
        // @dev: We currently only support Polygon and Mumbai
        const polygonProvider = multiChainProvider.chainId(137);
        const sourceOfTruthOracle = OpenMarketsOracle__factory.connect(
            OpenMarketsOracleAddress.POLYGON,
            polygonProvider
        );
        const mumbaiDataFeedId = (userArgs.mumbaiDataFeedId as number) ?? 0;
        const polygonDataFeedId = (userArgs.polygonDataFeedId as number) ?? 0;
        if (mumbaiDataFeedId === 0
            || polygonDataFeedId === 0) throw new Error(
            'dataFeedIds must be provided' 
            + ' in the form of numbers greater than zero'
        );


        // STEP 2. CONFIGURE THE ORACLE
        const deviation = (userArgs.deviation as number) ?? 25;   // 0.25% deviation
        const heartbeat = (userArgs.heartbeat as number) ?? 3600; // 1 hour heartbeat
        const providers = (userArgs.providers as Array<string>) ?? [];
        if (providers.length === 0) throw new Error(
            'An array of one or more providers must be provided'
            + ' in the form of an array of strings'
            + ' (e.g. "nftgo")'
        );
        const consensusMechanismString = (userArgs.consensusMechanism as string)
            ?? ConsensusFilter.MAD + ":" + ConsensusMethod.MEAN;
        const consensusMechanism: ConsensusMechanism = unwrapConsensusMechanism(
            consensusMechanismString
        );
        const currency = (userArgs.currency as Currency) ?? Currency.USD;   // usd as default currency
        const metric = (userArgs.metric as Metric) ?? Metric.MARKET_CAP;    // MarketCap as default metric


        // STEP 3. UNWRAP NFT COLLECTIONS AND TOKENS
        let nftCollections: Array<ContractPointer> = [];
        const nftCollectionsList = (userArgs.nftCollections as string[]) ?? [];
        nftCollections = unwrapContractPointers(nftCollectionsList);
        let tokens: Array<ContractPointer> = [];
        const tokensList = (userArgs.tokens as string[]) ?? [];
        tokens = unwrapContractPointers(tokensList);
        if (nftCollections.length === 0
            && tokens.length === 0) throw new Error(
            'An array of one or more NFT collections and/or tokens'
            + ' must be provided'
            + ' in the form of an array of contract pointers'
            + ' (e.g. "ethereum-mainnet:0x1234...")'
        );


        // STEP 4. GET DATA FROM PROVIDERS
        const nftProviderValues: Array<BigNumber> = [];
        const tokenProviderValues: Array<BigNumber> = [];
        for (const provider of providers) {
            switch (provider) {
                case Provider.NFTGO: {
                    const apiKey = await context.secrets.get("NFTGO_API_KEY");
                    if (!apiKey) throw new Error('NFTGO_API_KEY not set in secrets');

                    const newValue = await nftCollectionRunner(
                        Provider.NFTGO,
                        apiKey, 
                        nftCollections, 
                        currency, 
                        metric);
                    nftProviderValues.push(newValue);
                    break;
                }
                case Provider.CENTER: {
                    const apiKey = await context.secrets.get("CENTER_API_KEY");
                    if (!apiKey) throw new Error('CENTER_API_KEY not set in secrets');

                    const newValue = await nftCollectionRunner(
                        Provider.CENTER,
                        apiKey, 
                        nftCollections, 
                        currency, 
                        metric);
                    nftProviderValues.push(newValue);
                    break;
                }
                case Provider.COINGECKO: {
                    const apiKey = await context.secrets.get("COINGECKO_API_KEY");
                    if (!apiKey) throw new Error('COINGECKO_API_KEY not set in secrets');

                    const newValue = await tokenRunner(
                        Provider.COINGECKO,
                        apiKey, 
                        tokens, 
                        currency);
                    tokenProviderValues.push(newValue);
                    break;
                }
                default: {
                    throw new Error(`Provider ${provider} not supported`);
                }
            }
        }


        // SETP 5. CALCULATE THE CONSENSUS VALUE
        const newValue: BigNumber = 
            reachConsensus(nftProviderValues, consensusMechanism)
            .add(reachConsensus(tokenProviderValues, consensusMechanism));
        console.log(`New value: ${newValue}`);

        
        // STEP 6. CHECK FOR SUFFICIENT DEVIATION AND/OR TIMESTAMP
        const value = await sourceOfTruthOracle.getLatestValue(polygonDataFeedId);
        const latestOracleValue: BigNumber = value.value;
        const latestUpdateTimestamp: BigNumber = value.timestamp;
        console.log(`Latest value in the oracle: ${latestOracleValue}`);

        // Exit if the values are the same
        if (newValue.eq(latestOracleValue)) {
            return { canExec: false, message: `The oracle value has not changed` };
        }

        if (latestOracleValue.gt(0)) {
            // Is value difference less than the deviation percentage?
            // and was the last update time less than the number of seconds per heartbeat?
            const valueDiff = newValue.sub(latestOracleValue);
            const valueDiffPercent = valueDiff.mul(10000).div(latestOracleValue).abs();
            console.log(`Value difference since latest update: ${valueDiffPercent.div(100)}%`);

            // Get the time difference in seconds since the last update, using the block timestamp
            const block = await polygonProvider.getBlock("latest");
            const timeDiff = BigNumber.from(block.timestamp).sub(latestUpdateTimestamp);
            console.log(`Time since last update: ${timeDiff.div(60)} minutes`);
            
            if (valueDiffPercent.lte(deviation) && timeDiff.lte(heartbeat)) {
                return { canExec: false, message: `Value difference is less than ${deviation/100}% and the last update was less than ${heartbeat/60} minutes ago` };
            }
        }
        console.log(`Updating destination oracle value to: ${newValue}`);


        // STEP 7. UPDATE THE DESTINATION ORACLES WITH THE NEW VALUE
        return {
            canExec: true,
            callData: [
                {
                    to: OpenMarketsOracleAddress.POLYGON,
                    data: sourceOfTruthOracle.interface.encodeFunctionData(
                        "updateValue", 
                        [
                            polygonDataFeedId,
                            newValue
                        ]
                    )
                }
            ],
        };
    } catch (err) {
        return { canExec: false, message: err.message };
    }
});

/**
 * Mimicry Kaleidoscope Web3 Function
 *
 * This function takes the floor price of an NFT project 
 * and writes them on-chain when it deviates.
 */
export const version = "1.0.0";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber } from "ethers";
import {
  getRulesHash,
  isDeviationThresholdReached,
  isHeartbeatThresholdReached,
} from "../libs/helpers";
import { OpenMarketsOracle__factory } from "../../typechain";
import { OpenMarketsOracleAddress } from "../libs/enums";
import ky from "ky";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  try {
    const { userArgs, gelatoArgs, multiChainProvider } = context;
    console.log("Mimicry Kaleidoscope v" + version);

    // STEP 1. SETUP THE ORACLE
    // @dev: We currently only support Polygon Mainnet
    const provider = multiChainProvider.chainId(137);
    const oracle = OpenMarketsOracle__factory.connect(
      OpenMarketsOracleAddress.POLYGON,
      provider
    );
    const nickname = (userArgs.nickname as string) ?? "";
    if (nickname === "") throw new Error("A nickname must be provided");

    // STEP 2. CONFIGURE THE ORACLE
    const deviation = (userArgs.deviation as number) ?? 25; // 0.25% deviation
    const heartbeat = (userArgs.heartbeat as number) ?? 3600; // 1 hour heartbeat
    
    // STEP 3. GET THE NFT COLLECTION
    const chain = (userArgs.chain as string) ?? "ethereum";
    const address = (userArgs.address as string) ?? "";
    if (address === "") throw new Error("An address must be provided");

    console.log("All checks passed!");

    // STEP 4. CREATE A DATA FEED IF ONE DOESN'T ALREADY EXIST
    let dataFeedInfo: any;
    const hashArgs = { ...userArgs };
    delete hashArgs.nickname;
    const rulesHash = getRulesHash(hashArgs);
    const authorizedSender = await context.secrets.get("AUTHORIZED_SENDER");
    if (!authorizedSender) throw new Error("AUTHORIZED_SENDER not set in secrets");
    try {
      dataFeedInfo = await oracle["getDataFeedInfoByHash(bytes32,address)"](rulesHash, authorizedSender);
    } catch (error: any) {
      console.log(error);

      // If the data feed doesn't exist, create it
      console.log("Creating new data feed...");
      return {
        canExec: true,
        callData: [
          {
            to: OpenMarketsOracleAddress.POLYGON,
            data: oracle.interface.encodeFunctionData("createDataFeed", [
              nickname + ": " + chain + "/" + address,
              rulesHash,
            ]),
          },
        ],
      };
    }

    // STEP 5. GET DATA FROM KALEIDOSCOPE API
    const key = await context.secrets.get("KALEIDOSCOPE_KEY") ?? "";
    const url = `https://api.kaleidoscope.mimicry.org/v1/collections/${chain}/${address}/floor`;
    let floorResponse: any;
    try {
        floorResponse = await ky.create({
            headers: {
                'x-api-key': key
            }
        }).get(url, { timeout: 10_000, retry: 0 }).json();

        // {
        //     "currencyInfo": {
        //       "symbol": "ETH",
        //       "name": "Ethereum",
        //       "decimals": 18
        //     },
        //     "amount": {
        //       "atomic": "590000000000000000n",
        //       "decimal": "0.59"
        //     }
        // }

    } catch (err: any) {
        throw new Error(err);
    }

    // STEP 6. CAST THE RESPONSE TO A BIG NUMBER
    const newValue = BigNumber.from(floorResponse.amount.atomic.replace('n', ''));
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

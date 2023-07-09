/**
 * Open-Markets-Oracle Cloner
 * 
 * This function writes the latest value of an OMO on one chain
 * to another chain. This is particularlly useful when wanting to 
 * mirror oracles between mainnet and testnet.
 * 
 * Currently only clones from Polygon's OMO to Mumbai's OMO
 */
export const version = "2.0.0";
import {
    Web3Function,
    Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract, ethers } from "ethers";
import { OpenMarketsOracleAddress } from "../libs/enums";
import { OpenMarketsOracle__factory } from "../../typechain";
import { getRulesHash } from "../libs/helpers";

Web3Function.onRun(async (context: Web3FunctionContext) => {
    try { 
        const { userArgs, multiChainProvider } = context;
        console.log("Open-Markets-Oracle Cloner v" + version);
        // console.log(userArgs);


        // STEP 1. SETUP THE ORACLE
        // @dev: We currently only support Polygon and Mumbai
        const mumbaiProvider = multiChainProvider.default();
        const polygonProvider = new ethers.providers.JsonRpcProvider(
            await context.secrets.get("PROVIDER_API_POLYGON_MAINNET")
        );
        const sourceOfTruthOracle: Contract = OpenMarketsOracle__factory.connect(
            OpenMarketsOracleAddress.POLYGON,
            polygonProvider
        );
        const destinationOracle: Contract = OpenMarketsOracle__factory.connect(
            OpenMarketsOracleAddress.MUMBAI,
            mumbaiProvider
        );
        const polygonDataFeedId = (userArgs.polygonDataFeedId as number) ?? 0;
        if (polygonDataFeedId === 0) throw new Error(
            'polygonDataFeedId must be provided' 
            + ' in the form of a number greater than zero'
        );


        // Step 2. GET THE DATA FEED FROM THE SOURCE ORACLE
        const sourceDataFeedInfo = await sourceOfTruthOracle.getDataFeedInfo(
            polygonDataFeedId
        );
        const latestSourceOracleValue: BigNumber = sourceDataFeedInfo.latestValue.value;
        console.log(`Latest value in the source oracle: ${latestSourceOracleValue}`);
        

        // STEP 3. CREATE A DATA FEED ON THE DESTINATION ORACLE IF IT DOESN'T EXIST
        let destinationDataFeedInfo: any;
        const rulesHash = getRulesHash(userArgs);
        const authorizedSender = await context.secrets.get("AUTHORIZED_SENDER");
        if (!authorizedSender) throw new Error("AUTHORIZED_SENDER not set in secrets");
        try {
            destinationDataFeedInfo = await destinationOracle["getDataFeedInfoByHash(bytes32,address)"](rulesHash, authorizedSender);
        } catch (error: any) {
            // If the data feed doesn't exist, create it
            console.log("Creating new data feed...");
            return {
                canExec: true,
                callData: [
                {
                    to: OpenMarketsOracleAddress.MUMBAI,
                    data: destinationOracle.interface.encodeFunctionData("createDataFeed", [
                        sourceDataFeedInfo.nickname,
                        rulesHash,
                    ]),
                },
                ],
            };
        }


        // Step 4. GET THE LATEST VALUE FROM THE DESTINATION ORACLE
        const latestDestinationOracleValue: BigNumber = destinationDataFeedInfo.latestValue.value;
        console.log(`\nLatest value in the destination oracle: ${latestDestinationOracleValue}`);


        // Step 5. CHECK IF THE VALUES ARE THE SAME OR THE SOURCE IS ZERO 
        if (latestSourceOracleValue.eq(0)) {
            return { canExec: false, message: `The source oracle value is zero` };
        }
        if (latestSourceOracleValue.eq(latestDestinationOracleValue)) {
            return { canExec: false, message: `The oracle values are the same` };
        }
        

        // Step 6. UPDATE THE DESTINATION ORACLE
        console.log(`\nUpdating Mumbai oracle value to: ${latestSourceOracleValue}`);
        return {
            canExec: true,
            callData: [
                {
                    to: OpenMarketsOracleAddress.MUMBAI,
                    data: sourceOfTruthOracle.interface.encodeFunctionData(
                        "updateValue", 
                        [
                            destinationDataFeedInfo.id,
                            latestSourceOracleValue
                        ]
                    )
                }
            ]
        };
    } catch (err: any) {
        console.log(err);
        return { canExec: false, message: err.message };
    }
});

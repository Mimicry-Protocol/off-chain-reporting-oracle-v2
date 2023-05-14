import { task } from "hardhat/config";
import { AutomateSDK, Web3Function } from "@gelatonetwork/automate-sdk";
import { OpenMarketsOracle } from "../typechain";
import { version } from "../web3-functions/open-markets-oracle/index";

task("createOmo", "Create w3f task for OMO")
  .addParam("nickname", "The oracle's nickname")
  .addParam("deviation", "The minimum amount of change in prices between updates")
  .addParam("heartbeat", "The maximum amount of time between price updates")
  .addParam("currency", "usd, eth, etc.")
  .addParam("metric", "MarketCap, floor, etc.")
  .addParam("consensusMechanism", "mad:mean")
  .addParam("providers", "A CSV of provider names")
  .addParam("tokens", "A CSV of address pointers")
  .addParam("nftCollections", "A CSV of address pointers")
  .setAction(async (taskArgs, hre) => {
    const { ethers, w3f } = hre;
    console.log(taskArgs);

    const oracle = <OpenMarketsOracle>await ethers.getContract("OpenMarketsOracle");
    const oracleW3f = w3f.get("open-markets-oracle");

    const [deployer] = await ethers.getSigners();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    console.log(`chainId: ${chainId}`);

    const automate = new AutomateSDK(chainId, deployer);
    const web3Function = new Web3Function(chainId, deployer);

    // Deploy Web3Function on IPFS
    console.log("Deploying Web3Function on IPFS...");
    const cid = await oracleW3f.deploy();
    console.log(`Web3Function IPFS CID: ${cid}`);

    // // Create task using automate sdk
    // console.log("Creating automate task...");
    // const { taskId, tx } = await automate.createBatchExecTask({
    //   name: "OMO v" + version + ": " + taskArgs.nickname,
    //   web3FunctionHash: cid,
    //   web3FunctionArgs: {
    //     nickname: taskArgs.nickname,
    //     deviation: taskArgs.deviation,
    //     heartbeat: taskArgs.heartbeat, 
    //     providers: taskArgs.providers,
    //     nftCollections: taskArgs.nftcollections,
    //     tokens: taskArgs.tokens, 
    //     currency: taskArgs.currency,
    //     metric: taskArgs.metric,
    //     consensusMechanism: taskArgs.consensusmechanism,
    //   },
    // });
    // await tx.wait();
    // console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
    // console.log(
    //   `> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`
    // );

    // // Set task specific secrets
    // const secrets = oracleW3f.getSecrets();
    // if (Object.keys(secrets).length > 0) {
    //   await web3Function.secrets.set(secrets, taskId);
    //   console.log(`Secrets set`);
    // }

    process.exit();
});


// try {
//   const main = async () => {
//     const oracle = <OpenMarketsOracle>await ethers.getContract("OpenMarketsOracle");
//     const oracleW3f = w3f.get("open-markets-oracle");

//     const [deployer] = await ethers.getSigners();
//     const chainId = (await ethers.provider.getNetwork()).chainId;

//     console.log(`chainId: ${chainId}`);

//     const automate = new AutomateSDK(chainId, deployer);
//     const web3Function = new Web3Function(chainId, deployer);

//     // Deploy Web3Function on IPFS
//     console.log("Deploying Web3Function on IPFS...");
//     const cid = await oracleW3f.deploy();
//     console.log(`Web3Function IPFS CID: ${cid}`);

//     // Create task using automate sdk
//     console.log("Creating automate task...");
//     const { taskId, tx } = await automate.createBatchExecTask({
//       name: "OMO v" + version + ": " + nickname,
//       web3FunctionHash: cid,
//       web3FunctionArgs: {
//         nickname: nickname,
//         deviation: deviation,
//         heartbeat: heartbeat, 
//         providers: providers,
//         nftCollections: nftCollections,
//         tokens: tokens, 
//         currency: currency,
//         metric: metric,
//         consensusMechanism: consensusMechanism,
//       },
//     });
//     await tx.wait();
//     console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
//     console.log(
//       `> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`
//     );

//     // Set task specific secrets
//     const secrets = oracleW3f.getSecrets();
//     if (Object.keys(secrets).length > 0) {
//       await web3Function.secrets.set(secrets, taskId);
//       console.log(`Secrets set`);
//     }
//   };

//   main()
//     .then(() => {
//       process.exit();
//     })
//     .catch((err) => {
//       console.error("Error:", err.message);
//       process.exit(1);
//     });

// } catch (error: any) {
//   console.error(error.message);
// }
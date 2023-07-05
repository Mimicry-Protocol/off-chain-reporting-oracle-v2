# Oracle Contract Instructions

## Run...
1. Copy `.env.example` to `.env`
2. Add your Alchemy API key to the `ALCHEMY_ID` secret
3. Add your Private Key to the `PRIVATE_KEY` secret
4. Add your PolygonScan API key to the `ETHERSCAN_KEY` secret
5. Run `yarn build`
6. Run `yarn deploy --network mumbai`
7. Run `yarn verify --network mumbai`
8. Run `yarn deploy --network polygon`
9. Run `yarn verify --network polygon`
10. Head over to the proxy contract checker on [polygonscan pos](https://polygonscan.com/proxyContractChecker?a=) and [polygonscan mumbai](https://mumbai.polygonscan.com/proxyContractChecker?a=) to setup the two new proxy contracts as proxy contracts
11. Test with `npx hardhat w3f-run open-markets-oracle --log`
12. Deploy the task with: 
```
yarn create-task:omoOracle \
--network mumbai \
--nickname "Remilio Babies" \
--deviation 50 \
--heartbeat 3600 \
--nft-collections "ethereum-mainnet:0xD3D9ddd0CF0A5F0BFB8f7fcEAe075DF687eAEBaB" \
--tokens "" \
--currency usd \
--metric MarketCap \
--providers "NftGo" \
--consensus-mechanism mad:mean
```
13. Or try this if the task fails `npx hardhat w3f-deploy open-markets-oracle`;



## Create your Web3Function Kaleidoscope task
```
yarn create-task:kaleidoscope \
--network mumbai \
--nickname "BAYC" \
--deviation 25 \
--heartbeat 3600 \
--chain "ethereum" \
--address "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d"
```
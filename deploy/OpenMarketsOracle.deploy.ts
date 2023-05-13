import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (hre.network.name !== "hardhat") {
    console.log(
      `Deploying OpenMarketsOracle to ${hre.network.name}. Hit ctrl + c to abort`
    );
  }

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer, proxyAdminOwner } = await getNamedAccounts();
  
  await deploy("OpenMarketsOracle", {
    from: deployer,
    log: hre.network.name !== "hardhat",
    contract: "OpenMarketsOracle",
    proxy: {
      owner: proxyAdminOwner,
      proxyContract: "UUPS",
      execute: {
        init: {
          methodName: "initialize",
          args: [],
        },
      },
    },
  });
};

export default func;

func.tags = ["OpenMarketsOracle"];

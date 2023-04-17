import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { networkConfig } from '../helper-hardhat-config';
import { ethers, network } from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  const aiNft = await ethers.getContract('DiffusedNfts');

  await deploy('DiffusedMarketplace', {
    from: deployer,
    log: true,
    waitConfirmations: networkConfig[network.name].confirmations,
    args: [aiNft.address],
  });
};

export default func;
func.tags = ['all', 'pokemon-marketplace'];

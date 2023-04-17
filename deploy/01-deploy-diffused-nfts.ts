import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { networkConfig } from '../helper-hardhat-config';
import { network } from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy('DiffusedNfts', {
    from: deployer,
    log: true,
    waitConfirmations: networkConfig[network.name].confirmations,
    args: [network.name],
  });
};

export default func;
func.tags = ['all', 'diffused-nfts'];

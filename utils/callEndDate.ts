import { ethers } from 'hardhat';
import { DiffusedMarketplace } from '../typechain-types';

export async function callEndDate(tokenId: number) {
  const diffusedMarketplace = await ethers.getContract<DiffusedMarketplace>(
    'DiffusedMarketplace'
  );

  const txRec = await diffusedMarketplace.callEndDate(tokenId);
  await txRec.wait(1);
}

import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { DiffusedMarketplace } from '../typechain-types';

export async function listToken(
  tokenId: number,
  openingBid: BigNumber,
  duration: number,
  minimumBidIncrement: number
) {
  const diffusedMarketplace = await ethers.getContract<DiffusedMarketplace>(
    'DiffusedMarketplace'
  );

  const txRec = await diffusedMarketplace[
    'listToken(uint256,uint256,uint256,uint256)'
  ](tokenId, openingBid, duration, minimumBidIncrement);
  await txRec.wait(1);
}

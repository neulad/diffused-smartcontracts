import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { DiffusedMarketplace } from '../typechain-types';

export async function bid(
  tokenId: number,
  amount: BigNumber,
  idOfAccount: number
) {
  const bidder = (await ethers.getSigners())[idOfAccount];

  const diffusedMarketplace = await ethers.getContract<DiffusedMarketplace>(
    'DiffusedMarketplace',
    bidder
  );

  const txRec = await diffusedMarketplace.bid(tokenId, amount, {
    value: amount,
  });

  await txRec.wait(1);
}

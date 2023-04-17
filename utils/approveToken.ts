import { ethers } from 'hardhat';
import { DiffusedMarketplace, DiffusedNfts } from '../typechain-types';

export async function approveToken(tokenId: number) {
  const diffusedNfts = await ethers.getContract<DiffusedNfts>('DiffusedNfts');
  const diffusedMarketplace = await ethers.getContract<DiffusedMarketplace>(
    'DiffusedMarketplace'
  );

  const txRec = await diffusedNfts.approve(
    diffusedMarketplace.address,
    tokenId
  );
  await txRec.wait(1);
}

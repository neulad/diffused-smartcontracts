import { deployments, ethers, network } from 'hardhat';
import { approveToken } from '../utils/approveToken';
import { bid } from '../utils/bid';
import { listToken } from '../utils/listToken';
import { BigNumber } from 'ethers';
import { mintToken } from '../utils/mintToken';
import { callEndDate } from '../utils/callEndDate';
import { DiffusedMarketplace, DiffusedNfts } from '../typechain-types';

async function main() {
  const deployer = (await ethers.getSigners())[0];
  const bidder = (await ethers.getSigners())[1];
  await deployments.fixture(['all']);

  const diffusedMarketpalce = await ethers.getContract<DiffusedMarketplace>(
    'DiffusedMarketplace'
  );
  const diffusedNfts = await ethers.getContract<DiffusedNfts>('DiffusedNfts');

  console.log('Minting a token...');
  let startedAt = Date.now();
  const { tokenId } = await mintToken();
  let endedAt = Date.now();
  console.log(`\tMinted in ${endedAt - startedAt}ms!\n`);

  console.log('Approving for the marketplace...');
  startedAt = Date.now();
  await approveToken(tokenId);
  endedAt = Date.now();
  console.log(`\tApproved in ${endedAt - startedAt}ms!\n`);

  console.log('Listing on the marketplace...');
  startedAt = Date.now();
  await listToken(tokenId, BigNumber.from('1000000000000'), 10, 2);
  endedAt = Date.now();
  console.log(`\tListed in ${endedAt - startedAt}ms!\n`);

  console.log('Making a bid...');
  const minBid = await diffusedMarketpalce.getMinBid(tokenId);
  startedAt = Date.now();
  await bid(tokenId, minBid, 1);
  endedAt = Date.now();
  console.log(`\tBidded in ${endedAt - startedAt}ms!\n`);

  await network.provider.send('hardhat_mine', ['0xb']);

  console.log('Ending auction...');
  startedAt = Date.now();
  await callEndDate(tokenId);
  endedAt = Date.now();
  console.log(`\tEnded in ${endedAt - startedAt}ms!\n`);

  console.log('Final stats:');

  console.log(
    '\tdeployer: \n',
    `\t  - balance +${await ethers.utils.formatEther(
      await diffusedMarketpalce.getFunds(deployer.address)
    )}eth`
  );
  console.log(
    '\tbidder: \n',
    `\t  - tokens +${await diffusedNfts.balanceOf(bidder.address)}`
  );
}

main()
  .then(() => {
    console.log('\nAll auctions steps are through 🥳');
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });

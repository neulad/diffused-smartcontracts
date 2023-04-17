import * as hre from 'hardhat';
import { ethers, network } from 'hardhat';

async function main() {
  // Make it accessable in the next try/catch block
  const diffusedNftsAddress = (await ethers.getContract('DiffusedNfts'))
    .address;
  const diffusedMarketplaceAddress = (
    await ethers.getContract('DiffusedMarketplace')
  ).address;

  // Verifying DiffusedNfts
  try {
    await hre.run('verify:verify', {
      address: diffusedNftsAddress,
      constructorArguments: [network.name],
    });
  } catch (err) {
    if (err instanceof Error) console.error(err.message);
    else console.error(err);
  }

  // Verifying PokemonMarketplace
  try {
    await hre.run('verify:verify', {
      address: diffusedMarketplaceAddress,
      constructorArguments: [diffusedNftsAddress],
    });
  } catch (err) {
    if (err instanceof Error) console.error(err.message);
    else console.error(err);
  }
}

main()
  .then(() => {
    console.log('Successfully verified!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });

import { ethers, network } from 'hardhat';
import { DiffusedNfts } from '../typechain-types';
import randomstring from 'randomstring';
import { concat, toUtf8Bytes } from 'ethers/lib/utils';

export async function mintToken() {
  const diffusedNfts = await ethers.getContract<DiffusedNfts>('DiffusedNfts');
  const deployer = (await ethers.getSigners())[0];

  const ipfsHash = `Qm${randomstring.generate(44)}`;
  const message = concat([
    toUtf8Bytes(ipfsHash),
    deployer.address,
    toUtf8Bytes(network.name),
  ]);
  const messageLength =
    '0x' + Buffer.from(String(message.length)).toString('hex');
  const signature = await deployer.signMessage(message);

  const txRes = await diffusedNfts.mintDiffusedNft(
    ipfsHash,
    messageLength,
    signature
  );

  const txRec = await txRes.wait(1);
  const data = txRec.events![0].args!;

  return data;
}

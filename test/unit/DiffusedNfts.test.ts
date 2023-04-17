import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { devChains } from '../../helper-hardhat-config';
import { expect } from 'chai';
import { DiffusedNfts } from '../../typechain-types';
import { concat, toUtf8Bytes } from 'ethers/lib/utils';

!devChains.includes(network.name)
  ? describe.skip
  : describe('diffusedNfts', function () {
      let diffusedNfts: DiffusedNfts;
      let deployer: any;
      let ipfsHash: string;
      let messageLength: string;
      let signature: string;

      beforeEach(async function () {
        await deployments.fixture(['diffused-nfts']);
        deployer = (await ethers.getSigners())[0];
        diffusedNfts = await ethers.getContract('DiffusedNfts');

        ipfsHash = 'QmckrSBasx8nPZkSmTVGKUgbzxtCdsQXiKCiGDHPS8kLCS';
        const message = concat([
          toUtf8Bytes(ipfsHash),
          deployer.address,
          toUtf8Bytes(network.name),
        ]);
        const messageGoerli = concat([
          toUtf8Bytes(ipfsHash),
          deployer.address,
          toUtf8Bytes('goerli'),
        ]);
        const messageLength2 =
          '0x' + Buffer.from(String(messageGoerli.length)).toString('hex');

        messageLength =
          '0x' + Buffer.from(String(message.length)).toString('hex');
        signature = await deployer.signMessage(message);
      });

      describe('constructor', function () {
        it('it returns appropriate tokenCounter', async function () {
          const tokenCounter = await diffusedNfts.getTokenCounter();

          expect(tokenCounter).to.be.equal(0);
        });
      });

      describe('mintDiffusedNft', function () {
        it('reverts because address is not in the signature', async function () {
          const accounts = await ethers.getSigners();
          const attackerDiffusedNfts = diffusedNfts.connect(accounts[1]);

          await expect(
            attackerDiffusedNfts.mintDiffusedNft(
              ipfsHash,
              messageLength,
              signature
            )
          ).to.be.revertedWithCustomError(
            diffusedNfts,
            'DiffusedNfts__SignatureFailed'
          );
        });

        it('reverts with DiffusedNfts__AlreadyMinted', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );

          await expect(
            diffusedNfts.mintDiffusedNft(ipfsHash, messageLength, signature)
          ).to.be.revertedWithCustomError(
            diffusedNfts,
            'DiffusedNfts__AlreadyMinted'
          );
        });

        it('returns true because minted', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );

          expect(await diffusedNfts.isMinted(ipfsHash)).to.be.true;
        });

        it('increases tokenCounter by one', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );

          const tokenCounter = await diffusedNfts.getTokenCounter();

          expect(tokenCounter).to.be.equal(1);
        });

        it('mints an nft', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );

          expect(await diffusedNfts.ownerOf(1)).to.be.equal(deployer.address);
          expect(await diffusedNfts.balanceOf(deployer.address)).to.be.equal(1);
        });

        it('assigns a token uri', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );

          expect(await diffusedNfts.tokenURI(1)).to.be.equal(
            'ipfs://QmckrSBasx8nPZkSmTVGKUgbzxtCdsQXiKCiGDHPS8kLCS'
          );
        });

        it('emits MintedNft', async function () {
          expect(
            diffusedNfts.mintDiffusedNft(ipfsHash, messageLength, signature)
          ).to.emit(diffusedNfts, 'MintedNft');
        });
      });
    });

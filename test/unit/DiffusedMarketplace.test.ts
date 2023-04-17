import { deployments, ethers, network } from 'hardhat';
import { devChains } from '../../helper-hardhat-config';
import { concat, toUtf8Bytes } from 'ethers/lib/utils';
import { expect } from 'chai';
import { DiffusedNfts, DiffusedMarketplace } from '../../typechain-types';

!devChains.includes(network.name)
  ? describe.skip
  : describe('DiffusedMarketplace', function () {
      let diffusedNfts: DiffusedNfts;
      let diffusedMarketplace: DiffusedMarketplace;
      let ipfsHash: string;
      let messageLength: string;
      let signature: string;

      let deployer: any;

      beforeEach(async function () {
        // Deployment and assigning
        await deployments.fixture(['all']);
        deployer = (await ethers.getSigners())[0];
        diffusedNfts = await ethers.getContract('DiffusedNfts');
        diffusedMarketplace = await ethers.getContract('DiffusedMarketplace');

        ipfsHash = 'QmckrSBasx8nPZkSmTVGKUgbzxtCdsQXiKCiGDHPS8kLCS';
        const message = concat([
          toUtf8Bytes(ipfsHash),
          deployer.address,
          toUtf8Bytes(network.name),
        ]);
        messageLength = messageLength =
          '0x' + Buffer.from(String(message.length)).toString('hex');
        signature = await deployer.signMessage(message);
      });

      describe('constructor', function () {
        it('returns correct NFT contract address', async function () {
          expect(await diffusedMarketplace.getNftAddress()).to.be.equal(
            diffusedNfts.address
          );
        });
      });

      describe('listToken', function () {
        it('reverts because invalid tokenId', async function () {
          await expect(
            diffusedMarketplace['listToken(uint256,uint256,uint256)'](
              999,
              1000000000000,
              10
            )
          ).to.be.rejectedWith('ERC721: invalid token ID');
        });

        it('reverts because not approved', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );

          await expect(
            diffusedMarketplace['listToken(uint256,uint256,uint256)'](
              1,
              1000000000000,
              10
            )
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__TokenNotApprovedForMarketplace'
          );
        });

        it('reverts because not an owner', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          const attacker = (await ethers.getSigners())[1];
          const attackerDiffusedMarketplace =
            diffusedMarketplace.connect(attacker);

          await expect(
            attackerDiffusedMarketplace['listToken(uint256,uint256,uint256)'](
              1,
              1000000000000,
              10
            )
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__SellerNotOwner'
          );
        });

        it('reverts because opening bid is too low', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await expect(
            diffusedMarketplace['listToken(uint256,uint256,uint256)'](1, 1, 10)
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__InsufficientBid'
          );
        });

        it('reverts because duration is too low', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await expect(
            diffusedMarketplace['listToken(uint256,uint256,uint256)'](
              1,
              1000000000000,
              1
            )
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__DurationOutRange'
          );
        });

        it('reverts because duration is too high', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await expect(
            diffusedMarketplace['listToken(uint256,uint256,uint256)'](
              1,
              1000000000000,
              57_601
            )
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__DurationOutRange'
          );
        });

        it('reverts because the token is already listed', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await diffusedMarketplace['listToken(uint256,uint256,uint256)'](
            1,
            1000000000000,
            10
          );

          await expect(
            diffusedMarketplace['listToken(uint256,uint256,uint256)'](
              1,
              1000000000000,
              10
            )
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__TokenAlreadyListed'
          );
        });

        it('reverts beacuse minimum bid increment is too low', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await expect(
            diffusedMarketplace['listToken(uint256,uint256,uint256,uint256)'](
              1,
              1000000000000,
              10,
              1
            )
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__MinBidIncrementOuOfRange'
          );
        });

        it('reverts because minimum bid increment is too high', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await expect(
            diffusedMarketplace['listToken(uint256,uint256,uint256,uint256)'](
              1,
              1000000000000,
              16,
              0
            )
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__MinBidIncrementOuOfRange'
          );
        });

        it('assigns token to the market', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          diffusedMarketplace['listToken(uint256,uint256,uint256)'](
            1,
            1000000000000,
            10
          );

          expect(await diffusedNfts.ownerOf(1)).to.be.equal(
            diffusedMarketplace.address
          );
        });

        it('assigns claim to the seller', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await diffusedMarketplace['listToken(uint256,uint256,uint256)'](
            1,
            1000000000000,
            10
          );

          expect(await diffusedMarketplace.getClaim(1)).to.be.equal(
            deployer.address
          );
        });

        it('emits TokenListed', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await expect(
            diffusedMarketplace['listToken(uint256,uint256,uint256)'](
              1,
              1000000000000,
              10
            )
          ).to.emit(diffusedMarketplace, 'TokenListed');
        });

        it('adds a new listing', async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);
          await diffusedMarketplace['listToken(uint256,uint256,uint256)'](
            1,
            1000000000000,
            10
          );
          const listing = await diffusedMarketplace.getListing(1);

          expect(listing.seller).to.be.equal(deployer.address);
          expect(listing.lastBid.amount).to.be.equal(1000000000000);
        });
      });

      describe('bid', function () {
        beforeEach(async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await diffusedMarketplace['listToken(uint256,uint256,uint256)'](
            1,
            1000000000000,
            10
          );
        });

        it('reverts because not listed', async function () {
          await expect(
            diffusedMarketplace.bid(2, 10)
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__TokenNotListed'
          );
        });

        it('reverts because stake is too low', async function () {
          await expect(
            diffusedMarketplace.bid(1, 1000000000000)
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__InsufficientBidIncrement'
          );
        });

        it('reverts because funds are too low', async function () {
          const minBid = await diffusedMarketplace.getMinBid(1);

          await expect(
            diffusedMarketplace.bid(1, minBid)
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__InsufficientAvailableFunds'
          );
        });

        it('reverts because listing is closed', async function () {
          const minBid = await diffusedMarketplace.getMinBid(1);
          await network.provider.send('hardhat_mine', ['0xb']);

          await expect(
            diffusedMarketplace.bid(1, minBid, { value: minBid })
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__AuctionClosed'
          );
        });

        it('unblocks funds for the previous bidder', async function () {
          const bidder = (await ethers.getSigners())[1];

          let minBid = await diffusedMarketplace.getMinBid(1);

          await diffusedMarketplace.bid(1, minBid, { value: minBid });

          minBid = await diffusedMarketplace.getMinBid(1);
          const bidderDiffusedMarketplace = diffusedMarketplace.connect(bidder);

          await bidderDiffusedMarketplace.bid(1, minBid, { value: minBid });

          expect(
            await diffusedMarketplace.getLockedBalance(deployer.address)
          ).to.be.equal(0);
        });

        it('emits ListingBid', async function () {
          const minBid = await diffusedMarketplace.getMinBid(1);

          await expect(
            diffusedMarketplace.bid(1, minBid, { value: minBid })
          ).to.emit(diffusedMarketplace, 'ListingBid');
        });

        it('lockes funds', async function () {
          const minBid = await diffusedMarketplace.getMinBid(1);

          await diffusedMarketplace.bid(1, minBid, { value: minBid });

          expect(
            await diffusedMarketplace.getLockedBalance(deployer.address)
          ).to.be.equal(minBid);
        });

        it('decreases funds', async function () {
          const minBid = await diffusedMarketplace.getMinBid(1);

          await diffusedMarketplace.bid(1, minBid, { value: minBid });

          expect(
            await diffusedMarketplace.getFunds(deployer.address)
          ).to.be.equal(0);
        });

        it('adds new bid', async function () {
          const minBid = await diffusedMarketplace.getMinBid(1);

          await diffusedMarketplace.bid(1, minBid, { value: minBid });

          const listing = await diffusedMarketplace.getListing(1);

          expect(listing.lastBid.bidder).to.be.equal(deployer.address);
          expect(listing.lastBid.amount).to.be.equal(minBid);
        });
      });

      describe('callEndDate', async function () {
        beforeEach(async function () {
          const bidder = (await ethers.getSigners())[1];
          const bidderDiffusedMarketplace = diffusedMarketplace.connect(bidder);

          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await diffusedMarketplace['listToken(uint256,uint256,uint256)'](
            1,
            1000000000000,
            10
          );

          const minBid = await diffusedMarketplace.getMinBid(1);
          await bidderDiffusedMarketplace.bid(1, minBid, { value: minBid });

          await network.provider.send('hardhat_mine', ['0xb']);
        });

        it('reverts because not listed', async function () {
          expect(
            diffusedMarketplace.callEndDate(999)
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__TokenNotListed'
          );
        });

        it('reverts because listing is active', async function () {
          const secondIpfsHash =
            'Qme9ptKd7SmZjSMmr223hxiPNdY3NqGau3npTjcmiztiZv';
          const message = concat([
            toUtf8Bytes(secondIpfsHash),
            deployer.address,
            toUtf8Bytes(network.name),
          ]);
          const secondMessageLength = (messageLength =
            '0x' + Buffer.from(String(message.length)).toString('hex'));
          const secondSignature = await deployer.signMessage(
            concat([
              toUtf8Bytes(secondIpfsHash),
              deployer.address,
              toUtf8Bytes(network.name),
            ])
          );

          await diffusedNfts.mintDiffusedNft(
            secondIpfsHash,
            secondMessageLength,
            secondSignature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 2);

          await diffusedMarketplace['listToken(uint256,uint256,uint256)'](
            2,
            1000000000000,
            10
          );

          await expect(
            diffusedMarketplace.callEndDate(2)
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__DurationActive'
          );
        });

        it('unblocks balance', async function () {
          await diffusedMarketplace.callEndDate(1);

          expect(
            await diffusedMarketplace.getLockedBalance(deployer.address)
          ).to.be.equal(0);
        });

        it('deletes claim', async function () {
          await diffusedMarketplace.callEndDate(1);

          expect(await diffusedMarketplace.getClaim(1)).to.be.equal(
            '0x0000000000000000000000000000000000000000'
          );
        });

        it('deletes listing', async function () {
          await diffusedMarketplace.callEndDate(1);

          const listing = await diffusedMarketplace.getListing(1);

          expect(listing.seller).to.be.equal(
            '0x0000000000000000000000000000000000000000'
          );
        });

        it('emits ListingClosed', async function () {
          await expect(diffusedMarketplace.callEndDate(1)).to.emit(
            diffusedMarketplace,
            'ListingClosed'
          );
        });

        it('transfers ownership of the token', async function () {
          const bidder = (await ethers.getSigners())[1];

          await diffusedMarketplace.callEndDate(1);

          expect(await diffusedNfts.ownerOf(1)).to.be.equal(bidder.address);
        });

        describe('if no bids', function () {
          beforeEach(async function () {
            const secondIpfsHash =
              'Qme9ptKd7SmZjSMmr223hxiPNdY3NqGau3npTjcmiztiZv';
            const message = concat([
              toUtf8Bytes(secondIpfsHash),
              deployer.address,
              toUtf8Bytes(network.name),
            ]);
            const secondMessageLength = (messageLength =
              '0x' + Buffer.from(String(message.length)).toString('hex'));
            const secondSignature = await deployer.signMessage(
              concat([
                toUtf8Bytes(secondIpfsHash),
                deployer.address,
                toUtf8Bytes(network.name),
              ])
            );

            await diffusedNfts.mintDiffusedNft(
              secondIpfsHash,
              secondMessageLength,
              secondSignature
            );
            await diffusedNfts.approve(diffusedMarketplace.address, 2);

            await diffusedMarketplace['listToken(uint256,uint256,uint256)'](
              2,
              1000000000000,
              10
            );

            await network.provider.send('hardhat_mine', ['0xb']);
          });

          it('deletes claim', async function () {
            await diffusedMarketplace.callEndDate(2);

            expect(await diffusedMarketplace.getClaim(2)).to.be.equal(
              '0x0000000000000000000000000000000000000000'
            );
          });

          it('deletes listing', async function () {
            await diffusedMarketplace.callEndDate(2);

            const listing = await diffusedMarketplace.getListing(2);

            expect(listing.seller).to.be.equal(
              '0x0000000000000000000000000000000000000000'
            );
          });

          it('emits ListingClosed', async function () {
            await expect(diffusedMarketplace.callEndDate(2)).to.emit(
              diffusedMarketplace,
              'ListingClosed'
            );
          });

          it('transfers ownership', async function () {
            await diffusedMarketplace.callEndDate(2);

            expect(await diffusedNfts.ownerOf(2)).to.be.equal(deployer.address);
          });
        });
      });

      describe('withdrawFunds', function () {
        it('reverts because no funds', async function () {
          await expect(
            diffusedMarketplace.withdrawFunds()
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__NoProceeds'
          );
        });

        describe('when funds are presented', function () {
          beforeEach(async function () {
            await diffusedMarketplace.cashIn({
              value: ethers.utils.formatUnits(10, 'wei'),
            });
          });

          it('sets funds to zero', async function () {
            await diffusedMarketplace.withdrawFunds();

            expect(
              await diffusedMarketplace.getFunds(deployer.address)
            ).to.be.equal(0);
          });

          it('increases the balance of the owner by 3.333...%', async function () {
            const holder = (await ethers.getSigners())[1];
            const holderDiffusedMarketplace =
              diffusedMarketplace.connect(holder);
            await holderDiffusedMarketplace.cashIn({
              value: ethers.utils.parseEther('10'),
            });

            const initialOwnerBalance = await diffusedMarketplace.getFunds(
              deployer.address
            );

            await holderDiffusedMarketplace.withdrawFunds();

            const finalOwnerBalance = await diffusedMarketplace.getFunds(
              deployer.address
            );

            expect(finalOwnerBalance).to.be.equal(
              initialOwnerBalance.add(
                /**
                 * Math.floor works with number type only,
                 * .toNumber causes overflow, so custom method used
                 */
                ethers.utils.parseEther('10').div(30).toString().split('.')[0]
              )
            );
          });

          it('balance of the user increased', async function () {
            const initialBalance = await ethers.provider.getBalance(
              deployer.address
            );
            const lockedBalance = await diffusedMarketplace.getFunds(
              deployer.address
            );

            const txRec = await diffusedMarketplace.withdrawFunds();
            const txRes = await txRec.wait(1);
            const txFee = txRes.effectiveGasPrice.mul(txRes.gasUsed);

            const finalBalance = await ethers.provider.getBalance(
              deployer.address
            );
            expect(finalBalance).to.be.equal(
              initialBalance.add(lockedBalance).sub(txFee)
            );
          });
        });
      });

      describe('getAdditionalMsgValue', function () {
        beforeEach(async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await diffusedMarketplace['listToken(uint256,uint256,uint256)'](
            1,
            1000000000000,
            10
          );

          await diffusedMarketplace.cashIn({ value: '500000000000' });
        });

        it('reverts because not listed', async function () {
          expect(
            diffusedMarketplace.getAdditionalMsgValue(2)
          ).to.be.revertedWithCustomError(
            diffusedMarketplace,
            'DiffusedMarketplace__TokenNotListed'
          );
        });

        it('returns appropriate value', async function () {
          const minBid = await diffusedMarketplace.getMinBid(1);
          const funds = await diffusedMarketplace.getFunds(deployer.address);

          const difference = funds.sub(minBid).lt(0)
            ? funds.sub(minBid).abs()
            : 0;
          expect(
            await diffusedMarketplace.getAdditionalMsgValue(1)
          ).to.be.equal(difference);
        });
      });

      describe('getMinBid', function () {
        beforeEach(async function () {
          await diffusedNfts.mintDiffusedNft(
            ipfsHash,
            messageLength,
            signature
          );
          await diffusedNfts.approve(diffusedMarketplace.address, 1);

          await diffusedMarketplace['listToken(uint256,uint256,uint256)'](
            1,
            1000000000000,
            10
          );
        });

        it('returns minimum bid', async function () {
          const listing = await diffusedMarketplace.getListing(1);

          expect(await diffusedMarketplace.getMinBid(1)).to.be.equal(
            listing.lastBid.amount.add(
              listing.lastBid.amount
                .mul(listing.minimumBidIncrement)
                .div(100)
                .toString()
                .split('.')[0]
            )
          );
        });
      });
    });

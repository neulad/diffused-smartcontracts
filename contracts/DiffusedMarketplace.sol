// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

error DiffusedMarketplace__TokenNotApprovedForMarketplace();
error DiffusedMarketplace__TokenAlreadyListed();
error DiffusedMarketplace__TokenNotListed();
error DiffusedMarketplace__NotOwner();
error DiffusedMarketplace__SellerNotOwner();
error DiffusedMarketplace__TokenAlreadyClaimed();
error DiffusedMarketplace__NoProceeds();
error DiffusedMarketplace__WithdrawFailed();
error DiffusedMarketplace__NullishAddress();
error DiffusedMarketplace__AuctionClosed();
error DiffusedMarketplace__MinBidIncrementNotMet();
error DiffusedMarketplace__MinBidIncrementOuOfRange();
error DiffusedMarketplace__DurationOutRange();
error DiffusedMarketplace__InsufficientBid();
error DiffusedMarketplace__DurationActive();
error DiffusedMarketplace__InsufficientAvailableFunds(
    uint256 available,
    uint256 required
);
error DiffusedMarketplace__InsufficientBidIncrement(
    uint256 expected,
    uint256 received
);

/**
 * @title Marketplace for diffused NFTs
 * @author Uladzimir Kireyeu
 * @notice Usage is strictly devoted to ai-generated
 * pictures
 * @dev You will have to deploy copy of this contract to
 * work with other nft contracts
 */
contract DiffusedMarketplace is ReentrancyGuard, Ownable {
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 bidAt;
    }

    struct Listing {
        address seller;
        uint256 minimumBidIncrement;
        uint256 endDate;
        uint256 listedAt;
        Bid lastBid;
    }

    event TokenListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 minimumBidIncrement,
        uint256 endDate,
        uint256 indexed listedAt,
        Bid lastBid
    );

    event ListingClosed(uint256 indexed tokenId, uint256 listedAt, Bid lastBid);

    event ListingBid(
        uint256 indexed tokenId,
        uint256 listedAt,
        address indexed bidder,
        uint256 amount,
        uint256 indexed bidAt
    );

    mapping(uint256 => Listing) private s_listings;
    mapping(address => uint256) private s_funds;
    mapping(address => uint256) private s_lockedFunds;
    mapping(uint256 => address) private s_claims;
    IERC721 private immutable i_diffusedNfts;
    address private immutable i_diffusedNftsAddress;

    uint256 constant MINIMUM_MINIMUM_BID_INCREMENT = 2;
    uint256 constant MAXIMUM_MINIMUM_BID_INCREMENT = 15;
    uint256 constant MIN_DURATION = 10;
    uint256 constant MAX_DURATION = 57_600;
    uint256 constant MIN_OPENING_BID = 1000 gwei;

    constructor(address diffusedNftsAddress) {
        // Check that contract address is not nullish
        if (diffusedNftsAddress == address(0)) {
            revert DiffusedMarketplace__NullishAddress();
        }

        i_diffusedNftsAddress = diffusedNftsAddress;
        i_diffusedNfts = IERC721(i_diffusedNftsAddress);
    }

    /**
     * @notice Checks if token is listed already
     * @param tokenId TokenId in the DiffusedNfts
     * @return If token is listed true, if not - false
     */
    function ifListed(uint256 tokenId) private view returns (bool) {
        Listing memory listing = s_listings[tokenId];

        if (listing.seller == address(0) && s_claims[tokenId] == address(0)) {
            return false;
        }

        return true;
    }

    /**
     * @notice Transfers ownership to the marketplace
     * to avoid approving tokens due to the possibilty of
     * approving token to the new owner in the middle of auction.
     * Ownership will be transferred in the end of auction
     */
    function transferWithClaim(uint256 tokenId) private {
        s_claims[tokenId] = msg.sender;
        i_diffusedNfts.transferFrom(msg.sender, address(this), tokenId);
    }

    /**
     * @notice Lists item in the marketplace
     * @dev Token must be approved to the contract in advance
     * @param tokenId Token ID derived from the nft contract
     * @param openingBid Starting price of the listing
     * @param duration Amount of blocks until auction is closed
     * @param minimumBidIncrement Minimum percentag of bid increment (5% - 5)
     */
    function listToken(
        uint256 tokenId,
        uint256 openingBid,
        uint256 duration,
        uint256 minimumBidIncrement
    ) public {
        if (i_diffusedNfts.getApproved(tokenId) != address(this)) {
            revert DiffusedMarketplace__TokenNotApprovedForMarketplace();
        }

        if (i_diffusedNfts.ownerOf(tokenId) != msg.sender) {
            revert DiffusedMarketplace__SellerNotOwner();
        }

        if (openingBid < MIN_OPENING_BID) {
            revert DiffusedMarketplace__InsufficientBid();
        }

        if (MIN_DURATION > duration || MAX_DURATION < duration) {
            revert DiffusedMarketplace__DurationOutRange();
        }

        if (ifListed(tokenId)) {
            revert DiffusedMarketplace__TokenAlreadyListed();
        }

        if (
            minimumBidIncrement < MINIMUM_MINIMUM_BID_INCREMENT ||
            minimumBidIncrement > MAXIMUM_MINIMUM_BID_INCREMENT
        ) {
            revert DiffusedMarketplace__MinBidIncrementOuOfRange();
        }

        s_listings[tokenId] = Listing(
            msg.sender,
            minimumBidIncrement,
            block.number + duration,
            block.number,
            Bid(address(0), openingBid, block.number)
        );

        emit TokenListed(
            tokenId,
            msg.sender,
            minimumBidIncrement,
            block.number + duration,
            block.number,
            Bid(address(0), openingBid, block.number)
        );

        /**
         * Token is transferred to contract posession until
         * the auction is closed and user call callEndDate
         */
        transferWithClaim(tokenId);
    }

    /**
     * @notice Lists item in the marketplace
     * @dev Minimum bid increment is set as default
     * @param tokenId Token ID derived from the nft contract
     * @param openingBid Starting price of the listing
     * @param duration Amount of blocks until auction is closed
     */
    function listToken(
        uint256 tokenId,
        uint256 openingBid,
        uint256 duration
    ) public {
        if (ifListed(tokenId)) {
            revert DiffusedMarketplace__TokenAlreadyListed();
        }

        if (i_diffusedNfts.getApproved(tokenId) != address(this)) {
            revert DiffusedMarketplace__TokenNotApprovedForMarketplace();
        }

        if (i_diffusedNfts.ownerOf(tokenId) != msg.sender) {
            revert DiffusedMarketplace__SellerNotOwner();
        }

        if (openingBid < MIN_OPENING_BID) {
            revert DiffusedMarketplace__InsufficientBid();
        }

        if (MIN_DURATION > duration || MAX_DURATION < duration) {
            revert DiffusedMarketplace__DurationOutRange();
        }

        s_listings[tokenId] = Listing(
            msg.sender,
            MINIMUM_MINIMUM_BID_INCREMENT,
            block.number + duration,
            block.number,
            Bid(address(0), openingBid, 0)
        );

        emit TokenListed(
            tokenId,
            msg.sender,
            MINIMUM_MINIMUM_BID_INCREMENT,
            block.number + duration,
            block.number,
            Bid(address(0), openingBid, block.number)
        );

        /**
         * Token is transferred to contract posession until
         * the auction is closed and user call callEndDate
         */
        transferWithClaim(tokenId);
    }

    /**
     * @notice Makes a bid on the listing
     * @dev Initial price is set in the form of bid
     * @param tokenId Token ID derived from the nft contract
     * @param amount Amount of wei to stake
     */
    function bid(uint256 tokenId, uint256 amount) public payable {
        if (!ifListed(tokenId)) {
            revert DiffusedMarketplace__TokenNotListed();
        }

        if (amount < getMinBid(tokenId)) {
            revert DiffusedMarketplace__InsufficientBidIncrement({
                expected: getMinBid(tokenId),
                received: amount
            });
        }

        Listing memory listing = s_listings[tokenId];

        s_funds[msg.sender] += msg.value;
        uint256 availableFunds = s_funds[msg.sender];

        if (availableFunds < amount) {
            revert DiffusedMarketplace__InsufficientAvailableFunds({
                available: availableFunds,
                required: amount
            });
        }

        if (listing.endDate < block.number) {
            revert DiffusedMarketplace__AuctionClosed();
        }

        // Unlock balance of the previous bidder
        if (listing.lastBid.bidder != address(0)) {
            s_lockedFunds[listing.lastBid.bidder] -= listing.lastBid.amount;
        }

        emit ListingBid(
            tokenId,
            listing.listedAt,
            msg.sender,
            amount,
            block.number
        );

        // Amount is locked, available funds are decreased
        s_lockedFunds[msg.sender] += amount;
        s_funds[msg.sender] -= amount;
        s_listings[tokenId].lastBid = Bid(msg.sender, amount, block.number);
    }

    /**
     * @notice Check if end date has come and finishes exchange
     * or returns nft to the user
     * @dev Everybody will be able to run this function
     * on behalf of others
     * @param tokenId Token ID derived from the nft contract
     */
    function callEndDate(uint256 tokenId) public nonReentrant {
        Listing memory listing = s_listings[tokenId];

        if (!ifListed(tokenId)) {
            revert DiffusedMarketplace__TokenNotListed();
        }

        if (listing.endDate >= block.number) {
            revert DiffusedMarketplace__DurationActive();
        }

        if (listing.lastBid.bidder != address(0)) {
            // Unblock bidder's funds and withdraw it
            s_lockedFunds[listing.lastBid.bidder] -= listing.lastBid.amount;

            // Increase funds of the seller and remove listing with claim
            s_funds[listing.seller] += listing.lastBid.amount;
            delete s_claims[tokenId];
            delete s_listings[tokenId];

            emit ListingClosed(tokenId, listing.listedAt, listing.lastBid);
            i_diffusedNfts.transferFrom(
                address(this),
                listing.lastBid.bidder,
                tokenId
            );
        } else {
            delete s_claims[tokenId];
            delete s_listings[tokenId];

            emit ListingClosed(tokenId, listing.listedAt, listing.lastBid);
            i_diffusedNfts.transferFrom(address(this), listing.seller, tokenId);
        }
    }

    /**
     * @notice Allows user to withdraw their
     * proceeds locked in the  contract
     * @dev Fee of approximately 3.33% is payed for the service
     */
    function withdrawFunds() public nonReentrant {
        if (s_funds[msg.sender] <= 0) {
            revert DiffusedMarketplace__NoProceeds();
        }

        uint256 availableFunds = s_funds[msg.sender];
        uint256 totalFee = availableFunds / 30;
        uint256 finalSum;

        // Set user's funds to zero to prevent double-spending
        s_funds[msg.sender] = 0;

        // If user withdraws proceeds - fee of 3.33% is taken
        if (msg.sender != owner()) {
            s_funds[owner()] += totalFee;
            finalSum = availableFunds - totalFee;
        } else {
            finalSum = availableFunds;
        }

        // Fee of 3.33% gets locked in the contract
        (bool success, ) = address(msg.sender).call{value: finalSum}('');

        if (!success) {
            revert DiffusedMarketplace__WithdrawFailed();
        }
    }

    /**
     * @notice When user makes a bid they must know how much
     * wei they should transfer despite their locked balance. They
     * can always pay the full price with just msg.value, or combine it with their
     * existing balance
     * @param tokenId Token ID derived from the nft contract
     */
    function getAdditionalMsgValue(
        uint256 tokenId
    ) external view returns (int256) {
        if (!ifListed(tokenId)) {
            revert DiffusedMarketplace__TokenNotListed();
        }

        uint256 minBid = getMinBid(tokenId);
        // How much additional wei to send despite funds locked in the contract
        int256 difference = int256(s_funds[msg.sender]) - int256(minBid);

        if (difference < 0) {
            return -difference;
        } else {
            return 0;
        }
    }

    /**
     * @notice Gets minimum bid user must do if they want to stake some value
     * @param tokenId Token ID derived from the nft contract
     */
    function getMinBid(uint256 tokenId) public view returns (uint256) {
        Listing memory listing = s_listings[tokenId];

        // minBid = 100$ * 0.02
        return
            listing.lastBid.amount +
            (listing.lastBid.amount * listing.minimumBidIncrement) /
            100;
    }

    /**
     * @notice Allows user to increase their funds
     * @dev Created primarily for testing :)
     */
    function cashIn() public payable {
        s_funds[msg.sender] += msg.value;
    }

    // Removed due to the absence of need
    function renounceOwnership() public pure override {}

    function getListing(
        uint256 tokenId
    ) external view returns (Listing memory) {
        return s_listings[tokenId];
    }

    function getNftAddress() external view returns (address) {
        return i_diffusedNftsAddress;
    }

    function getFunds(address user) external view returns (uint256) {
        return s_funds[user];
    }

    function getLockedBalance(address user) external view returns (uint256) {
        return s_lockedFunds[user];
    }

    function getClaim(uint256 tokenId) external view returns (address) {
        return s_claims[tokenId];
    }
}

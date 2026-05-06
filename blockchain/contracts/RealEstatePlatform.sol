// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ERC20 Token for each property
contract PropertyToken is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _decimals = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

// Main Platform Contract with Yield Distribution
contract RealEstatePlatform is Ownable {
    struct Property {
        string name;
        uint256 sharePriceWei;
        uint256 totalShares;
        uint256 sharesSold;
        address tokenAddress;
        uint256 totalRentDistributed; 
    }

    Property[] public properties;
    
    // Track investors for each property to allow looping (Simple approach)
    mapping(uint256 => address[]) public propertyInvestors;
    mapping(uint256 => mapping(address => bool)) private isInvestorInProperty;

    // Pending withdrawals for each investor (across all properties)
    mapping(address => uint256) public pendingWithdrawals;

    event PropertyAdded(uint256 propertyId, string name, address tokenAddress);
    event SharePurchased(uint256 propertyId, address buyer, uint256 shares, uint256 totalPaidWei);
    event RentDistributed(uint256 propertyId, uint256 totalAmount);
    event RentClaimed(address user, uint256 amount);

    constructor() Ownable(msg.sender) {
        addProperty("Green Villa", "GRV", 0.01 ether, 100);
        addProperty("Ocean Apartments", "OCA", 0.02 ether, 80);
        addProperty("Downtown Office", "DTO", 0.03 ether, 60);
    }

    function addProperty(
        string memory _name,
        string memory _symbol,
        uint256 _sharePriceWei,
        uint256 _totalShares
    ) public onlyOwner {
        PropertyToken newToken = new PropertyToken(_name, _symbol, 0, address(this));
        
        properties.push(Property({
            name: _name,
            sharePriceWei: _sharePriceWei,
            totalShares: _totalShares,
            sharesSold: 0,
            tokenAddress: address(newToken),
            totalRentDistributed: 0
        }));

        emit PropertyAdded(properties.length - 1, _name, address(newToken));
    }

    /**
     * Distribute rent (ETH) to all investors based on their shares in a property.
     */
    function distributeRent(uint256 propertyId) external payable onlyOwner {
        require(propertyId < properties.length, "Invalid property");
        require(msg.value > 0, "Rent must be > 0");
        
        Property storage p = properties[propertyId];
        address[] memory investors = propertyInvestors[propertyId];
        
        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 userShares = IERC20(p.tokenAddress).balanceOf(investor);
            
            if (userShares > 0) {
                // userShare = (userOwnedShares / totalShares) * totalRent
                uint256 userShare = (userShares * msg.value) / p.totalShares;
                pendingWithdrawals[investor] += userShare;
            }
        }
        
        p.totalRentDistributed += msg.value;
        emit RentDistributed(propertyId, msg.value);
    }

    /**
     * Users call this to withdraw their accumulated rental income.
     */
    function withdrawRent() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No rent to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit RentClaimed(msg.sender, amount);
    }

    function getProperties() external view returns (Property[] memory) {
        return properties;
    }

    function buyShares(uint256 propertyId, uint256 shareCount) external payable {
        require(propertyId < properties.length, "Invalid property");
        Property storage p = properties[propertyId];
        require(p.sharesSold + shareCount <= p.totalShares, "Not enough shares");
        require(msg.value == p.sharePriceWei * shareCount, "Wrong ETH value");

        // Add to investors list if not already there
        if (!isInvestorInProperty[propertyId][msg.sender]) {
            propertyInvestors[propertyId].push(msg.sender);
            isInvestorInProperty[propertyId][msg.sender] = true;
        }

        p.sharesSold += shareCount;
        PropertyToken(p.tokenAddress).mint(msg.sender, shareCount);

        emit SharePurchased(propertyId, msg.sender, shareCount, msg.value);
    }
}

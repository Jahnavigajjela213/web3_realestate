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

    struct Tenant {
        string name;
        uint256 rentAmount;
        uint256 lastPaid;
        bool isActive;
    }

    Property[] public properties;
    mapping(uint256 => Tenant) public tenants;
    
    // Track investors for each property to allow looping
    mapping(uint256 => address[]) public propertyInvestors;
    mapping(uint256 => mapping(address => bool)) private isInvestorInProperty;

    // Pending withdrawals for each investor
    mapping(address => uint256) public pendingWithdrawals;

    event PropertyAdded(uint256 propertyId, string name, address tokenAddress);
    event SharePurchased(uint256 propertyId, address buyer, uint256 shares, uint256 totalPaidWei);
    event RentDistributed(uint256 propertyId, uint256 totalAmount);
    event RentClaimed(address user, uint256 amount);
    event TenantAssigned(uint256 propertyId, string name, uint256 rentAmount);

    constructor() Ownable(msg.sender) {
        addProperty("Manhattan Luxury Suite", "MLS", 0.01 ether, 100);
        addProperty("London Bridge Flat", "LBF", 0.02 ether, 80);
        addProperty("Dubai Marina Penthouse", "DMP", 0.03 ether, 60);
        addProperty("Sydney Coastal Retreat", "SCR", 0.04 ether, 120);
        addProperty("Tokyo Sky Tower", "TST", 0.05 ether, 100);
        addProperty("Berlin Logistics Center", "BLC", 0.06 ether, 100);
        addProperty("Singapore Global Mall", "SGM", 0.07 ether, 100);
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

    // 1. Admin function to assign tenant
    function setTenant(
        uint256 propertyId,
        string memory name,
        uint256 rentAmount
    ) external onlyOwner {
        require(propertyId < properties.length, "Invalid property");
        tenants[propertyId] = Tenant(name, rentAmount, 0, true);
        emit TenantAssigned(propertyId, name, rentAmount);
    }

    // 2. Tenant rent payment function
    function payRent(uint256 propertyId) external payable {
        Tenant storage t = tenants[propertyId];
        require(t.isActive, "No active tenant");
        require(msg.value == t.rentAmount, "Incorrect rent amount");

        t.lastPaid = block.timestamp;
        _distribute(propertyId, msg.value);
    }

    struct TenantPayment {
        uint256 lastPaid;
        uint256 nextDue;
    }

    mapping(uint256 => mapping(address => TenantPayment)) public tenantPayments;

    function payMonthlyRent(uint256 propertyId) external payable {
        require(propertyId < properties.length, "Invalid property");

        Property storage p = properties[propertyId];
        uint256 monthlyRent = p.sharePriceWei;

        require(msg.value >= monthlyRent, "Incorrect rent amount");

        tenantPayments[propertyId][msg.sender].lastPaid = block.timestamp;
        tenantPayments[propertyId][msg.sender].nextDue = block.timestamp + 30 days;

        _distribute(propertyId, msg.value);
    }

    /**
     * Admin: Distribute rent (ETH) manually if needed.
     */
    function distributeRent(uint256 propertyId) external payable onlyOwner {
        require(propertyId < properties.length, "Invalid property");
        require(msg.value > 0, "Rent must be > 0");
        _distribute(propertyId, msg.value);
    }

    // Internal function to handle distribution logic
    function _distribute(uint256 propertyId, uint256 amount) internal {
        Property storage p = properties[propertyId];
        address[] memory investors = propertyInvestors[propertyId];
        
        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 userShares = IERC20(p.tokenAddress).balanceOf(investor);
            
            if (userShares > 0) {
                uint256 userShare = (userShares * amount) / p.totalShares;
                // Direct transfer to investor
                (bool success, ) = payable(investor).call{value: userShare}("");
                // We don't require success here to prevent one failed transfer from blocking everyone else
            }
        }
        
        p.totalRentDistributed += amount;
        emit RentDistributed(propertyId, amount);
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

        if (!isInvestorInProperty[propertyId][msg.sender]) {
            propertyInvestors[propertyId].push(msg.sender);
            isInvestorInProperty[propertyId][msg.sender] = true;
        }

        p.sharesSold += shareCount;
        PropertyToken(p.tokenAddress).mint(msg.sender, shareCount);

        emit SharePurchased(propertyId, msg.sender, shareCount, msg.value);
    }
}

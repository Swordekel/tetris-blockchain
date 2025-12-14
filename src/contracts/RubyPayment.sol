// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RubyPayment
 * @dev Smart contract for Tetris game Ruby top-up payments
 * @notice Supports both native token (MATIC/BNB/ETH) and USDT payments
 */

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract RubyPayment {
    // Owner of the contract (receives payments)
    address public owner;
    
    // USDT token address (set based on network)
    address public usdtToken;
    
    // Payment tracking
    struct Payment {
        address buyer;
        string userId;
        uint8 packageId;
        uint256 amount;
        uint256 rubyAmount;
        uint256 timestamp;
        bool credited;
        PaymentMethod method;
    }
    
    enum PaymentMethod {
        NATIVE,  // ETH/MATIC/BNB
        USDT     // USDT stablecoin
    }
    
    // Ruby packages (price in USD cents, e.g., 10000 = $0.10)
    struct RubyPackage {
        string name;
        uint256 rubyAmount;
        uint256 priceUSD;  // Price in USD cents (100 = $1.00)
        bool active;
    }
    
    // Storage
    mapping(bytes32 => Payment) public payments;
    mapping(uint8 => RubyPackage) public packages;
    bytes32[] public paymentIds;
    
    // Events
    event PaymentReceived(
        bytes32 indexed paymentId,
        address indexed buyer,
        string userId,
        uint8 packageId,
        uint256 amount,
        uint256 rubyAmount,
        PaymentMethod method,
        uint256 timestamp
    );
    
    event PaymentCredited(bytes32 indexed paymentId, string userId, uint256 rubyAmount);
    event PackageUpdated(uint8 packageId, string name, uint256 rubyAmount, uint256 priceUSD);
    event USDTAddressUpdated(address newAddress);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor(address _usdtToken) {
        owner = msg.sender;
        usdtToken = _usdtToken;
        
        // Initialize default packages (matching Midtrans packages)
        packages[0] = RubyPackage("Starter Pack", 100, 10, true);      // $0.10 (Rp 10,000)
        packages[1] = RubyPackage("Popular Pack", 350, 25, true);       // $0.25 (Rp 25,000)
        packages[2] = RubyPackage("Best Value", 750, 50, true);         // $0.50 (Rp 50,000)
        packages[3] = RubyPackage("Mega Pack", 2000, 100, true);        // $1.00 (Rp 100,000)
    }
    
    /**
     * @dev Purchase Ruby with native token (ETH/MATIC/BNB)
     * @param userId User ID from backend
     * @param packageId Package ID (0-3)
     */
    function purchaseWithNative(string memory userId, uint8 packageId) external payable {
        require(packages[packageId].active, "Package not active");
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(bytes(userId).length > 0, "User ID required");
        
        RubyPackage memory pkg = packages[packageId];
        
        // Generate unique payment ID
        bytes32 paymentId = keccak256(abi.encodePacked(
            msg.sender,
            userId,
            packageId,
            block.timestamp,
            block.number
        ));
        
        // Store payment
        payments[paymentId] = Payment({
            buyer: msg.sender,
            userId: userId,
            packageId: packageId,
            amount: msg.value,
            rubyAmount: pkg.rubyAmount,
            timestamp: block.timestamp,
            credited: false,
            method: PaymentMethod.NATIVE
        });
        
        paymentIds.push(paymentId);
        
        // Emit event for backend to listen
        emit PaymentReceived(
            paymentId,
            msg.sender,
            userId,
            packageId,
            msg.value,
            pkg.rubyAmount,
            PaymentMethod.NATIVE,
            block.timestamp
        );
    }
    
    /**
     * @dev Purchase Ruby with USDT
     * @param userId User ID from backend
     * @param packageId Package ID (0-3)
     */
    function purchaseWithUSDT(string memory userId, uint8 packageId) external {
        require(packages[packageId].active, "Package not active");
        require(bytes(userId).length > 0, "User ID required");
        require(usdtToken != address(0), "USDT not configured");
        
        RubyPackage memory pkg = packages[packageId];
        
        // USDT has 6 decimals, price is in USD cents
        // Example: $0.10 = 10 cents = 100000 (10 * 10^4) in USDT smallest unit
        uint256 usdtAmount = pkg.priceUSD * 10**4; // Convert USD cents to USDT units (6 decimals)
        
        // Transfer USDT from buyer to contract
        require(
            IERC20(usdtToken).transferFrom(msg.sender, address(this), usdtAmount),
            "USDT transfer failed"
        );
        
        // Generate unique payment ID
        bytes32 paymentId = keccak256(abi.encodePacked(
            msg.sender,
            userId,
            packageId,
            block.timestamp,
            block.number
        ));
        
        // Store payment
        payments[paymentId] = Payment({
            buyer: msg.sender,
            userId: userId,
            packageId: packageId,
            amount: usdtAmount,
            rubyAmount: pkg.rubyAmount,
            timestamp: block.timestamp,
            credited: false,
            method: PaymentMethod.USDT
        });
        
        paymentIds.push(paymentId);
        
        // Emit event for backend to listen
        emit PaymentReceived(
            paymentId,
            msg.sender,
            userId,
            packageId,
            usdtAmount,
            pkg.rubyAmount,
            PaymentMethod.USDT,
            block.timestamp
        );
    }
    
    /**
     * @dev Mark payment as credited (called by backend after crediting Ruby)
     * @param paymentId The payment ID to mark as credited
     */
    function markAsCredited(bytes32 paymentId) external onlyOwner {
        require(payments[paymentId].timestamp > 0, "Payment not found");
        require(!payments[paymentId].credited, "Already credited");
        
        payments[paymentId].credited = true;
        
        emit PaymentCredited(paymentId, payments[paymentId].userId, payments[paymentId].rubyAmount);
    }
    
    /**
     * @dev Update Ruby package details
     */
    function updatePackage(
        uint8 packageId,
        string memory name,
        uint256 rubyAmount,
        uint256 priceUSD,
        bool active
    ) external onlyOwner {
        packages[packageId] = RubyPackage(name, rubyAmount, priceUSD, active);
        emit PackageUpdated(packageId, name, rubyAmount, priceUSD);
    }
    
    /**
     * @dev Update USDT token address
     */
    function setUSDTAddress(address _usdtToken) external onlyOwner {
        usdtToken = _usdtToken;
        emit USDTAddressUpdated(_usdtToken);
    }
    
    /**
     * @dev Withdraw native tokens (ETH/MATIC/BNB)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Withdraw USDT tokens
     */
    function withdrawUSDT() external onlyOwner {
        require(usdtToken != address(0), "USDT not configured");
        
        uint256 balance = IERC20(usdtToken).balanceOf(address(this));
        require(balance > 0, "No USDT balance to withdraw");
        
        require(
            IERC20(usdtToken).transfer(owner, balance),
            "USDT withdrawal failed"
        );
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    /**
     * @dev Get payment details
     */
    function getPayment(bytes32 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }
    
    /**
     * @dev Get package details
     */
    function getPackage(uint8 packageId) external view returns (RubyPackage memory) {
        return packages[packageId];
    }
    
    /**
     * @dev Get total number of payments
     */
    function getPaymentCount() external view returns (uint256) {
        return paymentIds.length;
    }
    
    /**
     * @dev Get payment ID by index
     */
    function getPaymentIdByIndex(uint256 index) external view returns (bytes32) {
        require(index < paymentIds.length, "Index out of bounds");
        return paymentIds[index];
    }
    
    // Receive function to accept native tokens
    receive() external payable {}
}

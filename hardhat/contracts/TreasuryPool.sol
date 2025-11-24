// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TreasuryPool
 * @notice x402 결제 수신 및 Flock API 비용 자동 결제
 * 
 * 흐름:
 * 1. 사용자 → USDC 서명 기반 결제 → TreasuryPool
 * 2. TreasuryPool → Flock 비용 자동 차감
 * 3. 잔액 관리 및 인출
 */

interface IERC20Permit is IERC20 {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function nonces(address owner) external view returns (uint256);
}

contract TreasuryPool is Ownable, ReentrancyGuard {
    // =============================================================================
    // State Variables
    // =============================================================================

    IERC20 public usdc;
    
    // Flock API 비용 (USDC)
    uint256 public flockCostPerCall = 1e5; // 0.1 USDC (6 decimals)
    
    // 사용자별 누적 잔액
    mapping(address => uint256) public userBalances;
    
    // 사용자별 누적 결제액 (분석용)
    mapping(address => uint256) public userTotalPaid;
    
    // 사용자별 API 호출 횟수
    mapping(address => uint256) public userCallCount;
    
    // Flock 지갑 (API 비용 인출용)
    address public flockWallet;
    
    // Treasury 관리자
    address public treasuryAdmin;
    
    // 누적 Flock 결제액
    uint256 public totalFlockPayments;
    
    // 누적 Treasury 보유액
    uint256 public totalTreasuryBalance;

    // =============================================================================
    // Events
    // =============================================================================

    event PaymentReceived(
        address indexed user,
        uint256 amount,
        uint256 timestamp,
        string reason
    );

    event FlockPaymentMade(
        address indexed user,
        uint256 amount,
        uint256 callCount,
        uint256 timestamp
    );

    event BalanceWithdrawn(
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    event FlockWalletUpdated(address indexed newWallet);
    
    event FlockCostUpdated(uint256 newCost);

    event PermitPayment(
        address indexed user,
        uint256 amount,
        uint256 deadline,
        uint256 timestamp
    );

    // =============================================================================
    // Constructor
    // =============================================================================

    constructor(
        address _usdcAddress,
        address _flockWallet,
        address _treasuryAdmin
    ) Ownable(_treasuryAdmin) {
        require(_usdcAddress != address(0), "Invalid USDC address");
        require(_flockWallet != address(0), "Invalid Flock wallet");
        require(_treasuryAdmin != address(0), "Invalid Treasury admin");

        usdc = IERC20(_usdcAddress);
        flockWallet = _flockWallet;
        treasuryAdmin = _treasuryAdmin;
    }

    // =============================================================================
    // Payment Methods
    // =============================================================================

    /**
     * @notice x402 서명 기반 결제 수신 (Permit 사용)
     * @param user 사용자 주소
     * @param amount 결제액 (USDC wei)
     * @param deadline 서명 유효기간
     * @param v 서명 v
     * @param r 서명 r
     * @param s 서명 s
     */
    function receivePaymentWithPermit(
        address user,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be > 0");

        // EIP-2612 permit를 사용하여 USDC 승인 및 전송
        IERC20Permit(address(usdc)).permit(
            user,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        // 잔액 업데이트
        userBalances[user] += amount;
        userTotalPaid[user] += amount;
        totalTreasuryBalance += amount;

        // USDC 전송
        require(
            usdc.transferFrom(user, address(this), amount),
            "USDC transfer failed"
        );

        emit PaymentReceived(user, amount, block.timestamp, "x402 payment");
        emit PermitPayment(user, amount, deadline, block.timestamp);
    }

    /**
     * @notice 사전 승인된 USDC로 결제 (approve 후 호출)
     * @param user 사용자 주소
     * @param amount 결제액 (USDC wei)
     */
    function receivePayment(address user, uint256 amount) external nonReentrant {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be > 0");

        // 잔액 업데이트
        userBalances[user] += amount;
        userTotalPaid[user] += amount;
        totalTreasuryBalance += amount;

        // USDC 전송
        require(
            usdc.transferFrom(user, address(this), amount),
            "USDC transfer failed"
        );

        emit PaymentReceived(user, amount, block.timestamp, "x402 payment");
    }

    // =============================================================================
    // Flock Cost Management
    // =============================================================================

    /**
     * @notice API 호출 시 Flock 비용 자동 차감
     * @param user 사용자 주소
     * @param callCount 호출 횟수
     * @return success 성공 여부
     */
    function deductFlockCost(address user, uint256 callCount)
        external
        onlyOwner
        nonReentrant
        returns (bool success)
    {
        require(user != address(0), "Invalid user address");
        require(callCount > 0, "Call count must be > 0");

        uint256 totalCost = flockCostPerCall * callCount;
        require(userBalances[user] >= totalCost, "Insufficient balance");

        // 사용자 잔액에서 차감
        userBalances[user] -= totalCost;
        userCallCount[user] += callCount;
        totalFlockPayments += totalCost;

        // Flock 지갑에 전송
        require(usdc.transfer(flockWallet, totalCost), "Flock payment failed");

        emit FlockPaymentMade(user, totalCost, callCount, block.timestamp);
        return true;
    }

    /**
     * @notice 사용자 잔액에서 직접 차감 (백엔드 검증용)
     * @param user 사용자 주소
     * @param amount 차감액 (USDC wei)
     */
    function deductBalance(address user, uint256 amount)
        external
        onlyOwner
        nonReentrant
        returns (bool)
    {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be > 0");
        require(userBalances[user] >= amount, "Insufficient balance");

        userBalances[user] -= amount;
        totalTreasuryBalance -= amount;

        require(usdc.transfer(flockWallet, amount), "Transfer failed");

        emit FlockPaymentMade(user, amount, 0, block.timestamp);
        return true;
    }

    // =============================================================================
    // Query Functions
    // =============================================================================

    /**
     * @notice 사용자의 현재 잔액 조회
     */
    function getBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    /**
     * @notice 사용자의 누적 결제액 조회
     */
    function getTotalPaid(address user) external view returns (uint256) {
        return userTotalPaid[user];
    }

    /**
     * @notice 사용자의 API 호출 횟수 조회
     */
    function getCallCount(address user) external view returns (uint256) {
        return userCallCount[user];
    }

    /**
     * @notice Treasury의 총 보유액 조회
     */
    function getTreasuryBalance() external view returns (uint256) {
        return totalTreasuryBalance;
    }

    /**
     * @notice Flock에 지불한 총액 조회
     */
    function getTotalFlockPayments() external view returns (uint256) {
        return totalFlockPayments;
    }

    /**
     * @notice 특정 호출 횟수의 비용 계산
     */
    function calculateCost(uint256 callCount) external view returns (uint256) {
        return flockCostPerCall * callCount;
    }

    // =============================================================================
    // Admin Functions
    // =============================================================================

    /**
     * @notice Flock 비용 업데이트 (owner만)
     */
    function setFlockCost(uint256 newCost) external onlyOwner {
        require(newCost > 0, "Cost must be > 0");
        flockCostPerCall = newCost;
        emit FlockCostUpdated(newCost);
    }

    /**
     * @notice Flock 지갑 업데이트 (owner만)
     */
    function setFlockWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet");
        flockWallet = newWallet;
        emit FlockWalletUpdated(newWallet);
    }

    /**
     * @notice Treasury 관리자 변경
     */
    function setTreasuryAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "Invalid admin");
        treasuryAdmin = newAdmin;
    }

    /**
     * @notice 사용자 잔액 조정 (관리자용 - 환불 등)
     */
    function adjustBalance(address user, int256 amount) external onlyOwner {
        if (amount > 0) {
            userBalances[user] += uint256(amount);
            totalTreasuryBalance += uint256(amount);
        } else {
            uint256 deductAmount = uint256(-amount);
            require(userBalances[user] >= deductAmount, "Insufficient balance");
            userBalances[user] -= deductAmount;
            totalTreasuryBalance -= deductAmount;
        }
    }

    /**
     * @notice 남은 USDC 인출 (owner만)
     */
    function withdrawUSDC(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(
            usdc.balanceOf(address(this)) >= amount,
            "Insufficient contract balance"
        );

        require(usdc.transfer(msg.sender, amount), "Transfer failed");

        emit BalanceWithdrawn(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice 긴급 USDC 인출
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");

        require(usdc.transfer(owner(), balance), "Transfer failed");

        emit BalanceWithdrawn(owner(), balance, block.timestamp);
    }

    // =============================================================================
    // Receive Function
    // =============================================================================

    receive() external payable {
        revert("This contract does not accept ETH");
    }
}

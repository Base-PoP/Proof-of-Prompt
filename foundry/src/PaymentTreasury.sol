// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Minimal utility contracts (Ownable, Pausable, ReentrancyGuard, ECDSA) and ERC20 interfaces
 * to avoid external dependencies in this offline setup.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC20Permit is IERC20 {
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external;
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() internal {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
    }

    function _nonReentrantAfter() internal {
        _status = _NOT_ENTERED;
    }
}

abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        require(initialOwner != address(0), "Ownable: invalid owner");
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function _onlyOwner() internal view {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

abstract contract Pausable is Ownable {
    bool private _paused;

    event Paused(address account);
    event Unpaused(address account);

    constructor(address initialOwner) Ownable(initialOwner) {
        _paused = false;
    }

    modifier whenNotPaused() {
        _whenNotPaused();
        _;
    }

    modifier whenPaused() {
        _whenPaused();
        _;
    }

    function _whenNotPaused() internal view {
        require(!_paused, "Pausable: paused");
    }

    function _whenPaused() internal view {
        require(_paused, "Pausable: not paused");
    }

    function paused() public view returns (bool) {
        return _paused;
    }

    function _pause() internal whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }

    function _unpause() internal whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }
}

library ECDSA {
    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) revert("ECDSA: invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }
        require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF, "ECDSA: invalid s");
        require(v == 27 || v == 28, "ECDSA: invalid v");
        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0), "ECDSA: invalid signature");
        return signer;
    }

    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32 result) {
        assembly {
            let ptr := mload(0x40)
            // prefix: "\x19Ethereum Signed Message:\n32"
            mstore(ptr, 0x19457468657265756d205369676e6564204d6573736167653a0a333200000000)
            mstore(add(ptr, 0x1c), hash) // prefix(28 bytes) + hash(32 bytes) = 60 bytes
            result := keccak256(ptr, 0x3c)
        }
    }
}

/**
 * @title PaymentTreasury
 * @notice x402 결제(유저 -> 트레저리) 수취 및 오프체인 서명 기반 보상 지급 (주간/업적)
 *         - 결제: permit 또는 allowance 기반 USDC 수취
 *         - 보상: rewardSigner 서명 검증 + nonce 사용으로 중복 방지
 */
contract PaymentTreasury is Pausable, ReentrancyGuard {
    using ECDSA for bytes32;

    IERC20 public acceptedToken;
    address public treasury; // 자금 보관/인출 대상
    address public rewardSigner; // 보상 서명 검증자
    uint256 public pricePerChat; // 결제 단가

    mapping(bytes32 => bool) public nonceUsed; // 보상/지급 공통 nonce 사용 여부

    event Paid(address indexed payer, uint256 amount, bytes32 paymentRef);
    event WeeklyClaimed(uint256 indexed week, uint8 rank, address indexed recipient, uint256 amount, bytes32 nonce);
    event AchievementClaimed(uint256 indexed achievementId, address indexed recipient, uint256 amount, bytes32 nonce);
    event PriceUpdated(uint256 newPrice);
    event TreasuryUpdated(address indexed newTreasury);
    event RewardSignerUpdated(address indexed newSigner);
    event TokensWithdrawn(address indexed to, uint256 amount);
    event PausedStateChanged(bool paused);

    constructor(address _token, address _treasury, address _rewardSigner, uint256 _pricePerChat, address initialOwner)
        Pausable(initialOwner)
    {
        require(_token != address(0), "invalid token");
        require(_treasury != address(0), "invalid treasury");
        acceptedToken = IERC20(_token);
        treasury = _treasury;
        rewardSigner = _rewardSigner;
        pricePerChat = _pricePerChat;
    }

    // =============================================================
    // 결제 (x402)
    // =============================================================

    function payWithPermit(address payer, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external
        whenNotPaused
        nonReentrant
    {
        require(payer != address(0), "invalid payer");
        require(amount == pricePerChat, "invalid amount");

        IERC20Permit(address(acceptedToken)).permit(payer, address(this), amount, deadline, v, r, s);
        require(acceptedToken.transferFrom(payer, address(this), amount), "transfer failed");

        bytes32 paymentRef = _paymentRef(payer, amount);
        emit Paid(payer, amount, paymentRef);
    }

    function payWithAllowance(address payer, uint256 amount) external whenNotPaused nonReentrant {
        require(payer != address(0), "invalid payer");
        require(amount == pricePerChat, "invalid amount");

        require(acceptedToken.transferFrom(payer, address(this), amount), "transfer failed");

        bytes32 paymentRef = _paymentRef(payer, amount);
        emit Paid(payer, amount, paymentRef);
    }

    function _paymentRef(address payer, uint256 amount) internal view returns (bytes32 ref) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, payer)
            mstore(add(ptr, 0x20), amount)
            mstore(add(ptr, 0x40), number())
            mstore(add(ptr, 0x60), timestamp())
            ref := keccak256(ptr, 0x80)
        }
    }

    // =============================================================
    // 보상 지급 (오프체인 서명 검증)
    // =============================================================

    function claimWeekly(
        uint256 week,
        uint8 rank,
        address recipient,
        uint256 amount,
        bytes32 nonce,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        _consumeNonce(nonce);
        require(recipient != address(0), "invalid recipient");
        require(amount > 0, "invalid amount");

        bytes32 digest = keccak256(
                abi.encodePacked("WEEKLY", block.chainid, address(this), week, rank, recipient, amount, nonce)
            ).toEthSignedMessageHash();
        _verifySigner(digest, signature);

        require(acceptedToken.transfer(recipient, amount), "transfer failed");
        emit WeeklyClaimed(week, rank, recipient, amount, nonce);
    }

    function claimAchievement(
        uint256 achievementId,
        address recipient,
        uint256 amount,
        bytes32 nonce,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        _consumeNonce(nonce);
        require(recipient != address(0), "invalid recipient");
        require(amount > 0, "invalid amount");

        bytes32 digest = keccak256(
                abi.encodePacked("ACHIEVEMENT", block.chainid, address(this), achievementId, recipient, amount, nonce)
            ).toEthSignedMessageHash();
        _verifySigner(digest, signature);

        require(acceptedToken.transfer(recipient, amount), "transfer failed");
        emit AchievementClaimed(achievementId, recipient, amount, nonce);
    }

    // =============================================================
    // Admin
    // =============================================================

    function setPricePerChat(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "invalid price");
        pricePerChat = newPrice;
        emit PriceUpdated(newPrice);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setRewardSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "invalid signer");
        rewardSigner = newSigner;
        emit RewardSignerUpdated(newSigner);
    }

    function pause() external onlyOwner {
        _pause();
        emit PausedStateChanged(true);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit PausedStateChanged(false);
    }

    function withdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        address target = to == address(0) ? treasury : to;
        require(target != address(0), "invalid target");
        require(amount > 0, "invalid amount");
        require(acceptedToken.transfer(target, amount), "withdraw failed");
        emit TokensWithdrawn(target, amount);
    }

    // =============================================================
    // Internal
    // =============================================================

    function _consumeNonce(bytes32 nonce) internal {
        require(!nonceUsed[nonce], "nonce used");
        nonceUsed[nonce] = true;
    }

    function _verifySigner(bytes32 digest, bytes calldata signature) internal view {
        address recovered = digest.recover(signature);
        require(recovered == rewardSigner, "invalid signer");
    }
}

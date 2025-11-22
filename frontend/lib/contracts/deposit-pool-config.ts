/**
 * 예치 풀 컨트랙트 설정
 * 
 * 컨트랙트 배포 후 아래 주소를 업데이트하세요
 */

// 컨트랙트 주소 (배포 후 업데이트 필요)
export const DEPOSIT_POOL_ADDRESS = {
  // Base Mainnet
  8453: '0x0000000000000000000000000000000000000000', // TODO: 배포 후 업데이트
  // Base Sepolia (테스트넷)
  84532: '0x0000000000000000000000000000000000000000', // TODO: 배포 후 업데이트
} as const;

/**
 * 예치 풀 컨트랙트 ABI
 * 
 * 컨트랙트에서 구현해야 할 함수들:
 * 
 * 1. deposit() payable - ETH를 예치하고 크레딧 발급
 * 2. withdraw(uint256 amount) - 크레딧을 소각하고 ETH 인출
 * 3. balanceOf(address user) view returns (uint256) - 사용자의 크레딧 잔액 조회
 * 4. getTransactionHistory(address user, uint256 offset, uint256 limit) view returns (Transaction[]) - 트랜잭션 히스토리 조회
 * 
 * 이벤트:
 * - Deposit(address indexed user, uint256 amount, uint256 credits, uint256 timestamp)
 * - Withdraw(address indexed user, uint256 amount, uint256 credits, uint256 timestamp)
 * - CreditUsed(address indexed user, uint256 credits, string reason, uint256 timestamp)
 */
export const DEPOSIT_POOL_ABI = [
  // ========================================
  // Read Functions (view/pure)
  // ========================================
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getTransactionHistory',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      {
        name: 'transactions',
        type: 'tuple[]',
        components: [
          { name: 'txType', type: 'uint8' }, // 0: Deposit, 1: Withdraw, 2: Usage
          { name: 'amount', type: 'uint256' },
          { name: 'credits', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'reason', type: 'string' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getExchangeRate',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'rate', type: 'uint256' }], // 1 ETH = rate credits
  },

  // ========================================
  // Write Functions
  // ========================================
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'useCredits',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'credits', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },

  // ========================================
  // Events
  // ========================================
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'credits', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdraw',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'credits', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CreditUsed',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'credits', type: 'uint256', indexed: false },
      { name: 'reason', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * 트랜잭션 타입 열거형
 */
export enum TransactionType {
  DEPOSIT = 0,
  WITHDRAW = 1,
  USAGE = 2,
}

/**
 * 트랜잭션 타입 정의
 */
export interface DepositPoolTransaction {
  txType: TransactionType;
  amount: bigint;
  credits: bigint;
  timestamp: bigint;
  reason: string;
}


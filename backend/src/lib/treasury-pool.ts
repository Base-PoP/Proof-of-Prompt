/**
 * Treasury Pool 통합 모듈
 * 
 * 백엔드에서 Treasury Pool 스마트 컨트랙트와 상호작용
 */

import { ethers } from 'ethers';

// Treasury Pool 컨트랙트 ABI (deductFlockCost 함수 포함)
export const TREASURY_POOL_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'callCount', type: 'uint256' },
    ],
    name: 'deductFlockCost',
    outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'callCount', type: 'uint256' }],
    name: 'calculateCost',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'userBalances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export interface TreasuryConfig {
  treasuryPoolAddress: string;
  rpcUrl: string;
  privateKey?: string; // 트랜잭션 서명용 (백엔드 지갑)
}

export class TreasuryPoolClient {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(config: TreasuryConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // 읽기 전용 모드
    this.contract = new ethers.Contract(
      config.treasuryPoolAddress,
      TREASURY_POOL_ABI,
      this.provider
    );

    // 트랜잭션 서명이 필요한 경우
    if (config.privateKey) {
      const wallet = new ethers.Wallet(config.privateKey, this.provider);
      this.signer = wallet;
      this.contract = this.contract.connect(wallet);
    }
  }

  /**
   * 사용자의 Treasury 잔액 조회
   */
  async getUserBalance(userAddress: string): Promise<bigint> {
    try {
      const balance = await this.contract.getBalance(userAddress);
      return balance;
    } catch (error) {
      console.error('Failed to get user balance:', error);
      throw error;
    }
  }

  /**
   * 특정 호출 횟수의 비용 계산
   */
  async calculateCost(callCount: number): Promise<bigint> {
    try {
      const cost = await this.contract.calculateCost(callCount);
      return cost;
    } catch (error) {
      console.error('Failed to calculate cost:', error);
      throw error;
    }
  }

  /**
   * Flock 비용 자동 차감 (트랜잭션)
   * @param userAddress 사용자 주소
   * @param callCount 호출 횟수
   * @returns 트랜잭션 해시
   */
  async deductFlockCost(
    userAddress: string,
    callCount: number
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer not configured. Set privateKey in config.');
    }

    try {
      const tx = await this.contract.deductFlockCost(userAddress, callCount);
      const receipt = await tx.wait();

      if (!receipt?.transactionHash) {
        throw new Error('Transaction failed');
      }

      return receipt.transactionHash;
    } catch (error) {
      console.error('Failed to deduct Flock cost:', error);
      throw error;
    }
  }

  /**
   * 결제 필요 여부 확인
   * @param userAddress 사용자 주소
   * @param callCount 호출 횟수
   * @returns true if balance >= cost
   */
  async canAfford(userAddress: string, callCount: number): Promise<boolean> {
    try {
      const balance = await this.getUserBalance(userAddress);
      const cost = await this.calculateCost(callCount);
      return balance >= cost;
    } catch (error) {
      console.error('Failed to check affordability:', error);
      return false;
    }
  }

  /**
   * 사용자 잔액 조회 (Human readable format)
   */
  async getUserBalanceFormatted(userAddress: string): Promise<string> {
    try {
      const balance = await this.getUserBalance(userAddress);
      return ethers.formatUnits(balance, 6); // USDC는 6 decimals
    } catch (error) {
      console.error('Failed to get formatted balance:', error);
      throw error;
    }
  }
}

/**
 * 싱글톤 인스턴스 생성 (선택사항)
 */
let treasuryClient: TreasuryPoolClient | null = null;

export function initTreasuryPool(config: TreasuryConfig): TreasuryPoolClient {
  treasuryClient = new TreasuryPoolClient(config);
  return treasuryClient;
}

export function getTreasuryPool(): TreasuryPoolClient {
  if (!treasuryClient) {
    throw new Error('Treasury Pool not initialized. Call initTreasuryPool first.');
  }
  return treasuryClient;
}

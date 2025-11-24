# Foundry 기반 컨트랙트 작성·배포 가이드

`IMPLEMENTATION_PLAN.md`의 제안 구조에 맞춰 트레저리 컨트랙트를 작성하고, Foundry로 빌드·테스트·배포하는 절차를 정리했습니다. 모든 명령은 `/mnt/d/Develop/Lmarena/foundry` 기준으로 실행합니다.

## 준비물
- Rust toolchain(Foundry 설치용), `curl`
- RPC 엔드포인트: 테스트넷(Base Sepolia 등)과 메인넷 중 선택
- 배포자 프라이빗 키, 수수료 지불용 ETH
- 환경 변수: `PRIVATE_KEY`, `RPC_URL`, `USDC_ADDRESS`, `TREASURY_ADDRESS`, `REWARD_SIGNER`, `PRICE_PER_CHAT`

## 베이스 세폴리아 배포 환경(.env 예시)
`foundry/.env` 등에 다음 값을 정의하고 배포 전에 `source foundry/.env`로 불러옵니다.
```
PRIVATE_KEY=0x...            # 배포 지갑 프라이빗 키(테스트넷 전용)
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
USDC_ADDRESS=0x...           # 베이스 세폴리아 USDC (테스트 토큰 주소)
TREASURY_ADDRESS=0x...       # 수령 지갑 주소
REWARD_SIGNER=0x...          # 보상 서명자
PRICE_PER_CHAT=1000000       # 예시: 6 decimals USDC 기준 1.0 USDC
EXPLORER_API_KEY=...         # 선택: BaseScan(세폴리아) API 키
```
지갑 준비: 프라이빗 키는 테스트용으로 별도 생성하고, Base Sepolia faucet 등을 통해 ETH를 충전합니다. 배포·검증 명령 시 위 값을 사용합니다.

## Foundry 설치 & 기본 설정
1) Foundry 설치
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```
2) 프로젝트 설정 파일 생성(없을 경우)
```bash
cat > foundry.toml <<'EOF'
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
test = "test"
solc_version = "0.8.20"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200
[fuzz]
runs = 128
EOF
```
3) 의존성 설치가 필요하면 `forge install OpenZeppelin/openzeppelin-contracts`처럼 `lib/`에 추가합니다(현재 PaymentTreasury는 내장 유틸 사용).

## 컨트랙트 작성 가이드(제안 구조 반영)
`src/PaymentTreasury.sol`에 다음 구성을 유지·확장합니다.
- **상태**: `acceptedToken(USDC)`, `treasury`, `pricePerChat`, `rewardSigner`, `nonceUsed[bytes32]`, `paused`
- **결제**: `payWithPermit`(EIP-2612), `payWithAllowance`, `Paid` 이벤트
- **주간 보상**: `claimWeekly(week, rank, recipient, amount, nonce, sig)`, `WeeklyClaimed`
- **업적 보상**: `claimAchievement(achievementId, recipient, amount, nonce, sig)`, `AchievementClaimed`
- **운영 함수**: `setPrice`, `setTreasury`, `setRewardSigner`, `pause/unpause`, `withdraw`
- **검증**: `nonceUsed` 중복 방지, `ECDSA` 서명 검증, `nonReentrant`, `whenNotPaused/whenPaused`

추가/변경 시 테스트를 함께 작성하며, 가스 절약이 필요하면 `calldata` 활용과 이벤트 최소화를 고려합니다.

## 로컬 빌드·테스트
```bash
cd /mnt/d/Develop/Lmarena/foundry
forge build        # 컴파일
forge fmt          # 포매팅
forge test         # 단위 테스트 (테스트 작성 후)
forge coverage     # 커버리지 필요 시
```
테스트 작성 위치: `test/PaymentTreasury.t.sol` 등. 시나리오: 금액 불일치, permit 만료, nonce 재사용, 보상 서명 위조, pause 상태, withdraw 권한 등.

## 배포 스크립트 예시
`script/Deploy.s.sol`(없으면 생성)에 배포 로직을 작성합니다.
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Script} from "forge-std/Script.sol";
import {PaymentTreasury} from "../src/PaymentTreasury.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        new PaymentTreasury(
            vm.envAddress("USDC_ADDRESS"),
            vm.envAddress("TREASURY_ADDRESS"),
            vm.envAddress("REWARD_SIGNER"),
            vm.envUint("PRICE_PER_CHAT"),
            msg.sender // initialOwner
        );
        vm.stopBroadcast();
    }
}
```
실행 명령(테스트넷 예시):
```bash
source ../.env             # PRIVATE_KEY, RPC_URL 등 로드
forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --verify --etherscan-api-key "$EXPLORER_API_KEY"   # 검증 필요 시
```
`anvil`로 로컬 실행 시 `--rpc-url http://127.0.0.1:8545 --broadcast`만 지정합니다.

### Base Sepolia 배포 명령어(실행 예시)
```
cd /mnt/d/Develop/Lmarena/foundry
source .env
forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --chain-id "$CHAIN_ID" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --verify --etherscan-api-key "$EXPLORER_API_KEY"
```
검증이 불필요하면 `--verify --etherscan-api-key ...`를 생략합니다.

## 체크리스트
- [ ] `foundry build/test` 성공
- [ ] 배포 주소·ABI를 `docs/PROJECT_INFO.md` 또는 백엔드/프론트 설정에 반영
- [ ] `.env.example`, `frontend/env.template`에 새 변수 추가
- [ ] 주간/업적 보상 서명 생성 로직을 백엔드에 연동하고 `nonceUsed`를 온체인에서 소모하도록 확인

# 🚀 Treasury Pool 배포 가이드

## 📋 전제 조건
- Private Key 준비 (MetaMask에서 내보내기)
- Basescan API Key (컨트랙트 검증용)
- Base Sepolia 테스트넷에 약간의 ETH (가스비)

## 🔧 Step 1: 환경 설정

`.env` 파일 수정:

```bash
# Private Key (0x 제외한 64자)
HARDHAT_PRIVATE_KEY=your_private_key_without_0x

# Basescan API Key (선택사항이지만 권장)
BASESCAN_API_KEY=your_basescan_api_key

# Flock 지갑 주소 (API 비용 수신용)
FLOCK_WALLET=0x_your_flock_wallet_address

# Treasury 관리자 (계약 소유권)
TREASURY_ADMIN=0x_your_admin_address
```

## 🔐 Private Key 얻기

### MetaMask에서:
1. 계정 메뉴 → "계정 세부정보"
2. "비공개 키 내보내기"
3. 비밀번호 입력
4. 긴 16진수 문자열 복사 (0x 포함)

### 또는 Hardhat 테스트 지갑 사용:
```bash
npx hardhat run scripts/generate-account.ts
```

## 📝 Step 2: 배포 스크립트 검토

`scripts/deploy-treasury.ts` 파일 확인:
- 올바른 네트워크 선택 (baseSepolia 테스트)
- USDC 주소 확인 (현재: Sepolia USDC)
- Flock 지갑 주소 확인

## 🚀 Step 3: 배포 실행

### Base Sepolia 테스트넷 배포:
```bash
npm run deploy:sepolia
```

**또는 수동으로:**
```bash
npx hardhat run scripts/deploy-treasury.ts --network baseSepolia
```

### Base Mainnet 배포 (프로덕션):
```bash
npm run deploy:mainnet
```

## 📊 배포 결과 확인

배포 완료 후 출력 예시:
```
🚀 Treasury Pool 배포 시작...

📍 배포자: 0x_your_address
🌐 네트워크: baseSepolia (Chain ID: 84532)

⚙️  설정 정보:
   USDC: 0xA449bc031fA0b815cA14fAFD0c5EdB75ccD9c80f
   Flock Wallet: 0x_flock_address
   Treasury Admin: 0x_admin_address

⏳ Treasury Pool 컨트랙트 배포 중...
✅ Treasury Pool 배포 완료!
📍 주소: 0x_treasury_pool_address

💾 배포 정보 저장:
   📄 deployments/baseSepolia-treasury.json

🔍 컨트랙트 검증을 위한 정보:
   컨트랙트 주소: 0x_treasury_pool_address
   생성자 인자:
   - USDC: 0xA449bc031fA0b815cA14fAFD0c5EdB75ccD9c80f
   - Flock Wallet: 0x_flock_address
   - Treasury Admin: 0x_admin_address
```

## ⚙️ Step 4: .env 업데이트

배포 완료 후 출력된 주소를 `.env` 파일에 추가:

```bash
# 배포된 컨트랙트 주소
TREASURY_POOL_ADDRESS=0x_treasury_pool_address
TREASURY_POOL_NETWORK=baseSepolia
TREASURY_POOL_CHAIN_ID=84532
```

## ✅ Step 5: 컨트랙트 검증 (Basescan)

```bash
npx hardhat verify --network baseSepolia TREASURY_POOL_ADDRESS \
  "0xA449bc031fA0b815cA14fAFD0c5EdB75ccD9c80f" \
  "0xFLOCK_WALLET_ADDRESS" \
  "0xTREASURY_ADMIN_ADDRESS"
```

## 🧪 Step 6: 배포 테스트

### 1) Balance 조회 테스트:
```bash
node -e "
const ethers = require('ethers');
const abi = require('./artifacts/contracts/TreasuryPool.sol/TreasuryPool.json').abi;
const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const contract = new ethers.Contract('0x_treasury_pool_address', abi, provider);
contract.getBalance('0x_user_address').then(console.log);
"
```

### 2) Backend 통합 테스트:
```bash
cd backend
npm install ethers  # 아직 설치 안 됨
npm run dev
```

API 호출 시 x402 payment flow 동작 확인

## 🐛 트러블슈팅

### "insufficient gas" 오류
```
Base Sepolia에서 더 많은 ETH 필요
Sepolia Faucet: https://www.sepoliafaucet.io
```

### "private key error" 오류
```
.env에서 HARDHAT_PRIVATE_KEY 형식 확인
- "0x" 제외한 64자의 16진수
- 공백이나 줄바꿈 없음
```

### 컨트랙트 검증 실패
```
1. Basescan API Key 확인
2. 배포 후 최소 1분 대기
3. 정확한 constructor 인자 사용
```

## 📚 추가 리소스

- **Basescan**: https://sepolia.basescan.org
- **Base 문서**: https://docs.base.org
- **Hardhat 가이드**: https://hardhat.org/docs
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts

## ✨ 다음 단계

배포 완료 후:

1. ✅ Treasury Pool 주소 .env에 추가
2. ✅ Backend에서 ethers.js 설치
3. ✅ x402-verification.ts 에서 서명 검증 활성화
4. ✅ Frontend에서 x402 결제 흐름 테스트
5. ✅ End-to-End 테스트 (사용자 → Treasury → Flock)

---

**질문이나 문제가 있으시면 docs/X402_QUICK_START.md를 참고하세요.**

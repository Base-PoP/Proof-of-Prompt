import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Base Sepolia USDC 주소
const USDC_BASE_SEPOLIA = "0xA449bc031fA0b815cA14fAFD0c5EdB75ccD9c80f";
const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  console.log("🚀 Treasury Pool 배포 시작...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📍 배포자: ${deployer.address}`);

  // 네트워크 확인
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 네트워크: ${network.name} (Chain ID: ${network.chainId})\n`);

  // 설정값
  const usdcAddress = network.chainId === 84532 ? USDC_BASE_SEPOLIA : USDC_BASE_MAINNET;
  const flockWallet = process.env.FLOCK_WALLET || deployer.address;
  const treasuryAdmin = process.env.TREASURY_ADMIN || deployer.address;

  console.log("⚙️  설정 정보:");
  console.log(`   USDC: ${usdcAddress}`);
  console.log(`   Flock Wallet: ${flockWallet}`);
  console.log(`   Treasury Admin: ${treasuryAdmin}\n`);

  // Treasury Pool 컨트랙트 배포
  console.log("⏳ Treasury Pool 컨트랙트 배포 중...");
  const TreasuryPool = await ethers.getContractFactory("TreasuryPool");
  const treasury = await TreasuryPool.deploy(usdcAddress, flockWallet, treasuryAdmin);

  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();

  console.log(`✅ Treasury Pool 배포 완료!`);
  console.log(`📍 주소: ${treasuryAddress}\n`);

  // 배포 정보 저장
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),  // BigInt를 Number로 변환
    treasuryPool: treasuryAddress,
    usdc: usdcAddress,
    flockWallet: flockWallet,
    treasuryAdmin: treasuryAdmin,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  // JSON 파일로 저장
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}-treasury.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("💾 배포 정보 저장:");
  console.log(`   📄 ${deploymentFile}\n`);

  // 컨트랙트 검증 정보 출력
  console.log("🔍 컨트랙트 검증을 위한 정보:");
  console.log(`   컨트랙트 주소: ${treasuryAddress}`);
  console.log(`   생성자 인자:`);
  console.log(`   - USDC: ${usdcAddress}`);
  console.log(`   - Flock Wallet: ${flockWallet}`);
  console.log(`   - Treasury Admin: ${treasuryAdmin}\n`);

  // .env 업데이트 제안
  console.log("📝 .env 파일에 다음을 추가하세요:");
  console.log(`\nTREASURY_POOL_ADDRESS=${treasuryAddress}`);
  console.log(`TREASURY_POOL_NETWORK=${network.name}`);
  console.log(`TREASURY_POOL_CHAIN_ID=${network.chainId}\n`);

  // 초기 설정 (선택사항)
  if (process.env.SETUP_INITIAL_COST === "true") {
    console.log("⚙️  초기 Flock 비용 설정 중...");
    const tx = await treasury.setFlockCost(ethers.parseUnits("0.1", 6)); // 0.1 USDC
    await tx.wait();
    console.log(`✅ Flock 비용 설정 완료: 0.1 USDC\n`);
  }

  console.log("✨ 배포가 완료되었습니다!\n");
  console.log("다음 단계:");
  console.log("1. 배포 정보를 .env에 추가");
  console.log("2. Basescan에서 컨트랙트 검증");
  console.log("3. treasury.getBalance(userAddress) 테스트\n");

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 배포 오류:", error);
    process.exit(1);
  });

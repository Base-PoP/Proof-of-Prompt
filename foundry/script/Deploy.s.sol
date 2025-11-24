// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {PaymentTreasury} from "../src/PaymentTreasury.sol";

/**
 * Base Sepolia 배포 스크립트.
 * 필요한 env:
 *  - PRIVATE_KEY: 배포 지갑 프라이빗 키(테스트넷 전용)
 *  - USDC_ADDRESS, TREASURY_ADDRESS, REWARD_SIGNER, PRICE_PER_CHAT
 * 실행 예시:
 *  forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify --etherscan-api-key $EXPLORER_API_KEY
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        new PaymentTreasury(
            vm.envAddress("USDC_ADDRESS"),
            vm.envAddress("TREASURY_ADDRESS"),
            vm.envAddress("REWARD_SIGNER"),
            vm.envUint("PRICE_PER_CHAT"),
            vm.addr(deployerKey)
        );
        vm.stopBroadcast();
    }
}

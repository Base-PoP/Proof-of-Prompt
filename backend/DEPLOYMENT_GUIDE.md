# AWS EC2 배포 가이드 - LM Arena Backend

## 목차
1. [사전 요구사항](#1-사전-요구사항)
2. [AWS 인프라 설정](#2-aws-인프라-설정)
3. [EC2 인스턴스 설정](#3-ec2-인스턴스-설정)
4. [PostgreSQL 데이터베이스 설정](#4-postgresql-데이터베이스-설정)
5. [애플리케이션 배포](#5-애플리케이션-배포)
6. [프로세스 관리 (PM2)](#6-프로세스-관리-pm2)
7. [Nginx 리버스 프록시 설정](#7-nginx-리버스-프록시-설정)
8. [SSL 인증서 설정](#8-ssl-인증서-설정)
9. [모니터링 및 로깅](#9-모니터링-및-로깅)
10. [트러블슈팅](#10-트러블슈팅)

---

## 1. 사전 요구사항

### 필요한 계정 및 키
- [ ] AWS 계정
- [ ] Alchemy API 키 (Base Sepolia RPC용)
- [ ] Flock AI API 키
- [ ] Base Sepolia 테스트넷 지갑 (ETH 보유)

### 필요한 환경 변수
```env
# 데이터베이스
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/Proof-of-Prompt?schema=public"
PORT=4000

# 블록체인 설정 (Base Sepolia)
CHAIN_ID=84532
RPC_URL="https://base-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
USDC_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
PAY_TO_ADDRESS="0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6"

# 결제 시스템
FACILITATOR_PRIVATE_KEY="your_facilitator_wallet_private_key"
REWARD_SIGNER_PRIVATE_KEY="your_reward_signer_private_key"
X402_ENABLED=true

# AI API
FLOCK_API_KEY="sk-xxxxxxxxxxxxxxxx"
USE_MOCK=false

# 주간 보상 설정
WEEKLY_REWARD_INTERVAL_SEC=604800
WEEKLY_REWARD_AMOUNTS=5000000,3000000,1000000
ENABLE_WEEKLY_REWARD_JOB=true

# Treasury Pool (스마트 컨트랙트 배포 후 업데이트)
TREASURY_POOL_ADDRESS="0x..."
TREASURY_POOL_RPC_URL="https://base-sepolia.g.alchemy.com/v2/YOUR_KEY"
```

---

## 2. AWS 인프라 설정

### 2.1 VPC 및 서브넷 (기존 VPC 사용 가능)
```
VPC CIDR: 10.0.0.0/16
Public Subnet: 10.0.1.0/24 (EC2용)
Private Subnet: 10.0.2.0/24 (RDS용)
```

### 2.2 Security Group 생성

#### EC2 Security Group (`Proof-of-Prompt-backend-sg`)
| 유형 | 프로토콜 | 포트 | 소스 | 설명 |
|------|----------|------|------|------|
| SSH | TCP | 22 | Your IP | SSH 접속 |
| HTTP | TCP | 80 | 0.0.0.0/0 | Nginx |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Nginx SSL |
| Custom TCP | TCP | 4000 | 10.0.0.0/16 | 내부 API (선택) |

#### RDS Security Group (`Proof-of-Prompt-rds-sg`)
| 유형 | 프로토콜 | 포트 | 소스 | 설명 |
|------|----------|------|------|------|
| PostgreSQL | TCP | 5432 | Proof-of-Prompt-backend-sg | EC2에서만 접근 |

### 2.3 IAM 역할 생성 (선택사항)
Secrets Manager 사용 시:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:ap-northeast-2:*:secret:Proof-of-Prompt/*"
    }
  ]
}
```

---

## 3. EC2 인스턴스 설정

### 3.1 인스턴스 생성
- **AMI**: Amazon Linux 2023 또는 Ubuntu 22.04 LTS
- **인스턴스 타입**: t3.small (최소) / t3.medium (권장)
- **스토리지**: 20GB gp3
- **키 페어**: 새로 생성 또는 기존 키 사용

### 3.2 EC2 접속 및 기본 설정

```bash
# SSH 접속
ssh -i "your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP

# 시스템 업데이트
sudo yum update -y  # Amazon Linux
# 또는
sudo apt update && sudo apt upgrade -y  # Ubuntu
```

### 3.3 Node.js 설치 (v18+)

**Amazon Linux 2023:**
```bash
# Node.js 18 설치
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 버전 확인
node -v  # v18.x.x
npm -v
```

**Ubuntu 22.04:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3.4 Git 설치
```bash
sudo yum install -y git  # Amazon Linux
# 또는
sudo apt install -y git  # Ubuntu
```

---

## 4. PostgreSQL 데이터베이스 설정

### 옵션 A: AWS RDS 사용 (권장)

#### RDS 인스턴스 생성
1. AWS Console → RDS → Create database
2. 설정:
   - **엔진**: PostgreSQL 15
   - **템플릿**: Free tier 또는 Production
   - **인스턴스**: db.t3.micro (테스트) / db.t3.small (프로덕션)
   - **스토리지**: 20GB gp2
   - **DB 이름**: `Proof of Prompt`
   - **마스터 사용자**: `postgres`
   - **VPC**: EC2와 동일한 VPC
   - **퍼블릭 액세스**: No
   - **Security Group**: `proof-of-prompt-rds-sg`

3. 생성 후 엔드포인트 확인:
   ```
   proof-of-prompt.xxxxxxxxxxxx.ap-northeast-2.rds.amazonaws.com
   ```

4. DATABASE_URL 형식:
   ```
   postgresql://postgres:YOUR_PASSWORD@Proof-of-Prompt-db.xxxxxxxxxxxx.ap-northeast-2.rds.amazonaws.com:5432/Proof-of-Prompt?schema=public
   ```

### 옵션 B: EC2에 PostgreSQL 직접 설치

```bash
# PostgreSQL 설치
sudo yum install -y postgresql15-server postgresql15  # Amazon Linux
# 또는
sudo apt install -y postgresql postgresql-contrib  # Ubuntu

# 초기화 및 시작
sudo postgresql-setup --initdb  # Amazon Linux
sudo systemctl start postgresql
sudo systemctl enable postgresql

# postgres 사용자로 전환
sudo -u postgres psql

# 데이터베이스 및 사용자 생성
CREATE DATABASE "Proof-of-Prompt";
CREATE USER "PoP_user" WITH ENCRYPTED PASSWORD 'PoP123!';
GRANT ALL PRIVILEGES ON DATABASE "Proof-of-Prompt" TO "PoP_user";
\q

# pg_hba.conf 수정 (로컬 접속 허용)
sudo vim /var/lib/pgsql/data/pg_hba.conf
# local all all md5 로 변경

sudo systemctl restart postgresql
```

---

## 5. 애플리케이션 배포

### 5.1 애플리케이션 디렉토리 생성
```bash
sudo mkdir -p /var/www/proof-of-prompt
sudo chown $USER:$USER /var/www/proof-of-prompt
cd /var/www/proof-of-prompt
```

### 5.2 소스 코드 가져오기

**방법 A: Git Clone**
```bash
git clone https://github.com/Base-PoP/Proof-of-Prompt.git .
cd backend
```

**방법 B: 직접 업로드 (SCP)**
```bash
# 로컬에서 실행
scp -i "your-key.pem" -r ./backend ec2-user@YOUR_EC2_IP:/var/www/proof-of-prompt/
```

### 5.3 의존성 설치
```bash
cd /var/www/proof-of-prompt/backend
npm ci  # package-lock.json 기반 설치 (권장)
# 또는
npm install
```

### 5.4 환경 변수 설정
```bash
# .env 파일 생성
nano .env
```

```env
DATABASE_URL="postgresql://PoP_user:PoP123!@localhost:5432/Proof-of-Prompt?schema=public"
PORT=4000

CHAIN_ID=84532
RPC_URL="https://base-sepolia.g.alchemy.com/v2/iBOJAoFZt9o_-w_JdylJf"
USDC_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
PAY_TO_ADDRESS="0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6" # Treasury/router when ready
FACILITATOR_PRIVATE_KEY="0x1774fc2875e5a84a77f82298843ff1662a124b11bcb07a3381e553d9f634e4c3" # Payment broadcaster key
REWARD_SIGNER_PRIVATE_KEY="0x1774fc2875e5a84a77f82298843ff1662a124b11bcb07a3381e553d9f634e4c3"
REWARD_SIGNER="0x038f9eff208f4cefc0a7f856739a3405c419a147"

FLOCK_API_KEY="sk-FvHR-hTvfL8b-bwwh0WFTA"
USE_MOCK=false

WEEKLY_REWARD_INTERVAL_SEC=86400
WEEKLY_REWARD_AMOUNTS=50000,30000,10000
```

```bash
# 파일 권한 보안
chmod 600 .env
```

### 5.5 데이터베이스 마이그레이션
```bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 스키마 적용
npx prisma db push

# 초기 데이터 시딩 (선택)
npx prisma db seed
```

### 5.6 애플리케이션 빌드
```bash
npm run build
```

### 5.7 테스트 실행
```bash
# 테스트 실행
npm start

# 다른 터미널에서 헬스 체크
curl http://localhost:4000/health
# 응답: {"ok":true}
```

---

## 6. 프로세스 관리 (PM2)

### 6.1 PM2 설치
```bash
sudo npm install -g pm2
```

### 6.2 애플리케이션 시작
```bash
cd /var/www/proof-of-prompt/backend

# PM2로 시작
pm2 start dist/index.js --name "proof-of-prompt-backend"

# 로그 확인
pm2 logs Proof-of-Prompt-backend

# 상태 확인
pm2 status
```

### 6.3 PM2 자동 시작 설정
```bash
# 시작 스크립트 생성
pm2 startup

# 현재 프로세스 목록 저장
pm2 save
```

### 6.4 PM2 ecosystem 파일 (선택)
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'Proof-of-Prompt-backend',
    script: 'dist/index.js',
    cwd: '/var/www/Proof-of-Prompt/backend',
    instances: 1,  // 주간 보상 작업 때문에 1개만 권장
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/var/log/pm2/Proof-of-Prompt-error.log',
    out_file: '/var/log/pm2/Proof-of-Prompt-out.log',
    merge_logs: true,
    time: true
  }]
};
```

```bash
# ecosystem 파일로 시작
pm2 start ecosystem.config.js
```

---

## 7. Nginx 리버스 프록시 설정

### 7.1 Nginx 설치
```bash
sudo yum install -y nginx  # Amazon Linux
# 또는
sudo apt install -y nginx  # Ubuntu
```

### 7.2 Nginx 설정
```bash
sudo nano /etc/nginx/conf.d/Proof-of-Prompt.conf
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # 또는 EC2 퍼블릭 IP

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE (Server-Sent Events) 지원
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    # 헬스 체크
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
    }
}
```

### 7.3 Nginx 시작
```bash
# 설정 테스트
sudo nginx -t

# Nginx 시작
sudo systemctl start nginx
sudo systemctl enable nginx

# 상태 확인
sudo systemctl status nginx
```

---

## 8. SSL 인증서 설정 (Let's Encrypt)

### 8.1 Certbot 설치
```bash
# Amazon Linux 2023
sudo yum install -y certbot python3-certbot-nginx

# Ubuntu
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 인증서 발급
```bash
sudo certbot --nginx -d api.yourdomain.com
```

### 8.3 자동 갱신 설정
```bash
# 갱신 테스트
sudo certbot renew --dry-run

# 크론탭에 자동 갱신 추가 (보통 자동으로 설정됨)
sudo crontab -e
# 추가: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 9. 모니터링 및 로깅

### 9.1 PM2 모니터링
```bash
# 실시간 모니터링
pm2 monit

# 로그 확인
pm2 logs Proof-of-Prompt-backend --lines 100
```

### 9.2 CloudWatch 에이전트 설치 (선택)
```bash
# CloudWatch 에이전트 설치
sudo yum install -y amazon-cloudwatch-agent

# 설정 파일 생성
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### 9.3 로그 로테이션
```bash
sudo nano /etc/logrotate.d/pm2-Proof-of-Prompt
```

```
/var/log/pm2/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 ec2-user ec2-user
}
```

---

## 10. 트러블슈팅

### 일반적인 문제들

#### 1. 데이터베이스 연결 실패
```bash
# RDS 연결 테스트
psql -h YOUR_RDS_ENDPOINT -U postgres -d Proof-of-Prompt

# Security Group 확인
# - EC2 SG가 RDS SG의 인바운드에 있는지 확인
```

#### 2. 포트 4000 접근 불가
```bash
# 프로세스 확인
pm2 status
netstat -tlnp | grep 4000

# 방화벽 확인
sudo iptables -L -n
```

#### 3. Prisma 클라이언트 오류
```bash
# Prisma 재생성
npx prisma generate

# 캐시 정리 후 재설치
rm -rf node_modules
npm ci
npx prisma generate
```

#### 4. 메모리 부족
```bash
# 메모리 확인
free -h

# Swap 추가 (필요시)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 5. PM2 재시작 후 앱 미실행
```bash
# PM2 프로세스 저장
pm2 save

# 부팅 시 자동 시작 설정 확인
pm2 startup
```

### 유용한 명령어 모음
```bash
# 애플리케이션 재시작
pm2 restart Proof-of-Prompt-backend

# 애플리케이션 중지
pm2 stop Proof-of-Prompt-backend

# 로그 실시간 확인
pm2 logs Proof-of-Prompt-backend -f

# Nginx 재시작
sudo systemctl restart nginx

# 데이터베이스 상태 확인
npx prisma db pull
npx prisma studio  # 웹 GUI (개발용)

# 디스크 사용량 확인
df -h

# CPU/메모리 사용량
htop
```

---

## 배포 체크리스트

- [ ] EC2 인스턴스 생성 및 SSH 접속
- [ ] Node.js 18+ 설치
- [ ] PostgreSQL (RDS) 설정 및 연결 확인
- [ ] 소스 코드 배포
- [ ] `npm ci` 의존성 설치
- [ ] `.env` 환경 변수 설정
- [ ] `npx prisma generate` 실행
- [ ] `npx prisma db push` 마이그레이션
- [ ] `npm run build` 빌드
- [ ] PM2로 애플리케이션 시작
- [ ] `pm2 startup` 및 `pm2 save`
- [ ] Nginx 설치 및 설정
- [ ] SSL 인증서 발급 (도메인 있을 경우)
- [ ] 헬스 체크 확인: `curl https://api.yourdomain.com/health`
- [ ] Frontend `.env`에 `NEXT_PUBLIC_API_URL` 업데이트

---

## 업데이트 배포 절차

```bash
cd /var/www/proof-of-prompt/backend

# 1. 소스 코드 업데이트
git pull origin main

# 2. 의존성 업데이트 (필요시)
npm ci

# 3. Prisma 클라이언트 재생성
npx prisma generate

# 4. 마이그레이션 (스키마 변경시)
npx prisma db push

# 5. 빌드
npm run build

# 6. PM2 재시작
pm2 restart proof-of-prompt-backend

# 7. 로그 확인
pm2 logs proof-of-prompt-backend --lines 50
```

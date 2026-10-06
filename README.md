# Blockchain Certificate Verification

A decentralized certificate issuing and verification application. The Solidity contract stores certificate metadata and a SHA-256 document hash on-chain. The React frontend lets an issuer connect MetaMask, issue a certificate, and verify that an uploaded document matches the hash stored on the blockchain.

## Project Structure

```text
blockchain/       Hardhat 3 project, smart contract, tests, and scripts
frontend/          React + Vite user interface
certificate-002.txt  Sample certificate document
```

## Prerequisites

- Node.js 22 or newer
- npm
- MetaMask browser extension
- Git

The frontend uses the local Hardhat network by default. A local blockchain node must be running before opening the application.

## Setup

Clone the repository and install dependencies for both packages:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd blockchain-certificate

cd blockchain
npm install
npx hardhat build

cd ../frontend
npm install
```

## Run Locally

Use three terminal windows from the repository root.

### 1. Start the local blockchain

```bash
cd blockchain
npx hardhat node
```

Keep this terminal running. Hardhat will print test accounts and private keys for local development.

### 2. Deploy the contract

In a second terminal:

```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network localhost
```

The deployment script writes the deployed address to `frontend/.env` as `VITE_CONTRACT_ADDRESS`.

### 3. Start the frontend

In a third terminal:

```bash
cd frontend
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

In MetaMask, add or select a network with these values:

| Setting | Value |
| --- | --- |
| Network name | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |

For local transactions, import one of the private keys printed by `npx hardhat node` into MetaMask. Never use those development keys on a real network.

## Smart Contract Commands

Run these from `blockchain/`:

```bash
npx hardhat build
npx hardhat test
npx hardhat run scripts/deploy.ts --network localhost
```

The example scripts `issue.ts`, `issue-002.ts`, and `verify.ts` use the local deployment address and demonstrate issuing and reading certificates. They are intended for local development.

## Sepolia Deployment

The Hardhat configuration supports Sepolia through configuration variables. Set them using the Hardhat keystore:

```bash
cd blockchain
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat run scripts/deploy.ts --network sepolia
```

The deploying wallet needs Sepolia ETH for gas. Do not commit private keys, RPC credentials, or generated `.env` files.

> The current frontend is configured for Hardhat Local (`31337`). Deploying the contract to Sepolia does not switch the frontend network automatically; the frontend chain and RPC configuration must be updated before using it against Sepolia.

## Verification Flow

1. Connect MetaMask to the local Hardhat network.
2. Open **Issue Certificate**, enter an ID, student name, and course, then upload the certificate file.
3. Confirm the MetaMask transaction. The frontend stores the uploaded file's SHA-256 hash with the certificate.
4. Open **Verify Certificate**, enter the certificate ID, and upload the original file.
5. The application compares the uploaded file hash with the on-chain hash and certificate validity flag.

## Quality Checks

Run the frontend checks from `frontend/`:

```bash
npm run build
npm run lint
```

Run the contract checks from `blockchain/`:

```bash
npm install
npx hardhat build
npx hardhat test
```

## Preparing the Repository for GitHub

From the repository root:

```bash
git init
git add README.md .gitignore blockchain frontend certificate-002.txt
git status
git commit -m "Document blockchain certificate project"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY>.git
git push -u origin main
```

Before pushing, confirm that `git status` does not include `.env`, private keys, `node_modules`, `dist`, `artifacts`, or `cache`. The included `.gitignore` excludes these files while keeping `package-lock.json` files available for reproducible installs.

## License

The smart contract is marked MIT. Add a repository-wide license file if you want the entire project to use the same license.
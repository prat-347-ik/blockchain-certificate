import { network } from "hardhat";
import fs from "fs";
import path from "path";

const { viem } = await network.connect();

console.log("Deploying CertificateVerification...");

const certificate = await viem.deployContract(
  "CertificateVerification"
);

console.log(
  "CertificateVerification deployed to:",
  certificate.address
);

// Path to frontend .env
const envPath = path.resolve(
  "../frontend/.env"
);

// Create/update VITE_CONTRACT_ADDRESS
const envContent =
  `VITE_CONTRACT_ADDRESS=${certificate.address}\n`;

fs.writeFileSync(envPath, envContent);

console.log(
  "Frontend .env updated automatically."
);
import { network } from "hardhat";

const { viem } = await network.connect();

const certificate = await viem.getContractAt(
  "CertificateVerification",
  "0x5fbdb2315678afecb367f032d93f642f64180aa3"
);

const certificateId = "CERT-001";
const studentName = "Pratik Chavan";
const course = "Computer Engineering";
const documentHash = "abc123hash";

console.log("Issuing certificate...");

const hash = await certificate.write.issueCertificate([
  certificateId,
  studentName,
  course,
  documentHash,
]);

console.log("Transaction hash:", hash);

const publicClient = await viem.getPublicClient();
await publicClient.waitForTransactionReceipt({ hash });

console.log("Certificate successfully stored on blockchain!");
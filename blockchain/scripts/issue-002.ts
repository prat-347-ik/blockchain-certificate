import { network } from "hardhat";

const { viem } = await network.connect();
const publicClient = await viem.getPublicClient();

const certificate = await viem.getContractAt(
  "CertificateVerification",
  "0x5fbdb2315678afecb367f032d93f642f64180aa3"
);

const certificateId = "CERT-002";
const studentName = "Pratik Chavan";
const course = "Computer Engineering";

const documentHash =
  "DE6AF5442C87B08103E3985E1266243C5ECA2B25675090B4C4A7BD0D55A0F5FD";

console.log("Issuing CERT-002...");

const hash = await certificate.write.issueCertificate([
  certificateId,
  studentName,
  course,
  documentHash,
]);

console.log("Transaction hash:", hash);

await publicClient.waitForTransactionReceipt({ hash });

console.log("CERT-002 successfully stored on blockchain!");
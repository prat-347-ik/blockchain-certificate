import { network } from "hardhat";

const { viem } = await network.connect();

const certificate = await viem.getContractAt(
  "CertificateVerification",
  "0x5fbdb2315678afecb367f032d93f642f64180aa3"
);

console.log("Verifying certificate...");

const result = await certificate.read.verifyCertificate([
  "CERT-001",
]);

console.log("\nCertificate Details:");
console.log("--------------------");
console.log("Certificate ID:", result[0]);
console.log("Student Name:", result[1]);
console.log("Course:", result[2]);
console.log("Document Hash:", result[3]);
console.log("Issue Date:", new Date(Number(result[4]) * 1000));
console.log("Issuer:", result[5]);
console.log("Valid:", result[6]);
import { useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
} from "viem";
import "./App.css";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

const hardhat = {
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
};

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http("http://127.0.0.1:8545"),
});

const certificateABI = [
  {
    type: "function",
    name: "issueCertificate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_certificateId", type: "string" },
      { name: "_studentName", type: "string" },
      { name: "_course", type: "string" },
      { name: "_documentHash", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "verifyCertificate",
    stateMutability: "view",
    inputs: [{ name: "_certificateId", type: "string" }],
    outputs: [
      { name: "certificateId", type: "string" },
      { name: "studentName", type: "string" },
      { name: "course", type: "string" },
      { name: "documentHash", type: "string" },
      { name: "issueDate", type: "uint256" },
      { name: "issuer", type: "address" },
      { name: "valid", type: "bool" },
    ],
  },
];

const certificateIssuedEvent = {
  type: "event",
  name: "CertificateIssued",
  inputs: [
    { indexed: false, name: "certificateId", type: "string" },
    { indexed: false, name: "studentName", type: "string" },
    { indexed: false, name: "issuer", type: "address" },
  ],
};

async function calculateFileHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function shortAddress(address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatError(error) {
  return (
    error?.shortMessage ||
    error?.cause?.shortMessage ||
    error?.message ||
    "Transaction failed."
  );
}

function App() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const [walletAddress, setWalletAddress] = useState("");

  const [issueId, setIssueId] = useState("");
  const [issueStudent, setIssueStudent] = useState("");
  const [issueCourse, setIssueCourse] = useState("");
  const [issueFile, setIssueFile] = useState(null);
  const [issueHash, setIssueHash] = useState("");
  const [issueStatus, setIssueStatus] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  const [verifyId, setVerifyId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [latestBlock, setLatestBlock] = useState(null);
  const [blockData, setBlockData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [networkError, setNetworkError] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) {
      setIssueStatus("MetaMask not detected. Please install MetaMask.");
      return;
    }

    try {
      const walletClient = createWalletClient({
        chain: hardhat,
        transport: custom(window.ethereum),
      });

      const accounts = await walletClient.requestAddresses();
      const chainId = await walletClient.getChainId();

      if (chainId !== 31337) {
        setWalletAddress("");
        setIssueStatus(
          "Wrong network. Please switch MetaMask to Hardhat Local (Chain ID 31337)."
        );
        return;
      }

      setWalletAddress(accounts[0] || "");
      setIssueStatus("");
    } catch (error) {
      console.error(error);
      setIssueStatus(formatError(error));
    }
  };

  const loadBlockchainData = async () => {
    if (!CONTRACT_ADDRESS) {
      setNetworkError(
        "VITE_CONTRACT_ADDRESS is missing from frontend/.env."
      );
      return;
    }

    try {
      const blockNumber = await publicClient.getBlockNumber();
      const block = await publicClient.getBlock({ blockNumber });

      setLatestBlock(Number(blockNumber));
      setBlockData({
        hash: block.hash,
        timestamp: new Date(Number(block.timestamp) * 1000),
        transactions: block.transactions.length,
        gasUsed: block.gasUsed.toString(),
        gasLimit: block.gasLimit.toString(),
      });
      setNetworkError("");
    } catch (error) {
      console.error("Blockchain connection error:", error);
      setNetworkError(
        "Cannot connect to Hardhat. Make sure npx hardhat node is running."
      );
    }
  };

  const loadTransactions = async () => {
    if (!CONTRACT_ADDRESS) return;

    try {
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: certificateIssuedEvent,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const parsed = logs
        .map((log) => ({
          hash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          certificateId: log.args.certificateId,
          studentName: log.args.studentName,
          issuer: log.args.issuer,
          type: "Certificate Issued",
          status: "Confirmed",
        }))
        .sort((a, b) => b.blockNumber - a.blockNumber);

      setTransactions(parsed);
    } catch (error) {
      console.error("Transaction history error:", error);
    }
  };

  useEffect(() => {
    const refreshBlockchainData = () => {
      loadBlockchainData();
      loadTransactions();
    };

    refreshBlockchainData();

    const interval = setInterval(refreshBlockchainData, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      setWalletAddress(accounts[0] || "");
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
    };
  }, []);

  const handleIssueFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIssueFile(file);
    setIssueStatus("");

    try {
      const hash = await calculateFileHash(file);
      setIssueHash(hash);
    } catch (error) {
      console.error(error);
      setIssueHash("");
      setIssueStatus("Could not calculate file hash.");
    }
  };

  const issueCertificate = async () => {
    setIssueStatus("");
    setTransactionHash("");

    if (!CONTRACT_ADDRESS) {
      setIssueStatus(
        "Contract address missing. Check frontend/.env and restart Vite."
      );
      return;
    }

    if (!issueId.trim()) {
      setIssueStatus("Please enter a certificate ID.");
      return;
    }

    if (!issueStudent.trim()) {
      setIssueStatus("Please enter the student name.");
      return;
    }

    if (!issueCourse.trim()) {
      setIssueStatus("Please enter the course.");
      return;
    }

    if (!issueFile || !issueHash) {
      setIssueStatus("Please upload the certificate file.");
      return;
    }

    if (!window.ethereum) {
      setIssueStatus("MetaMask not detected.");
      return;
    }

    try {
      setLoading(true);
      setIssueStatus("Connecting to MetaMask...");

      const walletClient = createWalletClient({
        chain: hardhat,
        transport: custom(window.ethereum),
      });

      const [account] = await walletClient.requestAddresses();
      const chainId = await walletClient.getChainId();

      if (chainId !== 31337) {
        setIssueStatus(
          "Wrong network. Switch MetaMask to Hardhat Local (Chain ID 31337)."
        );
        return;
      }

      if (!account) {
        setIssueStatus("No MetaMask account selected.");
        return;
      }

      setWalletAddress(account);
      setIssueStatus("Waiting for MetaMask confirmation...");

      const hash = await walletClient.writeContract({
        account,
        address: CONTRACT_ADDRESS,
        abi: certificateABI,
        functionName: "issueCertificate",
        args: [
          issueId.trim(),
          issueStudent.trim(),
          issueCourse.trim(),
          issueHash,
        ],
      });

      setTransactionHash(hash);
      setIssueStatus("Transaction submitted. Waiting for confirmation...");

      await publicClient.waitForTransactionReceipt({ hash });

      setIssueStatus("Certificate successfully stored on-chain.");

      await loadBlockchainData();
      await loadTransactions();

      setIssueId("");
      setIssueStudent("");
      setIssueCourse("");
      setIssueFile(null);
      setIssueHash("");
    } catch (error) {
      console.error(error);
      setIssueStatus(formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setResult(null);

    try {
      const hash = await calculateFileHash(file);
      setFileHash(hash);
    } catch (error) {
      console.error(error);
      setFileHash("");
      setResult({
        status: "error",
        message: "Could not calculate the uploaded file hash.",
      });
    }
  };

  const verifyCertificate = async () => {
    setResult(null);

    if (!CONTRACT_ADDRESS) {
      setResult({
        status: "error",
        message: "Contract address is missing from frontend/.env.",
      });
      return;
    }

    if (!verifyId.trim()) {
      setResult({
        status: "error",
        message: "Please enter a certificate ID.",
      });
      return;
    }

    if (!selectedFile) {
      setResult({
        status: "error",
        message: "Please upload the certificate file.",
      });
      return;
    }

    try {
      setLoading(true);

      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: certificateABI,
        functionName: "verifyCertificate",
        args: [verifyId.trim()],
      });

      const blockchainHash = data[3];
      const isHashMatching =
        fileHash.toUpperCase() === blockchainHash.toUpperCase();

      setResult({
        status:
          isHashMatching && data[6] ? "verified" : "tampered",
        certificateId: data[0],
        studentName: data[1],
        course: data[2],
        blockchainHash,
        uploadedHash: fileHash,
        issueDate: new Date(Number(data[4]) * 1000),
        issuer: data[5],
        valid: data[6],
      });
    } catch (error) {
      console.error(error);

      setResult({
        status: "error",
        message:
          error?.shortMessage ||
          "Certificate not found on the current blockchain.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            BLOCKCHAIN CERTIFICATE VERIFICATION SYSTEM
          </span>

          <h2>
            Certificates on
            <br />
            <span>Blockchain.</span>
          </h2>

          <h3>Trust for a Digital World.</h3>

          <p>
            Issue, verify and secure digital certificates using blockchain
            technology and cryptographic verification.
          </p>

          <div className="feature-grid">
            <div className="feature">
              <div className="feature-icon">◇</div>
              <div>
                <strong>Tamper Proof</strong>
                <small>SHA-256 hash on-chain</small>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon">⬡</div>
              <div>
                <strong>Transparent</strong>
                <small>Public ledger</small>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon">◈</div>
              <div>
                <strong>Decentralized</strong>
                <small>Smart contract</small>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon">♢</div>
              <div>
                <strong>Secure</strong>
                <small>MetaMask signing</small>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-graphic">
          <div className="block block-main">⬡</div>
          <div className="block block-one">⬡</div>
          <div className="block block-two">⬡</div>
          <div className="connection connection-one"></div>
          <div className="connection connection-two"></div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>NETWORK</span>
          <strong>HARDHAT LOCAL</strong>
          <small>Chain 31337</small>
        </div>

        <div className="stat-card">
          <span>LATEST BLOCK</span>
          <strong>#{latestBlock ?? "—"}</strong>
          <small>Live RPC reading</small>
        </div>

        <div className="stat-card">
          <span>CONTRACT</span>
          <strong>{shortAddress(CONTRACT_ADDRESS)}</strong>
          <small>CertificateVerification</small>
        </div>

        <div className="stat-card">
          <span>ISSUED EVENTS</span>
          <strong>{transactions.length}</strong>
          <small>Detected on-chain</small>
        </div>
      </section>

      <section className="dashboard-console">
        <div className="info-card">
          <div className="card-heading">
            <span>⬡</span>
            Blockchain Info
          </div>

          <div className="info-row">
            <span>RPC</span>
            <code>127.0.0.1:8545</code>
          </div>

          <div className="info-row">
            <span>Chain ID</span>
            <strong>31337</strong>
          </div>

          <div className="info-row">
            <span>Wallet</span>
            <code>{shortAddress(walletAddress)}</code>
          </div>

          <div className="info-row">
            <span>Contract</span>
            <code>{shortAddress(CONTRACT_ADDRESS)}</code>
          </div>
        </div>

        <div className="info-card terminal-log">
          <div className="card-heading">
            <span>⌘</span>
            System Log
            <small>● LIVE</small>
          </div>

          <div className="log-line">
            <span>[SYSTEM]</span> Blockchain connection active
          </div>
          <div className="log-line">
            <span>[HASH]</span> SHA-256 cryptography ready
          </div>
          <div className="log-line">
            <span>[RPC]</span> 127.0.0.1:8545
          </div>
          <div className="log-line">
            <span>[BLOCK]</span> #{latestBlock ?? "waiting"}
          </div>
          {walletAddress && (
            <div className="log-line success-log">
              <span>[WALLET]</span> {shortAddress(walletAddress)}
            </div>
          )}
        </div>
      </section>
    </>
  );

  const renderIssue = () => (
    <section className="page-panel">
      <div className="page-heading">
        <span className="eyebrow">ON-CHAIN WRITE</span>
        <h2>Issue Certificate</h2>
        <p>
          Generate a SHA-256 fingerprint and permanently register the
          certificate metadata on the smart contract.
        </p>
      </div>

      <div className="workspace-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">CERTIFICATE RECORD</span>
            <h2>New Certificate</h2>
          </div>
          <span className="live-badge">● LIVE</span>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label>Certificate ID</label>
            <input
              placeholder="e.g. CERT-004"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Recipient Name</label>
            <input
              placeholder="e.g. Rahul Sharma"
              value={issueStudent}
              onChange={(e) => setIssueStudent(e.target.value)}
            />
          </div>

          <div className="input-group full">
            <label>Course / Program</label>
            <input
              placeholder="e.g. Computer Engineering"
              value={issueCourse}
              onChange={(e) => setIssueCourse(e.target.value)}
            />
          </div>

          <div className="input-group full">
            <label>Certificate Document</label>

            <label className="file-drop">
              <span>⇧</span>
              <div>
                <strong>
                  {issueFile ? issueFile.name : "Upload certificate"}
                </strong>
                <small>SHA-256 hash is generated locally</small>
              </div>
              <input type="file" onChange={handleIssueFileChange} />
            </label>
          </div>
        </div>

        {issueHash && (
          <div className="hash-display">
            <span>SHA-256</span>
            <code>{issueHash}</code>
          </div>
        )}

        <button
          className="primary-button"
          onClick={issueCertificate}
          disabled={loading}
        >
          {loading
            ? "Processing Transaction..."
            : "⇄  Issue Certificate on Blockchain"}
        </button>

        {issueStatus && (
          <div className="status-message">
            <span>●</span>
            {issueStatus}
          </div>
        )}

        {transactionHash && (
          <div className="transaction-card">
            <div>
              <small>TRANSACTION HASH</small>
              <code>{transactionHash}</code>
            </div>
            <span className="confirmed">✓ Confirmed</span>
          </div>
        )}
      </div>
    </section>
  );

  const renderVerify = () => (
    <section className="page-panel">
      <div className="page-heading">
        <span className="eyebrow">ON-CHAIN READ</span>
        <h2>Verify Certificate</h2>
        <p>
          Compare the uploaded document against the immutable SHA-256 hash
          stored on the blockchain.
        </p>
      </div>

      <div className="verify-grid page-verify-grid">
        <div className="verify-form">
          <div className="input-group">
            <label>Certificate ID</label>
            <input
              placeholder="e.g. CERT-003"
              value={verifyId}
              onChange={(e) => setVerifyId(e.target.value)}
            />
          </div>

          <label className="file-drop verify-file">
            <span>⇧</span>
            <div>
              <strong>
                {selectedFile
                  ? selectedFile.name
                  : "Upload certificate to verify"}
              </strong>
              <small>File hash will be compared with blockchain</small>
            </div>
            <input type="file" onChange={handleFileChange} />
          </label>

          {fileHash && (
            <div className="hash-display">
              <span>UPLOADED FILE HASH</span>
              <code>{fileHash}</code>
            </div>
          )}

          <button
            className="verify-button"
            onClick={verifyCertificate}
            disabled={loading}
          >
            {loading ? "Reading Blockchain..." : "◇  Verify Against Blockchain"}
          </button>
        </div>

        <div className="result-panel">
          {!result && (
            <div className="empty-result">
              <div>⬡</div>
              <strong>Awaiting verification</strong>
              <span>Enter a certificate ID and upload its document.</span>
            </div>
          )}

          {result?.status === "verified" && (
            <div className="verified-result">
              <div className="result-icon">✓</div>
              <span className="result-label">VERIFICATION SUCCESSFUL</span>
              <h3>Certificate Verified</h3>

              <div className="result-details">
                <div>
                  <span>ID</span>
                  <strong>{result.certificateId}</strong>
                </div>
                <div>
                  <span>RECIPIENT</span>
                  <strong>{result.studentName}</strong>
                </div>
                <div>
                  <span>PROGRAM</span>
                  <strong>{result.course}</strong>
                </div>
                <div>
                  <span>ISSUER</span>
                  <strong>{shortAddress(result.issuer)}</strong>
                </div>
              </div>

              <div className="match-banner">
                ✓ SHA-256 MATCH — DOCUMENT INTEGRITY CONFIRMED
              </div>
            </div>
          )}

          {result?.status === "tampered" && (
            <div className="tampered-result">
              <div className="result-icon">!</div>
              <span className="result-label">VERIFICATION FAILED</span>
              <h3>Certificate Tampered</h3>
              <p>
                The uploaded document does not match the immutable blockchain
                record.
              </p>

              <div className="hash-comparison">
                <div>
                  <span>UPLOADED HASH</span>
                  <code>{result.uploadedHash}</code>
                </div>
                <div>
                  <span>BLOCKCHAIN HASH</span>
                  <code>{result.blockchainHash}</code>
                </div>
              </div>
            </div>
          )}

          {result?.status === "error" && (
            <div className="tampered-result">
              <div className="result-icon">!</div>
              <span className="result-label">VERIFICATION ERROR</span>
              <h3>Verification Failed</h3>
              <p>{result.message}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const renderExplorer = () => (
    <section className="page-panel">
      <div className="page-heading">
        <span className="eyebrow">BLOCKCHAIN NETWORK</span>
        <h2>Blockchain Explorer</h2>
        <p>Live information read directly from the Hardhat JSON-RPC node.</p>
      </div>

      <div className="explorer-grid">
        <div className="explorer-card">
          <span>NETWORK</span>
          <strong>Hardhat Local</strong>
          <small>Ethereum-compatible local chain</small>
        </div>

        <div className="explorer-card">
          <span>CHAIN ID</span>
          <strong>31337</strong>
          <small>Local development network</small>
        </div>

        <div className="explorer-card">
          <span>LATEST BLOCK</span>
          <strong>#{latestBlock ?? "..."}</strong>
          <small>Live blockchain height</small>
        </div>

        <div className="explorer-card">
          <span>CONTRACT</span>
          <strong>{shortAddress(CONTRACT_ADDRESS)}</strong>
          <small>CertificateVerification</small>
        </div>
      </div>

      {blockData && (
        <div className="block-details">
          <div className="card-heading">
            <span>⬡</span>
            Latest Block
          </div>

          <div className="block-row">
            <span>Block Hash</span>
            <code>{blockData.hash}</code>
          </div>

          <div className="block-row">
            <span>Timestamp</span>
            <strong>{blockData.timestamp.toLocaleString()}</strong>
          </div>

          <div className="block-row">
            <span>Transactions</span>
            <strong>{blockData.transactions}</strong>
          </div>

          <div className="block-row">
            <span>Gas Used</span>
            <strong>{blockData.gasUsed}</strong>
          </div>

          <div className="block-row">
            <span>Gas Limit</span>
            <strong>{blockData.gasLimit}</strong>
          </div>
        </div>
      )}

      {networkError && <div className="network-error">⚠ {networkError}</div>}
    </section>
  );

  const renderTransactions = () => (
    <section className="page-panel">
      <div className="page-heading">
        <span className="eyebrow">BLOCKCHAIN ACTIVITY</span>
        <h2>Transactions</h2>
        <p>
          CertificateIssued events discovered directly from the deployed
          smart contract.
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-transactions">
          <div>⇄</div>
          <h3>No certificate transactions yet</h3>
          <p>
            Issue a certificate and its on-chain event will appear here.
          </p>
        </div>
      ) : (
        <div className="transaction-list">
          {transactions.map((tx) => (
            <div className="transaction-item" key={tx.hash}>
              <div className="tx-icon">⇄</div>

              <div className="tx-main">
                <strong>{tx.type}</strong>
                <span>
                  {tx.certificateId} • {tx.studentName}
                </span>
                <code>{tx.hash}</code>
                <small>
                  Block #{tx.blockNumber} • Issuer{" "}
                  {shortAddress(tx.issuer)}
                </small>
              </div>

              <div className="tx-status">
                <span className="confirmed-dot"></span>
                Confirmed
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "issue":
        return renderIssue();
      case "verify":
        return renderVerify();
      case "explorer":
        return renderExplorer();
      case "transactions":
        return renderTransactions();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">⬡</div>
          <div>
            <h1>BlockCert</h1>
            <span>Verify. Trust. On-Chain.</span>
          </div>
        </div>

        <div className="top-status">
          <div className="network-status">
            <span className="status-dot"></span>
            <div>
              <strong>Local Blockchain</strong>
              <small>Hardhat Network</small>
            </div>
          </div>

          <div className="divider"></div>

          <div className="metamask-status">
            <span className="fox">🦊</span>
            <div>
              <strong>MetaMask</strong>
              <small>{walletAddress ? "Connected" : "Not Connected"}</small>
            </div>
          </div>

          <button className="wallet-button" onClick={connectWallet}>
            {shortAddress(walletAddress)}
          </button>
        </div>
      </header>

      <div className="dashboard">
        <aside className="sidebar">
          <div
            className={`side-item ${
              activeSection === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActiveSection("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </div>

          <div
            className={`side-item ${
              activeSection === "issue" ? "active" : ""
            }`}
            onClick={() => setActiveSection("issue")}
          >
            <span>▣</span>
            Issue Certificate
          </div>

          <div
            className={`side-item ${
              activeSection === "verify" ? "active" : ""
            }`}
            onClick={() => setActiveSection("verify")}
          >
            <span>◇</span>
            Verify Certificate
          </div>

          <div
            className={`side-item ${
              activeSection === "explorer" ? "active" : ""
            }`}
            onClick={() => setActiveSection("explorer")}
          >
            <span>⬡</span>
            Blockchain Explorer
          </div>

          <div
            className={`side-item ${
              activeSection === "transactions" ? "active" : ""
            }`}
            onClick={() => setActiveSection("transactions")}
          >
            <span>⇄</span>
            Transactions
          </div>

          <div className="terminal-box">
            <div>&gt; Decentralized</div>
            <div>&gt; Immutable</div>
            <div>&gt; Transparent</div>
            <div>&gt; Secure</div>
            <div>_</div>
            <div className="terminal-cube">⬡</div>
          </div>

          <div className="sidebar-footer">
            Built with ◇ for a trusted future
          </div>
        </aside>

        <main className="content">
          {renderContent()}

          <footer>
            <span>
              BLOCKCERT // BLOCKCHAIN CERTIFICATE VERIFICATION
            </span>
            <span>LOCAL NETWORK • CHAIN 31337 • SHA-256</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;

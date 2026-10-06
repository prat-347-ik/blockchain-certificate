// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract CertificateVerification {

    struct Certificate {
        string certificateId;
        string studentName;
        string course;
        string documentHash;
        uint256 issueDate;
        address issuer;
        bool valid;
    }

    mapping(string => Certificate) private certificates;

    event CertificateIssued(
        string certificateId,
        string studentName,
        address issuer
    );

    function issueCertificate(
        string memory _certificateId,
        string memory _studentName,
        string memory _course,
        string memory _documentHash
    ) public {
        require(
            bytes(certificates[_certificateId].certificateId).length == 0,
            "Certificate already exists"
        );

        certificates[_certificateId] = Certificate(
            _certificateId,
            _studentName,
            _course,
            _documentHash,
            block.timestamp,
            msg.sender,
            true
        );

        emit CertificateIssued(
            _certificateId,
            _studentName,
            msg.sender
        );
    }

    function verifyCertificate(
        string memory _certificateId
    )
        public
        view
        returns (
            string memory certificateId,
            string memory studentName,
            string memory course,
            string memory documentHash,
            uint256 issueDate,
            address issuer,
            bool valid
        )
    {
        Certificate memory cert = certificates[_certificateId];

        require(
            bytes(cert.certificateId).length != 0,
            "Certificate not found"
        );

        return (
            cert.certificateId,
            cert.studentName,
            cert.course,
            cert.documentHash,
            cert.issueDate,
            cert.issuer,
            cert.valid
        );
    }

    function revokeCertificate(
        string memory _certificateId
    ) public {
        require(
            bytes(certificates[_certificateId].certificateId).length != 0,
            "Certificate not found"
        );

        require(
            certificates[_certificateId].issuer == msg.sender,
            "Only issuer can revoke"
        );

        certificates[_certificateId].valid = false;
    }
}
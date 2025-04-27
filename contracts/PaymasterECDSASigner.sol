// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PaymasterSigner} from "@openzeppelin/community-contracts/account/paymaster/PaymasterSigner.sol";
import {SignerECDSA} from "@openzeppelin/community-contracts/utils/cryptography/SignerECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract PaymasterECDSASigner is PaymasterSigner, SignerECDSA, Ownable {
    constructor(
        address signerAddr
    ) EIP712("MyPaymasterECDSASigner", "1") Ownable(signerAddr) {
        // Will revert if the signer is already initialized
        _setSigner(signerAddr);
    }

    function _authorizeWithdraw() internal virtual override onlyOwner {}
}

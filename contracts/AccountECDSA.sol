// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {Account} from "@openzeppelin/community-contracts/account/Account.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC7739} from "@openzeppelin/community-contracts/utils/cryptography/ERC7739.sol";
import {ERC7821} from "@openzeppelin/community-contracts/account/extensions/ERC7821.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {SignerECDSA} from "@openzeppelin/community-contracts/utils/cryptography/SignerECDSA.sol";

contract AccountECDSA is
    Initializable,
    Account,
    EIP712,
    ERC7739,
    SignerECDSA,
    ERC7821,
    ERC721Holder,
    ERC1155Holder
{
    constructor() EIP712("AccountECDSA", "1") {}

    function initializeECDSA(address signer) public initializer {
        _setSigner(signer);
    }

    function _erc7821AuthorizedExecutor(
        address caller,
        bytes32 mode,
        bytes calldata executionData
    ) internal view override returns (bool) {
        return
            caller == address(entryPoint()) ||
            super._erc7821AuthorizedExecutor(caller, mode, executionData);
    }
}

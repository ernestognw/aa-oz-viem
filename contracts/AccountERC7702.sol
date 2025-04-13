// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {Account} from "@openzeppelin/community-contracts/account/Account.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC7739} from "@openzeppelin/community-contracts/utils/cryptography/ERC7739.sol";
import {ERC7821} from "@openzeppelin/community-contracts/account/extensions/ERC7821.sol";
import {SignerERC7702} from "@openzeppelin/community-contracts/utils/cryptography/SignerERC7702.sol";

contract AccountERC7702 is
    Account,
    EIP712,
    ERC7739,
    SignerERC7702,
    ERC7821,
    ERC721Holder,
    ERC1155Holder
{
    constructor() EIP712("MyAccount", "1") {}

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

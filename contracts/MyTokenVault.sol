// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyTokenVault is ERC4626 {
    constructor(
        IERC20Metadata asset_
    )
        ERC20(_prefix("Staked ", asset_.name()), _prefix("s", asset_.symbol()))
        ERC4626(asset_)
    {}

    function _decimalsOffset() internal view override returns (uint8) {
        return 3;
    }

    /// @dev Prefixes a string with a given prefix.
    function _prefix(
        string memory _p,
        string memory _str
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(_p, _str));
    }
}

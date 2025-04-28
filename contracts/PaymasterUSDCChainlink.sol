// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC4337Utils, PackedUserOperation} from "@openzeppelin/contracts/account/utils/draft-ERC4337Utils.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {PaymasterERC20, IERC20} from "@openzeppelin/community-contracts/account/paymaster/PaymasterERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {SignedMath} from "@openzeppelin/contracts/utils/math/SignedMath.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @dev Extension of {PaymasterERC20} that enables using Chainlink's `AggregatorV3Interface`
 * to fetch the USDC price in ETH to sponsor user operations.
 *
 * NOTE: Encoding of the expected paymaster data is:
 *
 * * [0x00:0x14                         ] guarantor             (address) (optional: 0 if no guarantor)
 * * [0x14:0x16                         ] guarantorSigLength    (uint16)
 * * [0x16:0x16+guarantorSigLength      ] guarantorSignature    (bytes)
 */
contract PaymasterUSDCChainlink is EIP712, PaymasterERC20, Ownable {
    using ERC4337Utils for *;
    using SignedMath for int256;
    using SafeCast for *;

    // Values for sepolia
    // See https://docs.chain.link/data-feeds/price-feeds/addresses
    AggregatorV3Interface public constant USDC_USD_ORACLE =
        AggregatorV3Interface(0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E);
    AggregatorV3Interface public constant ETH_USD_ORACLE =
        AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);

    // See https://sepolia.etherscan.io/token/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
    IERC20 private constant PAYMENT_TOKEN =
        IERC20(0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238);

    bytes32 private constant GUARANTEED_PACKED_USER_OPERATION =
        keccak256(
            "GuaranteedPackedUserOperation(address sender,uint256 nonce,bytes initCode,bytes callData,bytes32 accountGasLimits,uint256 preVerificationGas,bytes32 gasFees,bytes paymasterAndData)"
        );

    constructor(
        address initialOwner
    ) EIP712("PaymasterERC20Mock", "1") Ownable(initialOwner) {}

    function _authorizeWithdraw() internal virtual override onlyOwner {}

    function liveness() public view virtual returns (uint256) {
        return 1 days; // Tolerate 1 day stale data
    }

    function _fetchDetails(
        PackedUserOperation calldata userOp,
        bytes32 /* userOpHash */
    )
        internal
        view
        virtual
        override
        returns (
            uint256 validationData,
            IERC20 token,
            uint256 tokenPrice,
            address guarantor
        )
    {
        (uint256 validationData1, uint256 price) = _fetchOracleDetails(userOp);
        (
            uint256 validationData2,
            address verifiedGuarantor
        ) = _fetchGuarantorDetails(userOp);
        return (
            validationData1.combineValidationData(validationData2),
            PAYMENT_TOKEN,
            price,
            verifiedGuarantor
        );
    }

    function _fetchOracleDetails(
        PackedUserOperation calldata /* userOp */
    )
        internal
        view
        virtual
        returns (uint256 validationData, uint256 tokenPrice)
    {
        (uint256 ETHUSDValidationData, int256 ETHUSD) = _fetchPrice(
            ETH_USD_ORACLE
        );
        (uint256 USDCUSDValidationData, int256 USDCUSD) = _fetchPrice(
            USDC_USD_ORACLE
        );

        // eth / usdc = (usdc / usd) / (eth / usd) = usdc * usd / eth * usd = usdc / eth
        int256 scale = _tokenPriceDenominator().toInt256();
        int256 scaledUSDCUSD = USDCUSD *
            scale *
            (10 ** ETH_USD_ORACLE.decimals()).toInt256();
        int256 scaledUSDCETH = scaledUSDCUSD /
            (ETHUSD * (10 ** USDC_USD_ORACLE.decimals()).toInt256());

        return (
            ETHUSDValidationData.combineValidationData(USDCUSDValidationData),
            uint256(scaledUSDCETH) // Safe upcast
        );
    }

    function _fetchPrice(
        AggregatorV3Interface oracle
    ) internal view virtual returns (uint256 validationData, int256 price) {
        (
            uint80 roundId,
            int256 price_,
            ,
            uint256 timestamp,
            uint80 answeredInRound
        ) = oracle.latestRoundData();
        if (
            price_ == 0 || // No data
            answeredInRound < roundId || // Not answered in round
            timestamp == 0 || // Incomplete round
            block.timestamp - timestamp > liveness() // Stale data
        ) {
            return (ERC4337Utils.SIG_VALIDATION_FAILED, 0);
        }
        return (ERC4337Utils.SIG_VALIDATION_SUCCESS, price_);
    }

    function _fetchGuarantorDetails(
        PackedUserOperation calldata userOp
    )
        internal
        view
        virtual
        returns (uint256 validationData, address guarantor)
    {
        bytes calldata paymasterData = userOp.paymasterData();
        if (paymasterData.length < 20) {
            return (ERC4337Utils.SIG_VALIDATION_FAILED, address(0));
        }
        guarantor = address(bytes20(paymasterData[:20]));

        if (guarantor == address(0)) {
            return (ERC4337Utils.SIG_VALIDATION_SUCCESS, guarantor);
        }

        uint16 guarantorSigLength = uint16(bytes2(paymasterData[20:22]));
        bytes calldata guarantorSignature = paymasterData[22:22 +
            guarantorSigLength];

        return (
            SignatureChecker.isValidSignatureNow(
                guarantor,
                _hashTypedDataV4(_guaranteedPackedOperationStructHash(userOp)),
                guarantorSignature
            )
                ? ERC4337Utils.SIG_VALIDATION_SUCCESS
                : ERC4337Utils.SIG_VALIDATION_FAILED,
            guarantor
        );
    }

    function _guaranteedPackedOperationStructHash(
        PackedUserOperation calldata userOp
    ) internal pure virtual returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    GUARANTEED_PACKED_USER_OPERATION,
                    userOp.sender,
                    userOp.nonce,
                    keccak256(userOp.initCode),
                    keccak256(userOp.callData),
                    userOp.accountGasLimits,
                    userOp.preVerificationGas,
                    userOp.gasFees,
                    keccak256(userOp.paymasterAndData[:0x48]) // 0x34 (paymasterDataOffset) + 0x14 (token + oracle + guarantor)
                )
            );
    }
}

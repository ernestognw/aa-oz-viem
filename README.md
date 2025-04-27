# Account Abstraction with ERC-4337 and EIP-7702

This project demonstrates account abstraction implementations using [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) and [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) standards. It provides smart contract accounts that can be controlled using different signature schemes and enables features like transaction batching and gas sponsorship.

## Features

- **Smart Contract Accounts**: Implementation of ERC-4337 compatible accounts with different signature schemes:
  - ECDSA (standard Ethereum signatures)
  - EIP-7702 (temporary delegation of EOA capabilities)
- **Token Integration**: Sample ERC-20 token and vault contracts for testing account functionality
- **Transaction Batching**: Support for executing multiple operations in a single transaction
- **Gas Sponsorship**: Paymaster functionality to sponsor transaction fees

## Project Structure

- `contracts/`: Smart contract implementations
  - `AccountECDSA.sol`: ECDSA-based smart account
  - `AccountERC7702.sol`: EIP-7702 compatible account
  - `MyToken.sol`: Sample ERC-20 token
  - `MyTokenVault.sol`: Token vault contract
  - `PaymasterECDSASigner.sol`: Paymaster contract for gas sponsorship
- `ignition/`: Hardhat Ignition deployment modules
- `tasks/`: Hardhat tasks for testing account functionality
- `utils/`: Utility functions and constants

## Getting Started

### Prerequisites

- Node.js
- Hardhat
- An Ethereum wallet with testnet ETH

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your configuration:

```
EOA_PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Testing

Run the test suite:

```bash
npx hardhat test
```

### Deployment

Deploy contracts to a testnet:

```bash
npx hardhat ignition deploy ./ignition/modules/AccountERC7702.ts --network sepolia
```

## Usage Examples

### ERC-7702 Account

```bash
npx hardhat erc7702 --network sepolia
```

This task demonstrates:

- Creating an ERC-7702 account
- Executing batched operations (e.g., minting, approving and depositing tokens)

### ERC-7702 Account with EIP-4337

```bash
npx hardhat erc7702Entrypoint --network sepolia
```

This task demonstrates:

- Creating an ERC-7702 account
- Executing batched operations (e.g., minting, approving and depositing tokens)
- Using the EntryPoint contract

### ERC-4337 Account

```bash
npx hardhat erc4337ECDSA --network sepolia
```

This task demonstrates:

- Creating an ECDSA-based smart account
- Executing batched operations (e.g., minting, approving and depositing tokens)
- Using the EntryPoint contract

### ERC-4337 Account with Gas Sponsorship

```bash
npx hardhat erc4337ECDSASponsored --network sepolia
```

This task demonstrates:

- Creating an ECDSA-based smart account
- Deploying and funding a paymaster contract
- Sponsoring transaction fees for account operations
- Executing batched operations without the user needing ETH in their account

## Security Considerations

- Smart contract accounts should be thoroughly audited before use in production
- Private keys should be securely managed
- Gas sponsorship should be carefully implemented to prevent abuse

## License

This project is licensed under the MIT License.

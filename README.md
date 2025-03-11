# DECIDE - Powering Educational Change Through Crowdsourced Solutions

## Overview
DECIDE is a Web3-powered platform that enables students, educators, and innovators to **propose, vote on, and get rewarded** for solutions that tackle **real educational challenges**. By leveraging **blockchain technology**, DECIDE brings **transparency, democracy, and financial incentives** to the process of improving education.

Through a **crowdsourced funding model**, participants submit a **small fee to join contests**, forming a prize pool. The community then votes on the **most impactful proposals**, ensuring that the best solutions receive **recognition and funding**.

## Features
- **Propose Educational Solutions**: Submit ideas that can improve education.
- **Crowdsourced Funding**: Entry fees contribute to the prize pool.
- **Transparent Voting**: Decentralized voting ensures fair results.
- **Smart Contracts for Trust**: Ensures secure transactions and fair distribution of rewards.
- **Web3 Wallet Integration**: Users connect wallets to participate in contests.
- **Impact Recognition**: Winning proposals gain visibility for potential real-world implementation.

## Tech Stack
### Frontend
- **Next.js** – Framework for server-side rendering and static site generation.
- **TypeScript** – Ensures type safety.
- **Tailwind CSS** – Styling for responsive and modern UI.
- **ethers.js** – For wallet connection and blockchain interactions.

### Backend (Smart Contracts)
- **Solidity** – Smart contract programming language.
- **Foundry** – Development framework for Ethereum smart contracts.

### Deployment
- **EduChain Testnet** – Test and deploy contracts.
- **IPFS (Optional)** – Decentralized storage for contest submissions.

## Installation and Setup
### Prerequisites
Ensure you have the following installed:
- **Node.js (v16+)**
- **npm** (preferred package manager)
- **Foundry** (for smart contract development)

### Clone the Repository
```sh
 git clone https://github.com/YusufsDesigns/Decide.git
 cd decide
```

### Install Dependencies
```sh
 npm install
```

### Running the Development Server
```sh
 npm dev
```
This starts the app on `http://localhost:3000`.

## Smart Contract Deployment (Using Foundry)
### Install Foundry
```sh
 curl -L https://foundry.paradigm.xyz | bash
 foundryup
```

### Compile the Contracts
```sh
 forge build
```

### Run Tests
```sh
 forge test
```

### Deploy Smart Contracts
Modify `script/Deploy.s.sol` with your settings and run:
```sh
NETWORK_ARGS := --rpc-url http://localhost:8545 --private-key $(DEFAULT_ANVIL_KEY) --broadcast

ifeq ($(findstring --network sepolia,$(ARGS)),--network sepolia)
	NETWORK_ARGS := --rpc-url $(SEPOLIA_RPC_URL) --account myAccount --broadcast --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv
endif

ifeq ($(findstring --network edu-chain,$(ARGS)),--network edu-chain)
	NETWORK_ARGS := --rpc-url https://rpc.open-campus-codex.gelato.digital/ --account eduAccount1 --skip-simulation --broadcast
endif

deploy:
	@forge script script/DeployDecide.s.sol:DeployDecide $(NETWORK_ARGS)
```

## Contributing
We welcome contributions! Follow these steps:
1. Fork the repository.
2. Create a new branch (`feature-branch`)
3. Make your changes.
4. Commit your changes and push.
5. Submit a pull request.

## License
MIT License. See `LICENSE` file for details.

## Contact
For inquiries, open an issue or reach out via X @dev_lawal.


import { ethers } from 'ethers';
import abi from "@/abi.json"

// Load environment variables
const privateKey = process.env.PRIVATE_KEY;
const rpcUrl = process.env.RPC_URL;
const contractAddress = process.env.CONTRACT_ADDRESS;

export async function POST() {
    try {
        // Set up provider and wallet
        if (!privateKey) throw new Error("Private key is not configured");
        if (!contractAddress) throw new Error("Contract address is not configured");

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(contractAddress, abi, wallet);

        const contractCode = await provider.getCode(contractAddress);
        if (contractCode === "0x") {
            throw new Error("Contract not found at this address");
        }

        // Call checkUpkeep with empty checkData
        // const checkData = ethers.toUtf8Bytes('');

        // Get the result without destructuring
        const result = await contract.checkUpkeep();

        // In ethers v6, the result might be returned as an array or as an object with named properties
        // We need to handle both cases
        let upkeepNeeded, performData;

        if (Array.isArray(result)) {
            // If result is an array, get values by index
            upkeepNeeded = result[0];
            performData = result[1];
        } else {
            // If result is an object with named properties
            // The property names match the return value names in the Solidity function
            upkeepNeeded = result.upkeepNeeded;
            performData = result.performData;
        }

        if (upkeepNeeded) {
            console.log('Upkeep needed, performing upkeep...');

            // No need to decode performData again - it's already in the correct format
            // The contract's performUpkeep function expects the raw bytes

            // Call performUpkeep with the performData
            const tx = await contract.performUpkeep(performData);
            await tx.wait(); // Wait for the transaction to be mined

            return Response.json({
                success: true,
                message: 'Upkeep performed successfully',
                transactionHash: tx.hash,
            });
        } else {
            return Response.json({
                success: true,
                message: 'No upkeep needed',
            });
        }
    } catch (error: any) {
        console.error('Error during upkeep check:', error);

        // More detailed error logging
        if (error.code) {
            console.error(`Error code: ${error.code}`);
            console.error(`Error value: ${error.value}`);
            if (error.info) console.error(`Error info: ${JSON.stringify(error.info)}`);
        }

        return Response.json({
            success: false,
            message: 'Error during upkeep check',
            error: error.message,
        }, { status: 500 });
    }
}
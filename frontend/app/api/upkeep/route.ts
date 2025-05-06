// Improved API route (app/api/upkeep/route.ts)
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import abi from "@/abi.json";

export const dynamic = 'force-dynamic'; // Ensure the route is not statically optimized

export async function POST() {
    try {
        // Validate environment variables
        const privateKey = process.env.PRIVATE_KEY;
        const rpcUrl = process.env.RPC_URL;
        const contractAddress = process.env.CONTRACT_ADDRESS;

        if (!privateKey || !rpcUrl || !contractAddress) {
            throw new Error("Missing required environment variables");
        }

        // Set up provider with timeout
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(contractAddress, abi, wallet);

        // Verify contract exists
        const contractCode = await provider.getCode(contractAddress);
        if (contractCode === "0x") {
            throw new Error("Contract not found");
        }

        // Check upkeep with retry logic
        let result;
        try {
            result = await contract.checkUpkeep();
        } catch (error) {
            console.error("Initial checkUpkeep failed, retrying...", error);
            result = await contract.checkUpkeep(); // Single retry
        }

        // Process result
        const [upkeepNeeded, performData] = Array.isArray(result)
            ? result
            : [result.upkeepNeeded, result.performData];

        if (upkeepNeeded) {
            console.log('Performing upkeep...');
            const tx = await contract.performUpkeep(performData);
            const receipt = await tx.wait();

            return NextResponse.json({
                success: true,
                message: 'Upkeep performed successfully',
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'No upkeep needed',
        });

    } catch (error: any) {
        console.error('Upkeep error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Upkeep check failed',
        }, { status: 500 });
    }
}
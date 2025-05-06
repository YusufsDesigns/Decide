"use client";

import { Contract, BrowserProvider } from 'ethers';
import { useWallet } from './useWallet';

const address = "0x5c31359bd90c7582c19B0a306D22dC4FC04cbFc3";

export const useContractWrite = (abi: any) => {
    const { signer } = useWallet();
    const contract = new Contract(address, abi, signer);
    return contract;
};

export const useContractRead = (abi: any, provider: BrowserProvider) => {
    if (!provider) {
        throw new Error("Provider is not available");
    }
    const contract = new Contract(address, abi, provider);
    return contract;
};
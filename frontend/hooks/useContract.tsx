"use client";

import { Contract, BrowserProvider } from 'ethers';
import { useWallet } from './useWallet';

const address = "0x23f2C677E44F43aFd05dc3E3479d456f74cF0131";

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
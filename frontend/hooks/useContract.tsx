"use client";

import { Contract, BrowserProvider } from 'ethers';
import { useWallet } from './useWallet';

const address = "0x71B0bFAb1bf1077c1bc264CeFE079D15E306d2Fe";

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
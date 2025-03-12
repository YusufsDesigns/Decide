"use client";

import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Signer } from "ethers";
import { toast } from "react-toastify";

declare global {
  interface Window {
    ethereum: any;
  }
}

// Network configuration
const EDU_CHAIN_ID = "0xA045C"; // Chain ID for Edu Chain
const EDU_CHAIN_CONFIG = {
  chainId: EDU_CHAIN_ID,
  chainName: "Open Campus Codex",
  nativeCurrency: {
    name: "EDU",
    symbol: "EDU",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.open-campus-codex.gelato.digital"],
  blockExplorerUrls: ["https://opencampus-codex.blockscout.com/"],
};

// Toast configuration to avoid repetition
const TOAST_CONFIG = {
  position: "top-center",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
} as const;

export const useWallet = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  // Initialize provider
  useEffect(() => {
    if (!window.ethereum) {
      setError("Please install MetaMask to connect");
      return;
    }
    
    try {
      setProvider(new BrowserProvider(window.ethereum));
    } catch (err) {
      toast.error("Failed to initialize provider", TOAST_CONFIG);
      setError("Please install MetaMask to connect");
    }
  }, []);

  // Switch to Open Campus network
  const switchToOpenCampusNetwork = useCallback(async () => {
    if (!window.ethereum) return false;
    
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: EDU_CHAIN_ID }],
      });
      return true;
    } catch (switchError: any) {
      // Network doesn't exist in wallet
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [EDU_CHAIN_CONFIG],
          });
          return true;
        } catch (addError) {
          toast.error("Failed to add Open Campus Codex network", TOAST_CONFIG);
          return false;
        }
      } else {
        toast.error("Failed to switch to Open Campus Codex network", TOAST_CONFIG);
        return false;
      }
    }
  }, []);

  // Handle wallet connection
  const connectWallet = useCallback(async (): Promise<void> => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!provider) {
        throw new Error("Provider not initialized");
      }

      // Ensure correct network
      const networkSwitched = await switchToOpenCampusNetwork();
      if (!networkSwitched) {
        throw new Error("Network switch failed");
      }

      // Request accounts
      await provider.send("eth_requestAccounts", []);
      const newSigner = await provider.getSigner();
      const newAddress = await newSigner.getAddress();

      // Update state and storage
      localStorage.setItem("walletAddress", newAddress);
      setSigner(newSigner);
      setAddress(newAddress);
    } catch (err: any) {
      const errorMessage = 
        err.code === 4001 
          ? "User rejected the connection request" 
          : err.message?.includes("MetaMask not detected")
            ? "Please install MetaMask to connect"
            : err.message || "Failed to connect wallet";
      
      setError(errorMessage);
      toast.error(errorMessage, TOAST_CONFIG);
      
      setSigner(null);
      setAddress(null);
      localStorage.removeItem("walletAddress");
    } finally {
      setIsConnecting(false);
    }
  }, [provider, switchToOpenCampusNetwork]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setSigner(null);
    setAddress(null);
    localStorage.removeItem("walletAddress");
  }, []);

  // Check if wallet was previously connected
  const checkConnection = useCallback(async () => {
    if (!provider) return;
    
    try {
      const storedAddress = localStorage.getItem("walletAddress");
      if (!storedAddress) return;

      const accounts = await provider.listAccounts();
      if (accounts.length > 0 && 
          accounts[0].address.toLowerCase() === storedAddress.toLowerCase()) {
        const newSigner = await provider.getSigner();
        const confirmedAddress = await newSigner.getAddress();
        setSigner(newSigner);
        setAddress(confirmedAddress);
      } else {
        localStorage.removeItem("walletAddress");
      }
    } catch (err) {
      toast.error("Failed to restore connection", TOAST_CONFIG);
      localStorage.removeItem("walletAddress");
    }
  }, [provider]);

  // Initial connection check
  useEffect(() => {
    if (provider) {
      checkConnection();
    }
  }, [provider, checkConnection]);

  // Handle account and chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (provider) {
        try {
          const newSigner = await provider.getSigner();
          const newAddress = await newSigner.getAddress();
          localStorage.setItem("walletAddress", newAddress);
          setSigner(newSigner);
          setAddress(newAddress);
        } catch (err) {
          toast.error("Failed to update signer", TOAST_CONFIG);
          disconnect();
        }
      }
    };

    const handleChainChanged = async () => {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== EDU_CHAIN_ID) {
        const switched = await switchToOpenCampusNetwork();
        if (!switched) {
          toast.error("Please connect to the Edu Chain network", TOAST_CONFIG);
          setError("Please connect to the Edu Chain network");
        }
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [provider, disconnect, switchToOpenCampusNetwork]);

  return {
    signer,
    address,
    isConnecting,
    error,
    provider,
    connectWallet,
    disconnect,
  };
};
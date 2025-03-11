"use client";

import { useState, useEffect } from "react";
import { BrowserProvider, Signer } from "ethers";
import { toast } from "react-toastify";

declare global {
  interface Window {
    ethereum: any;
  }
}

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

export const useWallet = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  // Initialize provider
  const getProvider = () => {
    if (!window.ethereum) {
      throw new Error("MetaMask not detected");
    }
    return new BrowserProvider(window.ethereum);
  };

  // Initialize provider on mount
  useEffect(() => {
    try {
      const provider = getProvider();
      setProvider(provider);
    } catch (err) {
      toast.error("Failed to initialize provider", {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      setError("Please install MetaMask to connect");
    }
  }, []);

  // Check if wallet was previously connected and restore connection
  const checkConnection = async () => {
    try {
      const storedAddress = localStorage.getItem("walletAddress");
      if (!storedAddress || !provider) return;

      // Check if we're still connected to this address
      const accounts = await provider.listAccounts();
      if (
        accounts.length > 0 &&
        accounts[0].address.toLowerCase() === storedAddress.toLowerCase()
      ) {
        const newSigner = await provider.getSigner();
        const confirmedAddress = await newSigner.getAddress();
        setSigner(newSigner);
        setAddress(confirmedAddress);
      } else {
        // Clear stored data if we're no longer connected
        localStorage.removeItem("walletAddress");
      }
    } catch (err) {
      toast.error("Failed to restore connection", {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      localStorage.removeItem("walletAddress");
    }
  };

  // Initial connection check when provider is set
  useEffect(() => {
    if (provider) {
      checkConnection();
    }
  }, [provider]);

  // Ensure the user is connected to the Edu Chain network
  const switchToOpenCampusNetwork = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: EDU_CHAIN_ID }],
        });
        console.log("Switched to Open Campus Codex network");
        
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: EDU_CHAIN_ID,
                  chainName: "Open Campus Codex",
                  nativeCurrency: {
                    name: "EDU",
                    symbol: "EDU",
                    decimals: 18,
                  },
                  rpcUrls: ["https://rpc.open-campus-codex.gelato.digital"],
                  blockExplorerUrls: [
                    "https://opencampus-codex.blockscout.com/",
                  ],
                },
              ],
            });
          } catch (addError) {
            toast.error("Failed to add Open Campus Codex network", {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
            });
          }
        } else {
          toast.error("Failed to switch to Open Campus Codex network", {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          });
        }
      }
    }
  };

  const connectWallet = async (): Promise<void> => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!provider) {
        throw new Error("Provider not initialized");
      }

      // Ensure the user is connected to the Edu Chain network
      await switchToOpenCampusNetwork();

      // Request accounts and trigger MetaMask popup
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from MetaMask");
      }

      const newSigner = await provider.getSigner();
      const newAddress = await newSigner.getAddress();

      // Store connection info
      localStorage.setItem("walletAddress", newAddress);
      setSigner(newSigner);
      setAddress(newAddress);
    } catch (err: any) {
      if (err.code === 4001) {
        setError("User rejected the connection request");
        toast.error("User rejected the connection request", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      } else if (err.message.includes("MetaMask not detected")) {
        setError("Please install MetaMask to connect");
        toast.error("Please install MetaMask to connect", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      } else {
        setError(err.message || "Failed to connect wallet");
        toast.error("Failed to connect wallet", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }
      setSigner(null);
      setAddress(null);
      localStorage.removeItem("walletAddress");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setSigner(null);
    setAddress(null);
    localStorage.removeItem("walletAddress");
  };

  // Handle account and chain changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnect();
        } else {
          // Account changed, update signer and address
          try {
            const newSigner = await provider!.getSigner();
            const newAddress = await newSigner.getAddress();
            localStorage.setItem("walletAddress", newAddress);
            setSigner(newSigner);
            setAddress(newAddress);
          } catch (err) {
            toast.error("Failed to update signer", {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
            });
            disconnect();
          }
        }
      };

      const handleChainChanged = async (chainId: string) => {
        if (chainId !== EDU_CHAIN_ID) {
          // If the user switches to a different chain, prompt them to switch back
          try {
            await switchToOpenCampusNetwork();
          } catch (err) {
            toast.error("Please connect to the Edu Chain network", {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
            });
            setError("Please connect to the Edu Chain network");
          }
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [provider]);

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

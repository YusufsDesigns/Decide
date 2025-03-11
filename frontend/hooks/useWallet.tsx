"use client";

import { useState, useEffect } from 'react';
import { BrowserProvider, Signer } from 'ethers';

declare global {
  interface Window {
    ethereum: any;
  }
}

export const useWallet = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  // Initialize provider
  const getProvider = () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    return new BrowserProvider(window.ethereum);
  };

  // Initialize provider on mount
  useEffect(() => {
    try {
      const provider = getProvider();
      setProvider(provider);
    } catch (err) {
      console.error('Failed to initialize provider:', err);
      setError('Please install MetaMask to connect');
    }
  }, []);

  // Check if wallet was previously connected and restore connection
  const checkConnection = async () => {
    try {
      const storedAddress = localStorage.getItem('walletAddress');
      if (!storedAddress || !provider) return;

      // Check if we're still connected to this address
      const accounts = await provider.listAccounts();
      if (accounts.length > 0 && accounts[0].address.toLowerCase() === storedAddress.toLowerCase()) {
        const newSigner = await provider.getSigner();
        const confirmedAddress = await newSigner.getAddress();
        setSigner(newSigner);
        setAddress(confirmedAddress);
      } else {
        // Clear stored data if we're no longer connected
        localStorage.removeItem('walletAddress');
      }
    } catch (err) {
      console.error('Failed to restore connection:', err);
      localStorage.removeItem('walletAddress');
    }
  };

  // Initial connection check when provider is set
  useEffect(() => {
    if (provider) {
      checkConnection();
    }
  }, [provider]);

  const connectWallet = async (): Promise<void> => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!provider) {
        throw new Error('Provider not initialized');
      }

      // Request accounts and trigger MetaMask popup
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }

      const newSigner = await provider.getSigner();
      const newAddress = await newSigner.getAddress();

      // Store connection info
      localStorage.setItem('walletAddress', newAddress);
      setSigner(newSigner);
      setAddress(newAddress);
    } catch (err: any) {
      if (err.code === 4001) {
        setError('User rejected the connection request');
      } else if (err.message.includes('MetaMask not detected')) {
        setError('Please install MetaMask to connect');
      } else {
        setError(err.message || 'Failed to connect wallet');
      }
      setSigner(null);
      setAddress(null);
      localStorage.removeItem('walletAddress');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setSigner(null);
    setAddress(null);
    localStorage.removeItem('walletAddress');
  };

  // Handle account changes
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
            localStorage.setItem('walletAddress', newAddress);
            setSigner(newSigner);
            setAddress(newAddress);
          } catch (err) {
            console.error('Failed to update signer:', err);
            disconnect();
          }
        }
      };

      const handleChainChanged = () => {
        // Reload the page on chain change as recommended by MetaMask
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
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
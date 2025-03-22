"use client";

import { useWallet } from "@/hooks/useWallet";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { generateEducationalUsername } from "@/lib/utils";

const Navbar = () => {
  const { address, signer, academicIdentity, connectWallet, disconnect } =
    useWallet();
  const [ academicUsername, setAcademicUsername ] = useState(academicIdentity);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnectWallet = (): void => {
    disconnect();
    setShowDropdown(false);
  };

  useEffect(() => {
    const fetchAddress = async () => {
      if (signer) {
        const newAddress = await signer.getAddress();
        const username = generateEducationalUsername(newAddress);
        setAcademicUsername(username);
      }
    };
    fetchAddress();
  }, [signer]);

  return (
    <header className="flex items-center justify-between whitespace-nowrap px-5 lg:px-10 py-3">
      <Link href="/contests" className="flex items-center gap-2 text-white">
        <Image
          src="/Logo1-removebg-preview.png"
          alt="Decide Logo"
          width={30}
          height={30}
        />
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">
          Decide
        </h2>
      </Link>
      <div className="flex items-center gap-2">
        {signer && (
          <Button
            variant="secondary"
            className="flex items-center gap-2 font-bold"
          >
            <span>Username: </span>
            {academicUsername}
          </Button>
        )}
        <div className="relative">
          <button
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#0da6f2] text-white text-sm font-bold leading-normal tracking-[0.015em]"
            onClick={
              address ? () => setShowDropdown(!showDropdown) : connectWallet
            }
          >
            {address ? (
              <span className="truncate">{truncateAddress(address)}</span>
            ) : (
              <span className="truncate">Connect Wallet</span>
            )}
          </button>

          {/* Dropdown menu */}
          {showDropdown && address && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
              <div
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer rounded-md"
                onClick={handleDisconnectWallet}
              >
                Disconnect Wallet
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

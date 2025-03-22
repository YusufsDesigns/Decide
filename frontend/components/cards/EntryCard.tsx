"use client";

import { useWallet } from "@/hooks/useWallet";
import { Entry } from "@/app/contests/[id]/page";
import { Button } from "../ui/button";
import { ethers, formatEther, parseEther } from "ethers";
import { useContractRead, useContractWrite } from "@/hooks/useContract";
import { toast } from "react-toastify";
import abi from "@/abi.json";
import { useEffect, useState } from "react";
import { useUser } from "@/context/userContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface EntryCardProps {
  contestId: string;
  entry: Entry;
  state: string;
  timeLeft: string;
  hasVoted: boolean;
}

const EntryCard = ({
  contestId,
  entry,
  state,
  timeLeft,
  hasVoted,
}: EntryCardProps) => {
  const [hasUserVoted, setHasUserVoted] = useState(hasVoted);
  const [walletBalance, setWalletBalance] = useState("0");
  const [minimumStake, setMinimumStake] = useState("0.005");
  const [stakeAmount, setStakeAmount] = useState("");
  const [isPending, setIsPending] = useState(false);
  const { signer } = useWallet();
  const contract = useContractWrite(abi);

  useEffect(() => {
    const fetchBalance = async () => {
      if (signer) {
        try {
          // Get the address from signer
          const address = await signer.getAddress();
          // Get the balance
          if (!signer.provider) throw new Error("Provider not found");
          const balance = await signer.provider.getBalance(address);
          // Convert from wei to ETH and format with 4 decimal places
          const balanceInEth = formatEther(balance);
          setWalletBalance(balanceInEth);
        } catch (error) {
          toast.error("Failed to fetch wallet balance", {
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
    };

    fetchBalance();
  }, [signer, contract]);

  async function vote() {
    if (signer) {
      try {
        // Validate stake amount
        const stakeAmountFloat = parseFloat(stakeAmount);
        const minStakeFloat = parseFloat(minimumStake); // This is now 0.05
        const balanceFloat = parseFloat(walletBalance);

        if (isNaN(stakeAmountFloat) || stakeAmountFloat <= 0) {
          toast.error("Please enter a valid stake amount.", {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          });
          setIsPending(false);
          return;
        }

        if (stakeAmountFloat < minStakeFloat) {
          toast.error(`Stake amount must be at least ${minimumStake} EDU.`, {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          });
          setIsPending(false);
          return;
        }

        if (stakeAmountFloat > balanceFloat) {
          toast.error("Stake amount exceeds your wallet balance.", {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          });
          setIsPending(false);
          return;
        }

        // Convert entry fee and stake to wei
        let stakeAmountInWei;
        stakeAmountInWei = parseEther(stakeAmount);
        const id = ethers.getBigInt(contestId);
        const entryId = ethers.getBigInt(entry.id);
        const tx = await contract.voteForEntry(id, entryId, {
          value: stakeAmountInWei,
        });
        await tx.wait(); // Wait for the transaction to be mined

        toast.success("Voted for contest successfully!", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });

        setHasUserVoted(true);
      } catch (error: any) {
        console.error("Error voting:", error);
        if (error.data) {
          const decodedError = contract.interface.parseError(error.data);
          if (decodedError) {
            const customError = {
              errorName: decodedError.name,
              message: decodedError.name.replace(/([A-Z])/g, " $1").trim(), // Convert camelCase to readable format
            };

            toast.error(customError.message, {
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
    } else {
      toast.error("MetaMask not detected", {
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

  return (
    <div className="flex items-start flex-col gap-2 px-4 py-2 my-4 bg-[#1f2f3f] rounded-md">
      <span className="text-xs text-gray-400">
        Proposed by {entry.proposer}
      </span>
      <h2 className="font-semibold text-xl line-clamp-1">{entry.name}</h2>
      <p className="text-sm whitespace-pre-wrap">{entry.metadataURI}</p>
      {state === "OPEN" ? (
        <Button className="flex items-center justify-center overflow-hidden rounded-sm px-2 bg-[#223c49] text-white text-sm font-bold">
          <span className="truncate">Voting starts in - {timeLeft}</span>
        </Button>
      ) : state === "VOTING" ? (
        <Dialog>
          {!hasUserVoted ? (
            <DialogTrigger className="flex cursor-pointer items-center justify-center overflow-hidden rounded-sm h-8 px-4 bg-[#096897] text-white text-sm font-bold mb-1">
              <span className="truncate">
                {hasUserVoted ? "Voted" : "Vote"}
              </span>
            </DialogTrigger>
          ) : (
            <Button
              isLoading={isPending}
              className="flex items-center justify-center overflow-hidden rounded-sm px-4 bg-[#223c49] text-white text-sm font-bold"
            >
              <span className="truncate">
                {hasUserVoted ? "Voted" : "Vote"}
              </span>
            </Button>
          )}
          <DialogContent className="bg-[#101d23] border-none">
            <DialogHeader>
              <DialogTitle>Vote for {entry.proposer}</DialogTitle>
            </DialogHeader>
            <p>Entry Name: {entry.name}</p>
            <Label htmlFor="stake">Stake Amount (EDU)</Label>
            <div className="relative">
              <Input
                placeholder="Min: 0.005 EDU"
                id="stake"
                value={stakeAmount}
                className="bg-[#223c49] border-none h-12 pr-24"
                onChange={(e) => {
                  // Allow only numbers and decimal point
                  const value = e.target.value.replace(/[^0-9.]/g, "");
                  setStakeAmount(value);
                }}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-400">
                Balance: {`${parseFloat(walletBalance).toFixed(4)} EDU`}
              </div>
            </div>
            <p className="text-[0.8rem] text-muted-foreground">
              Minimum stake required: 0.005 EDU. Your current balance:{" "}
              {`${parseFloat(walletBalance).toFixed(4)} EDU`}
            </p>
            <Button
              isLoading={isPending}
              onClick={vote}
              className="flex items-center justify-center overflow-hidden rounded-sm px-4 bg-[#223c49] text-white text-sm font-bold"
            >
              <span className="truncate">
                {hasUserVoted ? "Voted" : "Vote"}
              </span>
            </Button>
          </DialogContent>
        </Dialog>
      ) : (
        ""
      )}
    </div>
  );
};

export default EntryCard;

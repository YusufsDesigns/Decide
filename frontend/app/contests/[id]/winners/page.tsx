"use client";

import { useContractRead, useContractWrite } from "@/hooks/useContract";
import { ethers } from "ethers";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import abi from "@/abi.json";
import { DotLoader } from "react-spinners";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { divideAmount } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

const page = () => {
  const [winners, setWinners] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);
  const [amounts, setAmounts] = useState<any>();
  const [stakeAmount, setStakeAmounts] = useState<any>();
  const [reward, setReward] = useState<any>();
  const pathname = usePathname();
  const match = pathname.match(/\/contests\/(\d+)\/winners/);
  const contestId = match ? match[1] : null;
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contractRead = useContractRead(abi, provider);
  const { signer } = useWallet();
  const contract = useContractWrite(abi);

  useEffect(() => {
    async function fetchContest() {
      try {
        if (!contestId) throw new Error("Contest ID not found");
        const id = ethers.getBigInt(contestId);
        const contestData = await contractRead.getContest(id);

        const winners = contestData.winners;
        const entryFeeInEther = ethers.formatEther(
          contestData.entryFee.toString()
        );
        const totalFees = Number(entryFeeInEther) * contestData.entryIds.length;
        const tenPercentOfTotalFees = (totalFees * 10) / 100;
        const totalWinnersFee = totalFees - tenPercentOfTotalFees;
        const winnerFees = divideAmount(totalWinnersFee);

        setAmounts(winnerFees);
        setLoading(false);
        setWinners(winners);
      } catch (error) {
        setLoading(false);
      }
    }

    fetchContest();
  }, [signer]);

  useEffect(() => {
    async function fetchReward() {
      if (!contestId) throw new Error("Contest ID not found");
      const id = ethers.getBigInt(contestId);
      if (signer) {
        const address = signer.getAddress();
        const stake = await contractRead.getUserStakedAmount(address, id);
        const userStake = Number(stake);

        if (userStake !== 0) {
          const [stakedAmount, reward] =
            await contractRead.getUserStakeAndReward(id, address);
          const stakedAmountInEther = ethers.formatEther(
            stakedAmount.toString()
          );
          const rewardInEther = ethers.formatEther(reward.toString());

          setStakeAmounts(stakedAmountInEther);
          setReward(rewardInEther);
        } else {
          setStakeAmounts(0);
          setReward(0);
        }
      }
    }

    fetchReward();
  }, [signer]);

  async function claim() {
    if (signer) {
      try {
        if (!contestId) throw new Error("Contest ID not found");
        const id = ethers.getBigInt(contestId);
        const tx = await contract.withdrawStake(id);
        await tx.wait();

        toast.success("Stake withdrawn successfully!", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      } catch (error: any) {
        console.error("Transaction failed:", error);

        if (error.data) {
          const decodedError = contract.interface.parseError(error.data);
          if (decodedError) {
            const customError = {
              errorName: decodedError.name,
              message: decodedError.name.replace(/([A-Z])/g, " $1").trim()
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
    }
  }

  if (loading || !winners) {
    return (
      <div className="h-[90vh] w-full flex items-center justify-center">
        <DotLoader color="#fff" />
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-5 my-5">
      <h1 className="text-center font-bold text-2xl">Results are in!</h1>
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl mt-5 mb-2">Winner</h2>
          <Dialog>
            <DialogTrigger className="flex cursor-pointer items-center justify-center overflow-hidden rounded-sm h-8 px-4 bg-[#096897] text-white text-sm font-bold mb-1">
              <span className="truncate">Claim stake</span>
            </DialogTrigger>
            <DialogContent className="bg-[#101d23] border-none">
              <DialogHeader>
                <DialogTitle>Claim your stake!</DialogTitle>
              </DialogHeader>
              <div className="font-bold text-sm">
                <p>
                  Amount Staked: {`${parseFloat(stakeAmount).toFixed(4)} EDU`}
                </p>
                <p>Reward: {`${parseFloat(reward).toFixed(6)} EDU`}</p>
              </div>
              <Button onClick={claim} className="bg-[#096897]">
                Claim
              </Button>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-1 mb-2">
          <span className="text-4xl">🥇</span>
          <p>
            {winners[0].proposer} - {amounts.fifty} EDU
          </p>
        </div>
        <Alert variant="default" className="border-gray-500">
          <AlertTitle className="font-bold">First place entry</AlertTitle>
          <AlertDescription className="text-gray-500">
            Firsts place with a total of {winners[0].votes} votes
          </AlertDescription>
        </Alert>
        <h2 className="font-semibold text-xl mt-5 mb-2">Runner ups</h2>
        {winners.length == 1 && <p>No runner up!</p>}
        {winners.length > 1 && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-4xl">🥈</span>
            <p>
              {winners[1].proposer} - {amounts.thirty} EDU
            </p>
          </div>
        )}
        {winners.length > 2 && (
          <div className="flex items-center gap-1">
            <span className="text-4xl">🥉</span>
            <p>
              {winners[2].proposer} - {amounts.twenty} EDU
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default page;

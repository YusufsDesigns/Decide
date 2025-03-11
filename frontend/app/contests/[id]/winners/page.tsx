"use client";

import { useContractRead } from "@/hooks/useContract";
import { ethers } from "ethers";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import abi from "@/abi.json";
import { DotLoader } from "react-spinners";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { divideAmount } from "@/lib/utils";

const page = () => {
  const [winners, setWinners] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);
  const [amounts, setAmounts] = useState<any>();
  const pathname = usePathname();
  const match = pathname.match(/\/contests\/(\d+)\/winners/);
  const contestId = match ? match[1] : null;
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contractRead = useContractRead(abi, provider);

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
        const winnerFees = divideAmount(totalFees);

        setAmounts(winnerFees);
        setLoading(false);
        setWinners(winners);
      } catch (error) {
        setLoading(false);
      }
    }

    fetchContest();
  }, []);

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
        <h2 className="font-semibold text-xl mt-5 mb-2">Winner</h2>
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

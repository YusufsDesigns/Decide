"use client";

import ContestCard from "@/components/cards/ContestCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useContractRead, useContractWrite } from "@/hooks/useContract";
import abi from "@/abi.json";
import { useWallet } from "@/hooks/useWallet";
import { calculateTimeLeft, ContestState, formatTimeLeft } from "@/lib/utils";
import { DotLoader } from "react-spinners";
import { toast } from "react-toastify";

// Interface for a contest
interface Contest {
  id: string;
  name: string;
  creator: string;
  description: string;
  contestState: string;
}

const Page = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const contractWrite = useContractWrite(abi);

  // Fetch contests and set up event listeners
  useEffect(() => {
    async function fetchContests() {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractRead = useContractRead(abi, provider);
      try {
        if (!provider || !contractRead) {
          throw new Error("Provider or contract not available");
        }

        // Call the getContestsBatch function
        const contestsData = await contractRead.getContestsBatch(0, 10);

        // Format the data
        const formattedContests: Contest[] = contestsData.map(
          (contest: any, index: number) => {
            const state = ContestState[contest.contestState];
            return {
              id: contest.id.toString(),
              creator: contest.creator,
              name: contest.name,
              description: contest.description,
              contestState: state,
            };
          }
        );

        setContests(formattedContests);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching contests:", error);
        toast.error("Couldn't contests", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
        setLoading(false);
      }
    }

    fetchContests();

    // Cleanup event listener on component unmount
    return () => {
      contractWrite.removeAllListeners("ContestStateUpdated");
    };
  }, []);

  if (loading) {
    return (
      <div className="h-[90vh] w-full flex items-center justify-center">
        <DotLoader color="#fff" />
      </div>
    );
  }

  const ongoingContests = contests.filter(
    (contest) =>
      contest.contestState === ContestState[0] ||
      contest.contestState === ContestState[1]
  );

  const closedContests = contests.filter(
    (contest) => contest.contestState === ContestState[2]
  );

  return (
    <div className="max-w-[1200px] mx-auto px-5">
      <h1 className="text-4xl mt-5 font-semibold mb-7">Discover Contests</h1>
      <Tabs defaultValue="ongoing" className="w-full">
        <TabsList className="flex items-center justify-between">
          <div>
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="ended">Ended</TabsTrigger>
          </div>
          <Link
            href="/contests/create/contest"
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-sm h-8 px-4 bg-[#096897] text-white text-sm font-bold mb-1"
          >
            <span className="truncate">New Contest</span>
          </Link>
        </TabsList>
        <TabsContent value="ongoing" className="grid lg:grid-cols-3 gap-3 my-3">
          {ongoingContests.map((contest) => (
            <ContestCard
              key={contest.id}
              id={contest.id}
              name={contest.name}
              description={contest.description}
              creator={contest.creator}
            />
          ))}
        </TabsContent>
        <TabsContent value="ended" className="grid lg:grid-cols-3 gap-3 my-3">
          {closedContests.length != 0 ? (
            closedContests.map((contest) => (
              <ContestCard
                key={contest.id}
                id={contest.id}
                name={contest.name}
                description={contest.description}
                creator={contest.creator}
              />
            ))
          ) : (
            <h1>No contest has ended</h1>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Page;

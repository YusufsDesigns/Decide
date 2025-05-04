"use client";

import ContestCard from "@/components/cards/ContestCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

import { useState, useEffect, useCallback } from "react";
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
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const contractWrite = useContractWrite(abi);
  const BATCH_SIZE = 10;

  // Function to fetch contests with pagination
  const fetchContests = useCallback(async (page: number = 0) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractRead = useContractRead(abi, provider);

      if (!provider || !contractRead) {
        throw new Error("Provider or contract not available");
      }

      // Display loading indicator only on first page
      if (page === 0) {
        setLoading(true);
      }

      const start = page * BATCH_SIZE;

      // Call the getContestsBatch function
      const contestsData = await contractRead.getContestsBatch(
        start,
        BATCH_SIZE
      );

      // Check if we've reached the end of available contests
      if (contestsData.length < BATCH_SIZE) {
        setHasMore(false);
      }

      // Format the data
      const formattedContests: Contest[] = contestsData.map((contest: any) => {
        const state = ContestState[contest.contestState];
        return {
          id: contest.id.toString(),
          creator: contest.creator,
          name: contest.name,
          description: contest.description,
          contestState: state,
        };
      });

      // Update contests based on page number (replace or append)
      setContests((prevContests) =>
        page === 0 ? formattedContests : [...prevContests, ...formattedContests]
      );
    } catch (error: any) {
      console.error("Error fetching contests:", error);
      toast.error("Couldn't fetch contests", {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more contests
  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchContests(nextPage);
  };

  // Fetch contests and set up event listeners
  useEffect(() => {
    fetchContests(0); // Initial fetch with page 0

    // Cleanup event listener on component unmount
    return () => {
      contractWrite.removeAllListeners("ContestStateUpdated");
    };
  }, [fetchContests]);

  if (loading && contests.length === 0) {
    return (
      <div className="h-[90vh] w-full flex items-center justify-center">
        <DotLoader color="#fff" />
      </div>
    );
  }

  const entryPhaseContests = contests
    .filter((contest) => contest.contestState === ContestState[0])
    .reverse();

  const votingPhaseContests = contests
    .filter((contest) => contest.contestState === ContestState[1])
    .reverse();

  const closedContests = contests
    .filter((contest) => contest.contestState === ContestState[2])
    .reverse();

  return (
    <div className="max-w-[1200px] mx-auto px-5">
      <h1 className="text-4xl mt-5 font-semibold mb-7">Discover Contests</h1>
      <Tabs defaultValue="entry" className="w-full">
        <TabsList className="flex items-center justify-between">
          <div>
            <TabsTrigger value="entry">Entry phase</TabsTrigger>
            <TabsTrigger value="voting">Voting phase</TabsTrigger>
            <TabsTrigger value="ended">Ended</TabsTrigger>
          </div>
          <Link
            href="/contests/create/contest"
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-sm h-8 px-4 bg-[#096897] text-white text-sm font-bold mb-1"
          >
            <span className="truncate">New Contest</span>
          </Link>
        </TabsList>
        <TabsContent value="entry" className="grid lg:grid-cols-3 gap-3 my-3">
          {entryPhaseContests.length != 0 ? (
            entryPhaseContests.map((contest) => (
              <ContestCard
                key={contest.id}
                id={contest.id}
                name={contest.name}
                description={contest.description}
                creator={contest.creator}
              />
            ))
          ) : (
            <h1>No contests in entry phase yet!</h1>
          )}
        </TabsContent>
        <TabsContent value="voting" className="grid lg:grid-cols-3 gap-3 my-3">
          {votingPhaseContests.length != 0 ? (
            votingPhaseContests.map((contest) => (
              <ContestCard
                key={contest.id}
                id={contest.id}
                name={contest.name}
                description={contest.description}
                creator={contest.creator}
              />
            ))
          ) : (
            <h1>No contests in voting phase yet!</h1>
          )}
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
            <h1>No contest has ended!</h1>
          )}
        </TabsContent>
      </Tabs>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center my-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center justify-center px-4 py-2 bg-[#096897] text-white rounded-sm hover:bg-[#075783] disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More Contests"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Page;

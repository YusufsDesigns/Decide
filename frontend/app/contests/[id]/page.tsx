"use client";

import { useContractRead } from "@/hooks/useContract";
import {
  calculateTimeLeft,
  cn,
  ContestState,
  formatTimeLeft,
} from "@/lib/utils";
import { ethers } from "ethers";
import React, { use, useEffect, useState } from "react";
import abi from "@/abi.json";
import TimeLeft from "@/components/cards/TimeLeft";
import { Badge } from "@/components/ui/badge";
import { DotLoader } from "react-spinners";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateEntry } from "@/components/forms/CreateEntry";
import EntryCard from "@/components/cards/EntryCard";
import { toast } from "react-toastify";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { usePolling } from "@/hooks/usePolling";

interface Contest {
  id: string;
  creator: string;
  name: string;
  description: string;
  entryFee: string;
  winners: string[];
  entryIds: string[];
  hasUserVoted: boolean;
  state: string;
  nextPhase: string;
  timeLeft: string;
}

export interface Entry {
  id: string;
  name: string;
  proposer: string;
  votes: number;
  metadataURI: string;
  owner: string;
}

const Page = ({ params }: { params: Promise<{ id: string }> }) => {
  const unwrappedParams = use(params);
  const contestId = unwrappedParams.id;

  const [contest, setContest] = useState<Contest>();
  const [entries, setEntries] = useState<Entry[]>();
  const [loading, setLoading] = useState<boolean>(true);
  const [url, setUrl] = useState<string>();
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contractRead = useContractRead(abi, provider);

  // Function to fetch contest data
  const fetchContest = async () => {
    try {
      if (!provider || !contractRead) {
        throw new Error("Provider or contract not available");
      }

      // Call the getContestsBatch function
      const id = ethers.getBigInt(contestId);
      const contestData = await contractRead.getContest(id);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const hasUserVoted = await contractRead.getHasUserVoted(id, address);

      // Get the current block timestamp
      const currentBlock = await provider.getBlock("latest");
      const currentTime = currentBlock!.timestamp;

      const entryFeeInEther = ethers.formatEther(
        contestData.entryFee.toString()
      ); // Convert wei to ether
      const entryTimeEnd = Number(contestData.entryTimeDeadline.toString());
      const voteTimeEnd = Number(contestData.voteTimeDeadline.toString());

      // Determine the current phase based on the state
      const state = ContestState[contestData.contestState];

      // Calculate time left for the next phase
      const { timeLeft, nextPhase } = calculateTimeLeft(
        currentTime,
        entryTimeEnd,
        voteTimeEnd,
        state
      );

      try {
        const entriesData = await contractRead.getAllEntries(id);

        // Format the entries data
        const formattedEntries = await Promise.all(
          entriesData.map(async (entry: Entry) => {
            try {
              // Fetch the description from the metadata URI
              const response = await fetch(entry.metadataURI);
              const description = await response.text();

              return {
                id: entry.id.toString(),
                name: entry.name,
                proposer: entry.proposer,
                owner: entry.owner,
                votes: entry.votes,
                metadataURI: JSON.parse(description).description, // Now this will have the fetched text
              };
            } catch (error) {
              toast.error("Couldn't fetch entry details", {
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
          })
        );

        setEntries(formattedEntries);
      } catch (err: any) {
        console.error("Error fetching entries:", err);
      }

      const contest = {
        id: contestData.id.toString(),
        creator: contestData.creator,
        name: contestData.name,
        description: contestData.description, // Replace with actual description if available
        entryFee: entryFeeInEther,
        winners: contestData.winners,
        entryIds: contestData.entryIds.map((entryId: ethers.BigNumberish) =>
          entryId.toString()
        ),
        hasUserVoted,
        state,
        nextPhase,
        timeLeft: formatTimeLeft(timeLeft),
      };

      setContest(contest);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching contest:", error);
      toast.error("Couldn't contest", {
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
  };

  // Set up polling
  const { isActive } = usePolling(
    async () => {
      const response = await fetch("/api/upkeep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (
        result.success &&
        result.message === "Upkeep performed successfully"
      ) {
        await fetchContest(); // Refresh contest data if upkeep was performed
      }
    },
    60000,
    [contestId]
  ); // Poll every 60 seconds

  // Initial fetch
  useEffect(() => {
    fetchContest();
  }, [contestId]);

  if (loading) {
    return (
      <div className="h-[90vh] w-full flex items-center justify-center">
        <DotLoader color="#fff" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 my-5">
      {/* Status indicator */}
      <div className="text-right mb-2">
        <span
          className={`text-xs ${isActive ? "text-green-500" : "text-gray-500"}`}
        >
          {isActive ? "Live updates active" : "Updates paused"}
        </span>
      </div>
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div>
            <span className="text-xs text-gray-400">
              Created by {contest?.creator}
            </span>
            <h1 className="font-semibold text-2xl sm:text-4xl">
              {contest?.name}
            </h1>
            <p className="max-w-[800px]">{contest?.description}</p>
          </div>
          <div className="mt-7">
            <h2 className="font-semibold text-2xl">Entries</h2>
            {entries?.map((entry: Entry) => (
              <EntryCard
                key={entry.id}
                contestId={contestId}
                entry={entry}
                state={contest?.state ?? ""}
                timeLeft={contest?.timeLeft ?? ""}
                hasVoted={contest?.hasUserVoted ?? false}
              />
            ))}
          </div>
        </div>
        <div className="w-full order-first lg:order-2">
          <div className="border-2 border-[#1a2f39] rounded-md p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              {contest?.state == "OPEN" ? (
                <p className="font-bold">Entry fee - {contest?.entryFee} EDU</p>
              ) : contest?.state == "VOTING" ? (
                <p className="font-bold">Next Phase - {contest?.nextPhase}</p>
              ) : (
                <p className="font-bold">Contest has ended</p>
              )}
              <Badge variant="secondary">
                {contest?.state == "OPEN"
                  ? "Entry phase"
                  : contest?.state == "VOTING"
                  ? "Voting phase"
                  : "Ended"}
              </Badge>
            </div>
            <TimeLeft timeString={contest?.timeLeft ?? ""} />
            <Dialog>
              {contest?.state == "OPEN" ? (
                <DialogTrigger className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-sm h-8 px-4 bg-[#096897] text-white text-sm font-bold mb-1">
                  New Entry
                </DialogTrigger>
              ) : contest?.state == "VOTING" ? (
                <Alert variant="default">
                  <AlertTitle>Voting for the best entry</AlertTitle>
                </Alert>
              ) : (
                <Link
                  href={`${contestId}/winners`}
                  className="flex w-full cursor-pointer items-center justify-center rounded-sm h-8 px-4 bg-[#096897] text-white text-sm font-bold"
                >
                  View winners
                </Link>
              )}
              <DialogContent className="bg-[#101d23] border-none">
                <DialogHeader>
                  <DialogTitle>Join {contest?.name}</DialogTitle>
                  <DialogDescription>
                    You need to pay an amount of {contest?.entryFee} EDU to
                    join.
                  </DialogDescription>
                  <CreateEntry
                    contestId={contest?.id ?? ""}
                    entryFee={contest?.entryFee ?? ""}
                    setUrl={setUrl}
                  />
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;

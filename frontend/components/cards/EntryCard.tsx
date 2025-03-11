"use client"

import { useWallet } from "@/hooks/useWallet"
import { Entry } from "@/app/contests/[id]/page";
import { Button } from "../ui/button";
import { ethers } from "ethers";
import { useContractRead, useContractWrite } from "@/hooks/useContract";
import { toast } from "react-toastify";
import abi from "@/abi.json"
import { useState } from "react";
import { useUser } from "@/context/userContext";

interface EntryCardProps {
    contestId: string;
    entry: Entry;
    state: string;
    timeLeft: string;
    hasVoted: boolean;
}

const EntryCard = ({ contestId, entry, state, timeLeft, hasVoted }: EntryCardProps ) => {
    const [hasUserVoted, setHasUserVoted] = useState(hasVoted)
    const {signer } = useWallet()
    const contract = useContractWrite(abi);
    const { username } = useUser();

    async function vote() {
        if(signer){
            try {
                if (!username) {
                    return toast.error("Connect to your open campus ID", {
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
                const id = ethers.getBigInt(contestId);
                const entryId = ethers.getBigInt(entry.id);
                const tx = await contract.voteForEntry(id, entryId, username);
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

                setHasUserVoted(true)
            } catch (error: any) {
                console.error("Error voting:", error);
                if (error.data) {
                    const decodedError = contract.interface.parseError(error.data);
                    if (decodedError) {
                    const customError = {
                        errorName: decodedError.name,
                        message: decodedError.name.replace(/([A-Z])/g, " $1").trim(), // Convert camelCase to readable format
                    };
        
                    console.error(customError);
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
            <span className="text-xs text-gray-400">Proposed by {entry.proposer}</span>
            <h2 className="font-semibold text-xl line-clamp-1">{entry.name}</h2>
            <p className="text-sm whitespace-pre-wrap">{entry.metadataURI}</p>
            {
                state === "OPEN" ?
                <Button className="flex items-center justify-center overflow-hidden rounded-sm px-2 bg-[#223c49] text-white text-sm font-bold">
                    <span className="truncate">Voting starts in - {timeLeft}</span>
                </Button>
                :
                state === "VOTING" ?
                <Button onClick={vote} className="flex items-center justify-center overflow-hidden rounded-sm px-4 bg-[#223c49] text-white text-sm font-bold">
                    <span className="truncate">{hasUserVoted ? "Voted" : "Vote"}</span>
                </Button>
                :
                ""
            }
        </div>
    )
}

export default EntryCard
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@/hooks/useWallet";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const { address, connectWallet } = useWallet();

  return (
    <div className="flex flex-col items-start sm:items-center justify-center min-h-[90vh] gap-7 max-w-[600px] mx-auto px-5 text-left sm:text-center">
      <h2 className="text-2xl sm:text-4xl font-semibold">
        Compete, Propose, Vote, and Earn!
      </h2>
      <p className="">
        Enter contests, propose solutions, and get rewarded for driving change
        in education. DECIDE empowers students, educators, and innovators to
        create and vote on ideas that shape the future of learning while
        crowdsourcing funding for impactful solutions. Your impact starts here!
      </p>
      <Dialog>
        {!address ? (
          <DialogTrigger>
            <div
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-sm h-10 px-4 bg-[#096897] text-white text-sm font-bold"
            >
              <span className="truncate">View Contests</span>
            </div>
          </DialogTrigger>
        ) : (
          <Link
            href="/contests"
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-sm h-10 px-4 bg-[#096897] text-white text-sm font-bold"
          >
            <span className="truncate">View Contests</span>
          </Link>
        )}
        <DialogContent className="bg-[#101d23] border-none">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <button
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#0da6f2] text-white text-sm font-bold leading-normal tracking-[0.015em]"
            onClick={connectWallet}
          >
            <span className="truncate">Connect Wallet</span>
          </button>
        </DialogContent>
      </Dialog>
      <Image src="/web3_noBg.png" alt="hero_img" width={500} height={500} />
    </div>
  );
}

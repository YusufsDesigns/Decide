"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import { useWallet } from "@/hooks/useWallet";
import { useContractWrite } from "@/hooks/useContract";
import abi from "@/abi.json";
import { formatEther, parseEther } from "ethers";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name of contest must be at least 2 characters.",
  }),
  description: z.string().min(2, {
    message: "Description must be at least 2 characters.",
  }),
  entryFee: z.string(),
  entryTime: z.string(),
  voteTime: z.string(),
  stakeAmount: z.string().refine(
    (value) => {
      // This will be validated in the component with actual balance checks
      const amount = parseFloat(value);
      return !isNaN(amount) && amount > 0;
    },
    {
      message: "Please enter a valid stake amount.",
    }
  ),
});

export function CreateContest() {
  const { signer, academicIdentity } = useWallet();
  const contract = useContractWrite(abi);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [walletBalance, setWalletBalance] = useState("0");
  const [minimumStake, setMinimumStake] = useState("0.05");

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      entryFee: "",
      entryTime: "",
      voteTime: "",
      stakeAmount: "",
    },
  });

  // Fetch wallet balance when signer changes
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
          console.error("Error fetching balance:", error);
          toast.error("Failed to fetch wallet balance");
        }
      }
    };

    fetchBalance();
  }, [signer, contract]);

  const convertDaysToSeconds = (days: number): number => {
    const secondsInADay = 86400; // 24 hours * 60 minutes * 60 seconds
    const totalSeconds = Math.floor(days * secondsInADay);
    return totalSeconds;
  };

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsPending(true);
    // Convert string inputs to numbers
    const entryTimeDaysNumber = Number(values.entryTime);
    const voteTimeDaysNumber = Number(values.voteTime);

    // Validate inputs
    if (
      isNaN(entryTimeDaysNumber) ||
      isNaN(voteTimeDaysNumber) ||
      entryTimeDaysNumber <= 0 ||
      voteTimeDaysNumber <= 0
    ) {
      alert("Please enter valid numbers for entry time and voting time.");
      return;
    }

    // Validate stake amount
    const stakeAmountFloat = parseFloat(values.stakeAmount);
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

    // Convert days to seconds
    const entryTime = convertDaysToSeconds(entryTimeDaysNumber);
    const voteTime = convertDaysToSeconds(voteTimeDaysNumber);

    // Convert entry fee and stake to wei
    let entryFeeInWei, stakeAmountInWei;
    try {
      entryFeeInWei = parseEther(values.entryFee); // Convert EDU to wei
      stakeAmountInWei = parseEther(values.stakeAmount); // Convert EDU to wei
    } catch (error) {
      alert("Please enter valid amounts for entry fee and stake.");
      setIsPending(false);
      return;
    }

    if (signer) {
      try {
        const tx = await contract.createContest(
          values.name,
          academicIdentity,
          values.description,
          entryFeeInWei,
          entryTime,
          voteTime,
          {
            value: stakeAmountInWei,
          }
        );
        await tx.wait();

        // Reset form
        form.reset();
        toast.success("Contest created successfully!", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });

        router.back();
      } catch (error) {
        console.error("Error creating contest:", error);
        toast.error("Failed to create contest.", {
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
        setIsPending(false);
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
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-3 w-1/2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Startup Pitch Battle"
                    className="bg-[#223c49] border-none h-12"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Add the stake amount field */}
          <FormField
            control={form.control}
            name="stakeAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stake Amount (EDU)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Min: 0.05 EDU"
                      className="bg-[#223c49] border-none h-12 pr-24"
                      {...field}
                      onChange={(e) => {
                        // Allow only numbers and decimal point
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        field.onChange(value);
                      }}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-400">
                      Balance: {`${parseFloat(walletBalance).toFixed(4)} EDU`}
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  Minimum stake required: 0.05 EDU. Your current balance: {`${parseFloat(walletBalance).toFixed(4)} EDU`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Description"
                    className="resize-none bg-[#223c49] border-none h-32"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="entryFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Fee (EDU)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="3"
                    className="bg-[#223c49] border-none h-12"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="entryTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Time (days)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="10"
                    className="bg-[#223c49] border-none h-12"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  How many days should the entry be open for.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="voteTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vote Time (days)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="30"
                    className="bg-[#223c49] border-none h-12"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  How many days should the voting be open for
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="w-full flex justify-end">
          <Button isLoading={isPending} type="submit" className="bg-[#0da6f2]">
            Create contest
          </Button>
        </div>
      </form>
    </Form>
  );
}

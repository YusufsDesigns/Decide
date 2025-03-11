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
import { parseEther } from "ethers";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/context/userContext";

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
});

export function CreateContest() {
  const { signer } = useWallet();
  const contract = useContractWrite(abi);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const { username } = useUser();

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      entryFee: "",
      entryTime: "",
      voteTime: "",
    },
  });

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

    // Convert days to seconds
    const entryTime = convertDaysToSeconds(entryTimeDaysNumber);
    const voteTime = convertDaysToSeconds(voteTimeDaysNumber);

    // Convert entry fee to wei
    let entryFeeInWei;
    try {
      entryFeeInWei = parseEther(values.entryFee); // Convert EDU to wei
    } catch (error) {
      alert("Please enter a valid entry fee in EDU.");
      return;
    }

    if (signer) {
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
        const tx = await contract.createContest(
          values.name,
          username,
          values.description,
          entryFeeInWei,
          entryTime,
          voteTime
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
                <FormLabel>Entre Fee in (EDU)</FormLabel>
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
                <FormLabel>Entry Time in (days)</FormLabel>
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
                <FormLabel>Vote Time in (days)</FormLabel>
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

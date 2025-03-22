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
import { ethers, parseEther } from "ethers";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { pinata } from "@/utils/config";
import { useState } from "react";
import { useUser } from "@/context/userContext";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Entry name must be at least 2 characters.",
  }),
  description: z.string().min(2, {
    message: "Description must be at least 2 characters.",
  }),
});

export function CreateEntry({
  contestId,
  entryFee,
  setUrl,
}: {
  contestId: string;
  entryFee: string;
  setUrl: React.Dispatch<React.SetStateAction<string | undefined>>;
}) {
  const { signer, academicIdentity  } = useWallet();
  const contract = useContractWrite(abi);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsPending(true);
    const upload = await pinata.upload.json({
      description: values.description,
    });

    const ipfsUrl = `https://amaranth-charming-marlin-562.mypinata.cloud/ipfs/${upload.IpfsHash}`;

    if (signer) {
      try {
        // Parse contestId and entryFee
        const id = ethers.getBigInt(contestId);
        const fee = ethers.parseEther(entryFee);

        const tx = await contract.joinContest(
          id,
          values.name.trim(),
          academicIdentity,
          ipfsUrl,
          {
            value: fee,
          }
        );
        await tx.wait();

        // Reset form
        form.reset();
        toast.success("Joined contest successfully!", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
        setUrl(ipfsUrl);
      } catch (error: any) {
        console.error("Transaction failed:", error);

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
        } else {
          // setErrorMessage(`Transaction failed: ${error.message}`);
        }
      } finally {
        // Reset form
        form.reset();
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
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Name of entry"
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
        </div>
        <div className="w-full flex justify-end">
          <Button isLoading={isPending} type="submit" className="bg-[#0da6f2]">
            Join contest
          </Button>
        </div>
      </form>
    </Form>
  );
}

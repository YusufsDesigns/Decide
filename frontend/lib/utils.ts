import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const ContestState = ["OPEN", "VOTING", "CLOSED"]

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateTimeLeft(currentTime: number, entryTimeEnd: number, voteTimeEnd: number, state: string) {
  let timeLeft: number;
  let nextPhase: string;
  if (state === ContestState[0]) {
    timeLeft = Math.max(entryTimeEnd - currentTime, 0); 
    nextPhase = 'VOTING';
  } else if (state === ContestState[1]) {
    timeLeft = Math.max(voteTimeEnd - currentTime, 0);
    nextPhase = 'CLOSED';
  } else {
    timeLeft = 0;
    nextPhase = 'ENDED';
  }
  return { timeLeft, nextPhase };
}

// Helper function to format time left
export function formatTimeLeft(timeLeft: number): string {
  
  const daysLeft = Math.floor(timeLeft / 86400); // 1 day = 86400 seconds
  const hoursLeft = Math.floor((timeLeft % 86400) / 3600);
  const minutesLeft = Math.floor((timeLeft % 3600) / 60);
  const secondsLeft = timeLeft % 60;

  // Only include days in the output if it's greater than 0
  if (daysLeft > 0) {
    return `${daysLeft}d ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
  } else {
    return `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
  }
}

export function divideAmount(amount: number): { fifty: number; thirty: number; twenty: number } {
  return {
    fifty: amount * 0.5,
    thirty: amount * 0.3,
    twenty: amount * 0.2,
  };
}
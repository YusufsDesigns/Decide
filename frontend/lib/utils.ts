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

/**
 * Generates educational-themed usernames from Ethereum addresses.
 * Creates combinations using scholars, concepts, and numbers for a knowledge-oriented identity.
 * 
 * @param address The Ethereum address to generate a username from
 * @returns A deterministic username with an educational theme
 */
export function generateEducationalUsername(address: string): string {
  // Notable scholars, scientists, and thinkers from diverse fields and backgrounds
  const scholars = [
    "Newton", "Curie", "Einstein", "Turing", "Lovelace", "Darwin", "Aristotle", "Hawking",
    "Franklin", "Tesla", "Hopper", "Feynman", "Goodall", "Sagan", "Pythagoras", "Ramanujan",
    "Hypatia", "Mirzakhani", "Bohr", "Germain", "Euclid", "Mendel", "Planck", "Khayyam",
    "Galois", "Pasteur", "Dirac", "Nobel", "Heisenberg", "Gauss", "Bell", "Faraday",
    
    // Added diversity: educators, writers, historians, linguists, and thinkers
    "Socrates", "Confucius", "DaVinci", "Shakespeare", "Descartes", "Archimedes", "Babbage",
    "Fibonacci", "Eratosthenes", "Machiavelli", "Voltaire", "Emerson", "Orwell", "Freire",
    "Dewey", "Montessori", "Douglass", "Angelou", "Thoreau", "Chomsky", "Kant", "Locke",
    "Nietzsche", "Gutenberg", "Copernicus", "Feynman", "Humboldt", "Tagore", "Baldwin",
    "Cervantes", "Bradbury", "Carver", "Hesse", "Twain", "Asimov", "Clarke"
  ];
  

  // Academic fields, concepts, and areas of study
  const concepts = [
    // Core academic & scientific terms
    "Quantum", "Theory", "Logic", "Calculus", "Thesis", "Formula", "Axiom", "Element",
    "Theorem", "Algebra", "Genome", "Insight", "Method", "Scholar", "Inquiry", "Data",
    "Quanta", "Proof", "Cipher", "Neural", "Atomic", "Fusion", "Vector", "Orbit",
    "Matrix", "Paradigm", "Prime", "Catalyst", "Qubit", "Helix", "Factor", "Sequence",
  
    // Broader education themes (subjects, fields, knowledge areas)
    "Philosophy", "History", "Linguistics", "Psychology", "Astronomy", "Botany", 
    "Anthropology", "Ecology", "Sociology", "Cybernetics", "Cognition", "Literature",
    "Mythology", "Economics", "Grammar", "Syntax", "Geometry", "Ethics", "Poetry",
    "Semantics", "Physics", "Geography", "Epistemology", "Coding", "Computation",
  
    // Casual & fun terms related to learning
    "Brainstorm", "Notebook", "Doodle", "Library", "Whiteboard", "Eureka", "ThinkTank",
    "MindMap", "Puzzle", "Trivia", "Explorer", "LabCoat", "Chalkboard", "Epiphany",
    "Campus", "Essay", "QuizMaster", "Lectern", "Syllabus", "Backpack", "LabNotes",
    "Debate", "Textbook", "Curiosity", "TheThinker", "EduVenture", "Hackathon",
  
    // Modern learning & digital age concepts
    "AI", "Algorithm", "NeuralNet", "Metaverse", "Blockchain", "Byte", "CodeLab",
    "Startup", "OpenSource", "E-Learning", "MOOC", "Innovation", "GeniusBar",
    "WhiteHat", "DataViz", "Techie", "SyntaxError", "CloudComputing", "Web3",
    "CyberScholar", "NoCode", "SoftSkills", "Freelancer", "Podcaster", "Blogger",
  
    // Motivational & aspirational words
    "Growth", "Ambition", "Wisdom", "Pioneer", "Visionary", "Trailblazer", "Dreamer",
    "Mentor", "Seeker", "Achiever", "Breakthrough", "Inventor", "FutureProof",
    "Knowledge", "Insightful", "Mindset", "GameChanger", "Innovator", "Creator",
    "Thinker", "Challenger", "Luminary", "Scholarship", "CuriousMind", "Aspiration"
  ];
  

  // Convert address to lowercase and remove '0x' prefix if present
  const cleanAddress = address.toLowerCase().replace(/^0x/, '');
  
  // Determine indices based on address segments
  const scholarIndex = parseInt(cleanAddress.substring(0, 8), 16) % scholars.length;
  const conceptIndex = parseInt(cleanAddress.substring(8, 16), 16) % concepts.length;
  
  // Generate a number suffix (between 1 and 999)
  const numberSuffix = (parseInt(cleanAddress.substring(cleanAddress.length - 8), 16) % 999) + 1;
  
  // Combine to create the username
  return `${concepts[conceptIndex]}${scholars[scholarIndex]}${numberSuffix}`;
}

/**
 * Helper function to create a custom user identifier based on the username
 * This creates a subtle visual style that looks like an academic citation
 */
export function formatAcademicIdentifier(username: string, address: string): string {
  // Split the username to extract its components
  const conceptMatch = username.match(/^([A-Za-z]+)/);
  const scholarMatch = username.match(/[A-Za-z]+(?=[0-9])/);
  const numberMatch = username.match(/[0-9]+$/);
  
  const concept = conceptMatch ? conceptMatch[0] : '';
  const scholar = scholarMatch ? scholarMatch[0] : '';
  const number = numberMatch ? numberMatch[0] : '';
  
  // Format like a citation or academic reference
  const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  return `${concept} et al. (${number}), "${scholar}" [${shortAddress}]`;
}
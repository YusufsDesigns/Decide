"use client";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { jwtDecode } from "jwt-decode";
// context/UserContext.tsx
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

type UserContextType = {
  username: string | null;
  setUsername: (username: string) => void;
};

interface DecodedToken {
  edu_username: string;
  [key: string]: any;
}

// Create the context with a default value
const UserContext = createContext<UserContextType | undefined>(undefined);

// context/UserContext.tsx
type UserProviderProps = {
  children: ReactNode;
};

export const UserProvider = ({ children }: UserProviderProps) => {
  const { authState, ocAuth } = useOCAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (authState?.idToken) {
      const decodedToken = jwtDecode<DecodedToken>(authState?.idToken);

      setUsername(decodedToken.edu_username);
    }
  }, [authState?.idToken, username]);

  return (
    <UserContext.Provider value={{ username, setUsername }}>
      {children}
    </UserContext.Provider>
  );
};

// context/UserContext.tsx
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

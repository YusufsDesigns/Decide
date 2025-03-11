import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shared/Navbar";
import { ToastContainer } from 'react-toastify';
import OCIDProvider from "@/components/providers/OCIDProvider";
import { UserProvider } from "@/context/userContext";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Decide - Decentralized Contest Application',
  description: 'DECIDE is a Web3 contest platform where students and educators propose solutions, vote, and earn rewards, crowdsourcing funds to drive impactful changes in education through innovation and competition.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.className} antialiased bg-[#101d23] text-white`}
      >
        <OCIDProvider>
          <UserProvider>
            <Navbar />
            <div>
              {children}
            </div>
            <ToastContainer />
          </UserProvider>
        </OCIDProvider>
      </body>
    </html>
  );
}

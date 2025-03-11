// app/api/upload-to-pinata/route.ts (if using App Router)
// OR pages/api/upload-to-pinata.js (if using Pages Router)

import { NextResponse } from 'next/server';
import { PinataSDK } from 'pinata-web3';

// Initialize the SDK here (server-side)
const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL
});

export async function POST(request: Request) {
    try {
        const { description } = await request.json();

        if (!description) {
            return Response.json(
                { error: 'Description is required' },
                { status: 400 }
            );
        }

        const upload = await pinata.upload.json({
            description: description,
        });

        return Response.json({
            success: true,
            ipfsHash: upload.IpfsHash,
            pinataUrl: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${upload.IpfsHash}`
        });
    } catch (error) {
        console.error('Pinata upload error:', error);
        return Response.json(
            { error: (error as any).message || 'Failed to upload to Pinata' },
            { status: 500 }
        );
    }
}
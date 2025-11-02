import { NextRequest, NextResponse } from 'next/server';
import client from "@/lib/namespace";

// Define the request body type
interface UpdateAvatarRequest {
    label: string;
    pfpUrl: string;
}
const ENS_NAME = process.env.NEXT_PUBLIC_ENS_NAME;

export async function POST(request: NextRequest) {
    try {
        if (!ENS_NAME) {
            return NextResponse.json({
                error: 'Server misconfiguration: NEXT_PUBLIC_ENS_NAME is required'
            }, { status: 500 })
        }
        const body: UpdateAvatarRequest = await request.json();

        // Validate required fields
        if (!body.label || !body.pfpUrl) {
            return NextResponse.json({
                error: 'Missing required fields: label and pfpUrl are required'
            }, { status: 400 });
        }

        // Validate pfpUrl format
        try {
            new URL(body.pfpUrl);
        } catch {
            return NextResponse.json({
                error: 'Invalid pfpUrl: must be a valid URL'
            }, { status: 400 });
        }

        // Handle both full subname (alice.example.eth) and just label (alice)
        let fullSubname: string;
        if (body.label.includes('.')) {
            // Already a full subname
            fullSubname = body.label.toLowerCase();
        } else {
            // Just a label, append ENS name
            const finalLabel = body.label.toLowerCase();
            fullSubname = `${finalLabel}.${ENS_NAME}`;
        }

        // Update the avatar text record
        const result = await client.addTextRecord(
            fullSubname,
            "avatar", 
            body.pfpUrl
        );

        return NextResponse.json({
            success: true,
            data: result,
            subname: fullSubname,
            avatarUrl: body.pfpUrl,
            message: 'Subname avatar updated successfully',
        });

    } catch (error) {
        console.error('Error updating subname avatar:', error);
        return NextResponse.json({
            error: 'Failed to update subname avatar',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
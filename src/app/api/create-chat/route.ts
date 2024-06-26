// /api/create-chat
import { db } from '../../../lib/db';
import { chats } from '../../../lib/db/schema';
import { NextResponse } from "next/server";
import { loadS3IntoPinecone } from "../../../lib/pinecone";
import { getS3Url } from '@/lib/s3';
import { auth } from "@clerk/nextjs";

export async function POST(req : Request, res: Response) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    try {
        const body = await req.json();
        const { file_key, file_name } = body;

        await loadS3IntoPinecone(file_key);
        
        const chat_id = await db.insert(chats).values({
            fileKey: file_key,
            pdfName: file_name,
            pdfUrl: getS3Url(file_key),
            userId,
        }).returning({
            insertedId: chats.id
        });
        console.log('Inserted chat ID:', chat_id[0].insertedId);
        console.log('chat ID:', chat_id);
        return NextResponse.json({ 
            chats_id: chat_id[0].insertedId
         }, {
            status: 200
         });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error : 'Internal server error' },
            { status : 500  }
        );
    }
}
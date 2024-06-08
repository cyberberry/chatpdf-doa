import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { downloadFromS3 } from './s3-server';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { Document, RecursiveCharacterTextSplitter } from '@pinecone-database/doc-splitter';
import { getEmbeddings } from './embeddings';
import md5 from 'md5';
import { convertToASCII } from './utils';

export const getPineconeClient = () => {
    return new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  };
  
  type PDFPage = {
    pageContent: string;
    metadata: {
      loc: { pageNumber: number };
    };
  };
  
  export async function loadS3IntoPinecone(fileKey: string) {
    const file_name = await downloadFromS3(fileKey);
    if (!file_name) {
      throw new Error("could not download from s3");
    }
    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];
  
    const documents = await Promise.all(pages.map(prepareDocument));
  
    const vectors = await Promise.all(documents.flat().map(embedDocument));
  
    const client = await getPineconeClient();
    const pineconeIndex = await client.index("chat-pdf");
    const namespace = pineconeIndex.namespace(convertToASCII(fileKey));
  
    await namespace.upsert(vectors);
  
    return documents[0];
  }
  
  async function embedDocument(doc: Document) {
    try {
      const embeddings = await getEmbeddings(doc.pageContent);
      const hash = md5(doc.pageContent);
  
      return {
        id: hash,
        values: embeddings,
        metadata: {
          text: doc.metadata.text,
          pageNumber: doc.metadata.pageNumber,
        },
      } as PineconeRecord;
    } catch (error) {
      console.log("error embedding document", error);
      throw error;
    }
  }

function truncateStringByBytes(str: string, length: number) {
    const enc = new TextEncoder();
    return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, length));
}
  
  async function prepareDocument(page: PDFPage) {
    let { pageContent, metadata } = page;
    pageContent = pageContent.replace(/\n/g, "");
    const truncatedText = truncateStringByBytes(pageContent, 256);
    console.log(`Truncated text: ${truncatedText} (length: ${truncatedText.length})`);
    // split the docs
    const splitter = new RecursiveCharacterTextSplitter();
    const docs = await splitter.splitDocuments([
      new Document({
        pageContent,
        metadata: {
          pageNumber: metadata.loc.pageNumber,
          text: truncatedText,
        },
      }),
    ]);
    return docs;
  }
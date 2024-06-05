import { OpenAIApi, Configuration } from 'openai-edge';

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(text: string) {
    try {
        const response = await openai.createEmbedding({
            model: 'text-embedding-3-small',
            input: text.replace(/\n/g, ' '),
        });

        const result = await response.json();
        console.log('result.data[0].embedding', result.data[0].embedding);
        return result.data[0].embedding as number[];
    } catch (error) {
        console.log('getEmbeddings Error' + error);
        throw error;
    }
} 
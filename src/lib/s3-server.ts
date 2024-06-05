import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';

export async function downloadFromS3(file_key: string) {
    try {
        AWS.config.update({
            accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
        });

        const s3 = new AWS.S3({
            region: 'us-west-1',
        });

        const params = {
            Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
            Key: file_key,
        };

        const obj = await s3.getObject(params).promise();

        if (!obj.Body) {
            throw new Error('No data found in S3 object');
        }

        console.log('file_key', file_key);

        const tempDir = path.join(__dirname, '..', '..', 'temp');
        console.log('tempDir', tempDir);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const file_name = path.join(tempDir, `pdf-${Date.now()}.pdf`);
        fs.writeFileSync(file_name, obj.Body as Buffer);
        return file_name;
    } catch (e) {
        console.error('Error in downloadFromS3:', e);
        return null;
    }
}

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import sharp from "sharp";

const client = new S3Client({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
});

const resizeImage = async (buffer) => {
  return sharp(buffer)
    .resize(1600, 900, { fit: "inside", withoutEnlargement: true })
    .toBuffer();
};

const uploadToS3 = async (buffer, mimeType, uploadedBy) => {
  const metadata = await sharp(buffer).metadata();
  const fileExtension = metadata.format || "jpg";
  const Key = `${nanoid()}.${fileExtension}}`;
  const Location = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key,
    Body: buffer,
    ContentType: mimeType,
  };

  try {
    const command = new PutObjectCommand(params);
    await client.send(command);
    return { Key, Location, uploadedBy };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
};

export const uploadImageToS3 = async (files, uploadedBy) => {
  if (!files || files.length === 0) {
    throw new Error("No image file provided");
  }
  const fileArray = Array.isArray(files) ? files : [files];

  const uploadPromises = fileArray.map(async (file) => {
    const resizedBuffer = await resizeImage(file.buffer);

    return uploadToS3(resizedBuffer, file.mimeType, uploadedBy);
  });

  return Promise.all(uploadPromises);
};

export const deleteImageFromS3 = async (key) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new DeleteObjectCommand(params);
    await client.send(command);
  } catch (error) {
    console.error("Error deleting image from S3:", error);
    throw new Error("Error removing image, Try Again!");
  }
};

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new SESClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
});

export const sendWelcomeEmail = async (email) => {
  const params = {
    Source: process.env.EMAIL_FROM,
    ReplyToAddresses: [process.env.EMAIL_TO],
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
                    <html>
                        <p>Welcome to ${process.env.APP_NAME} and thank you for joining us.</p>
                    </html>
                    `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Welcome to ${process.env.APP_NAME}`,
      },
    },
  };
  const command = new SendEmailCommand(params);
  try {
    const data = await client.send(command);
    return data;
  } catch (error) {
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, code) => {
  const params = {
    Source: process.env.EMAIL_FROM,
    ReplyToAddresses: [process.env.EMAIL_TO],
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
                    <html>
                        <p>Here is your temporary password, please change it as soon as you login.</p>
                        <h2 style="color:red;">${code}</h2> 
                    </html>
                    `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Password reset ${process.env.APP_NAME}`,
      },
    },
  };
  const command = new SendEmailCommand(params);
  try {
    const data = await client.send(command);
    return data;
  } catch (error) {
    throw error;
  }
};

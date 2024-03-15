import { createTransport, Transporter } from "nodemailer";
import ejs from "ejs";

interface MailOptions {
  email: string;
  subject: string;
  template: string;
  data: any;
}

export const sendMail = async (options: MailOptions) => {
  try {
    const tranporter: Transporter = createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_MAIL as string,
        pass: process.env.SMTP_PASSWORD as string,
      },
    });

    const { email, subject, template, data } = options;

    const html = (await ejs.renderFile(
      process.cwd() + `/public/mails/${template}.ejs`,
      data
    )) as any;

    const mailOptions = {
      from: process.env.SMTP_MAIL as string,
      to: email,
      subject,
      html,
    };

    await new Promise((resolve, reject) => {
      tranporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          resolve(info);
        }
      });
    });
  } catch (error: any) {
    console.log("[Couldn't send OTP mail]", error);
  }
};

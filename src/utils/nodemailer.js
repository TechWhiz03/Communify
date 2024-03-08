import nodemailer from "nodemailer";

const sendEmail = async ({ emailId, subject, message }) => {
  try {
    // transporter obj establishes a connection with the email service provider (in this case, Gmail)
    // and sends email messages through that provider.
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
    });

    let mail = {
      from: process.env.EMAIL,
      to: emailId,
      subject: subject,
      text: message,
    };

    transporter
      .sendMail(mail)
      .then(() => {
        console.log("Mail sent successfully");
      })
      .catch((err) => {
        console.log(err.message);
      });
  } catch (error) {
    console.log(error.message);
  }
};

export { sendEmail };

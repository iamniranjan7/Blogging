const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1] create transporter

  const transport = nodemailer.createTransport({
    service: "gmail",
    host: process.env.EMAIL_HOST,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });


  const mailOptions = {
    from: "Aditya Navrange<adityanavrange17@gmail.com>",
    to: options.email,
    subject: options.subject,
    html: `<h3>${options.message}</h3>`,
  };

  await transport.sendMail(mailOptions);
};

module.exports = sendEmail;

// const nodemailer = require("nodemailer");

// const sendEmail = async (option) => {
//   const transporter = nodemailer.createTransport({
//     host: process.env.TRAP_HOST,
//     port: process.env.TRAP_PORT,
//     auth: {
//       user: process.env.TRAP_USERNAME,
//       pass: process.env.TRAP_PASSWORD,
//     },
//   });

//   const mailOption = {
//     from: "Aditya Navrange <adityanavrange17@gmail.com>",
//     to: option.email,
//     subject: option.subject,
//     html: `<h3>${option.message}</h3>`,
//   };

//   await transporter.sendMail(mailOption);
// };

// module.exports = sendEmail;

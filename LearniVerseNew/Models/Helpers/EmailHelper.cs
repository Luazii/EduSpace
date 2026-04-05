using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net.Mail;
using System.Net;
using System.Web;
using LearniVerseNew.Models.ApplicationModels;
using System.Threading.Tasks;
using static QRCoder.PayloadGenerator;

namespace LearniVerseNew.Models.Helpers
{
    public class EmailHelper
    {
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;

        public EmailHelper()
        {
            _smtpServer = ConfigurationManager.AppSettings["SmtpServer"];
            _smtpPort = int.Parse(ConfigurationManager.AppSettings["SmtpPort"]);
            _smtpUsername = ConfigurationManager.AppSettings["SmtpUsername"];
            _smtpPassword = ConfigurationManager.AppSettings["SmtpPassword"];
        }

        public async Task SendDeliveryConfirmationEmailWithButtonAsync(string recipientEmail, string orderId, string confirmationUrl)
        {
            string subject = "Confirm Your Delivery";
            string body = $@"
            Dear Customer,<br/><br/>
            We are happy to let you know that your order with ID <strong>{orderId}</strong> has been delivered.<br/><br/>
            Please confirm receipt by clicking the link below:<br/><br/>
            <a href='{confirmationUrl}' style='display: inline-block; padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;'>Confirm Delivery</a><br/><br/>
            Thank you for choosing LearniVerse!<br/><br/>
            Best regards,<br/>
            LearniVerse Team";

            using (MailMessage msg = new MailMessage())
            {
                msg.From = new MailAddress(_smtpUsername);
                msg.To.Add(recipientEmail);
                msg.Subject = subject;
                msg.Body = body;
                msg.IsBodyHtml = true;

                using (SmtpClient smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                {
                    smtpClient.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                    smtpClient.EnableSsl = true;
                    await smtpClient.SendMailAsync(msg);
                }
            }
        }



        public async Task SendTrackingEmailAsync(string recipientEmail, string orderId, string trackingStage)
        {
            string subject = $"Your Order is now {trackingStage}";
            string body = $"Dear Customer,<br><br>Your order with ID {orderId} has reached the {trackingStage} stage.<br/><br/>Thank you for shopping with us!<br/>Best regards,<br/>LearniVerse Team";

            using (MailMessage msg = new MailMessage())
            {
                msg.From = new MailAddress(_smtpUsername);
                msg.To.Add(recipientEmail);
                msg.Subject = subject;
                msg.Body = body;
                msg.IsBodyHtml = true;

                using (SmtpClient smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                {
                    smtpClient.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                    smtpClient.EnableSsl = true;
                    await smtpClient.SendMailAsync(msg); 
                }
            }
        }


        public async Task SendInvoiceAsync(string toEmail, byte[] pdfBytes, string fileName)
        {
            using (MailMessage mailMessage = new MailMessage())
            {
                mailMessage.From = new MailAddress(_smtpUsername);
                mailMessage.To.Add(toEmail);
                mailMessage.Subject = "Your Order Invoice";
                mailMessage.Body = $"Your order has been received.\nPlease find attached the invoice for your order.";
                mailMessage.IsBodyHtml = true; // Set to false if you're sending plain text

                // Attach the PDF to the email
                Attachment attachment = new Attachment(new MemoryStream(pdfBytes), fileName, "application/pdf");
                mailMessage.Attachments.Add(attachment);

                // SMTP client setup
                using (SmtpClient smtp = new SmtpClient(_smtpServer))
                {
                    smtp.Port = _smtpPort;
                    smtp.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                    smtp.EnableSsl = true;

                    // Send the email asynchronously
                    await smtp.SendMailAsync(mailMessage);
                }
            }
        }



        public void SendEmailWithAttachment(string recipientEmail, string filePath, string attachmentName)
        {
            using (MailMessage mailMessage = new MailMessage())
            {
                mailMessage.From = new MailAddress(_smtpUsername);
                mailMessage.To.Add(recipientEmail);
                mailMessage.Subject = "LearniVerse Invoice";
                mailMessage.Body = "Attached is your Invoice for your Enrollment";
                mailMessage.IsBodyHtml = true; // Set to false if you're sending plain text

                // Attach the PDF to the email
                using (FileStream fileStream = new FileStream(filePath, FileMode.Open))
                {
                    Attachment attachment = new Attachment(fileStream, attachmentName, "application/pdf");
                    mailMessage.Attachments.Add(attachment);

                    // Send the email
                    using (SmtpClient smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                    {
                        smtpClient.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                        smtpClient.EnableSsl = true; // Use SSL
                        smtpClient.Send(mailMessage);
                    }
                }
            }
        }

        public void SendEmailApprovalPending(string recipientEmail, string studentName)
        {
            using (MailMessage msg = new MailMessage())
            {
                msg.From = new MailAddress(_smtpUsername);
                msg.To.Add(recipientEmail);
                msg.Subject = "Enrollment Approval Pending";
                msg.Body = $"Dear {studentName},<br><br>Your enrollment is pending approval. You will receive further instructions via email.<br><br>Thank you,<br>LearniVerse";
                msg.IsBodyHtml = true;

                using (SmtpClient smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                {
                    smtpClient.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                    smtpClient.EnableSsl = true;
                    smtpClient.Send(msg);
                }

            }
        }

        public void SendEmailApproved(string recipientEmail, string studentName)
        {
            using (MailMessage msg = new MailMessage())
            {
                msg.From = new MailAddress(_smtpUsername);
                msg.To.Add(recipientEmail);
                msg.Subject = "Enrollment Approved";
                msg.Body = $"Dear {studentName},<br><br>Your enrollment has been approved. You can now access your courses.<br><br>Thank you,<br>LearniVerse";
                msg.IsBodyHtml = true;

                using (SmtpClient smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                {
                    smtpClient.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                    smtpClient.EnableSsl = true;
                    smtpClient.Send(msg);
                }
            }
        }

        public void SendEmailRejected(string recipientEmail, string studentName)
        {
            using (MailMessage msg = new MailMessage())
            {
                msg.From = new MailAddress(_smtpUsername);
                msg.To.Add(recipientEmail);
                msg.Subject = "Enrollment Rejected";
                msg.Body = $"Dear {studentName},\r\n\r\nThank you for your interest in studying at role LearniVerse.\r\n\r\nAfter careful consideration, we regret to inform you that we have chosen to move forward with other candidates whose qualifications more closely align with the requirements of the course.\r\n\r\nWe appreciate the time you invested in the application process and wish you all the best in your future endeavors.\r\n\r\nBest regards,\r\n\r\nRyleigh Sharpley\r\nHead of Department\r\nLearniVerse";
                msg.IsBodyHtml = true;

                using (SmtpClient smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                {
                    smtpClient.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                    smtpClient.EnableSsl = true;
                    smtpClient.Send(msg);
                }
            }
        }

        public void SendEmailBooking(string recipientEmail, Booking booking)
        {
            using (MailMessage msg = new MailMessage())
            {
                msg.From = new MailAddress(_smtpUsername);
                msg.To.Add(recipientEmail);
                msg.Subject = "Booking Confirmation";
                msg.Body = $"Dear {booking.Student.StudentFirstName},<br/><br/>Your booking has been confirmed.<br/><br/>Booking Details:<br/>Room: {booking.RoomID}<br/>Time: {booking.TimeSlot.StartTime}<br/>Booking Date: {booking.BookingDate.ToString("dd/MM/yyyy")}<br/><br/>Thank you for using our booking system.<br/><br/>Best regards,<br/><br/>Your Name<br/>Ryleigh<br/>Learniverse";
                msg.IsBodyHtml = true;

                using (SmtpClient smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                {
                    smtpClient.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                    smtpClient.EnableSsl = true;
                    smtpClient.Send(msg);
                }
            }
        }

        public async Task SendGoalCompletionEmailAsync(string recipientEmail, string goalName)
        {
            await Task.Run(() =>
            {
                using (MailMessage msg = new MailMessage())
                {
                    msg.From = new MailAddress(_smtpUsername);
                    msg.To.Add("ryleighsharpley62@gmail.com");
                    msg.Subject = "Congratulations on Completing Your Workout Goal!";
                    msg.Body = $"Dear Student,<br><br>Congratulations! You have successfully completed your workout goal: <strong>{goalName}</strong>.<br><br>Keep up the great work and stay committed to your fitness journey!<br><br>Best regards,<br>LearniVerse";
                    msg.IsBodyHtml = true;

                    using (SmtpClient smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                    {
                        smtpClient.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                        smtpClient.EnableSsl = true;
                        smtpClient.Send(msg);
                    }
                }
            });
        }
    }
}
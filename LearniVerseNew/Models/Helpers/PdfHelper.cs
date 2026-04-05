using LearniVerseNew.Models.ApplicationModels;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using QuestPDF.Helpers;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using PdfSharp.Drawing;
using PdfSharp.Pdf;
using LearniVerseNew.Models.ApplicationModels.Store_Models;

namespace LearniVerseNew.Models.Helpers
{
    public class PdfHelper
    {
        private static readonly ApplicationDbContext db = new ApplicationDbContext();



        private static byte[] GenerateInvoice(Student student, List<string> courseIdsList, decimal totalAmount, string paymentReference)
        {
            QuestPDF.Settings.License = LicenseType.Community;
            byte[] bytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(1, Unit.Centimetre);


                    page.Header().Text("LearniVerse Invoice")
                    .Bold().FontSize(32)
                    .FontColor(Colors.Black);


                    page.Content().Column(column =>
                    {
                        column.Item().Text($"Faculty: {student.Faculty.FacultyName}, Qualification: {student.Qualification.QualificationID}")
                        .AlignLeft()
                        .FontColor(Colors.Black)
                        .Underline()
                        .LineHeight(10);

                        column.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(1);
                                columns.RelativeColumn(1);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Text("Course")
                                .Bold();
                                header.Cell().Text("Price")
                                .Bold();
                            });

                            foreach (var courseId in courseIdsList)
                            {
                                var course = db.Courses.FirstOrDefault(c => c.CourseID == courseId);
                                table.Cell().Text($"{course.CourseName}").FontColor(Colors.Black);
                                table.Cell().Text($"{course.Price}").FontColor(Colors.Black);
                            }
                        });

                        column.Item().Row(row =>
                        {
                            row.RelativeItem(1).Text($"Total Amount: {totalAmount}")
                            .Bold();
                            row.RelativeItem(1).Text($"Payment Reference: {paymentReference}")
                            .Bold();
                        });

                        column.Item().Text($"Thank you for your payment. {student.StudentFirstName}!")
                        .AlignCenter()
                        .FontSize(10)
                        .Italic();

                    });

                });
            }).GeneratePdf();

            return bytes;
        }

        public static void GenerateAndEmailInvoice(Student student, List<string> courseIdsList, decimal totalAmount, string paymentReference)
        {
            EmailHelper mailer = new EmailHelper();

            byte[] bytes = GenerateInvoice(student, courseIdsList, totalAmount, paymentReference);

            string tempFilePath = Path.Combine(Path.GetTempPath(), $"{student.StudentFirstName}_{student.StudentLastName}_Invoice_{DateTime.Now.ToString("yyyy-MM-dd")}.pdf");

            File.WriteAllBytes(tempFilePath, bytes);

            mailer.SendEmailWithAttachment(student.StudentEmail, tempFilePath, $"{student.StudentFirstName} {student.StudentLastName}-Invoice-{DateTime.Now.ToString("yyyy-MM-dd")}.pdf");

            File.Delete(tempFilePath);
        }

        public byte[] GeneratePdfInvoice(Order order)
        {
            // Ensure OrderItems is not null
            order.OrderItems = order.OrderItems ?? new List<OrderItem>();

            // Create a new PDF document
            PdfDocument document = new PdfDocument();
            document.Info.Title = "Order Invoice";

            // Create an empty page
            PdfPage page = document.AddPage();
            XGraphics gfx = XGraphics.FromPdfPage(page);

            // Set up fonts and styles
            XFont titleFont = new XFont("Verdana", 20, XFontStyleEx.Bold);
            XFont regularFont = new XFont("Verdana", 12, XFontStyleEx.Regular);
            XFont boldFont = new XFont("Verdana", 12, XFontStyleEx.Bold);

            // Add the company information at the top left
            gfx.DrawString("LearniVerse", titleFont, XBrushes.Black, new XRect(50, 40, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);
            gfx.DrawString("Durban, KZN, 4037", regularFont, XBrushes.Black, new XRect(50, 90, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);
            gfx.DrawString("Phone: (123) 456-7890", regularFont, XBrushes.Black, new XRect(50, 110, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);

            // Add the invoice header in the center
            gfx.DrawString("INVOICE", titleFont, XBrushes.Black, new XRect(0, 40, page.Width.Point, page.Height.Point), XStringFormats.TopCenter);

            // Add order details on the right
            gfx.DrawString($"Date: {order.DateOrdered.ToString("MM/dd/yyyy")}", regularFont, XBrushes.Black, new XRect(400, 60, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);
            gfx.DrawString($"Total Amount: {order.TotalPrice:C}", regularFont, XBrushes.Black, new XRect(400, 80, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);

            // Add billing information
            gfx.DrawString("BILL TO:", boldFont, XBrushes.Black, new XRect(50, 140, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);
            gfx.DrawString($"{order.Student.StudentFirstName} {order.Student.StudentLastName}", regularFont, XBrushes.Black, new XRect(50, 160, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);
            gfx.DrawString($"{order.ShippingAddress}", regularFont, XBrushes.Black, new XRect(50, 180, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);
            gfx.DrawString($"{order.City}, {order.State}, {order.PostalCode}", regularFont, XBrushes.Black, new XRect(50, 200, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);
            gfx.DrawString($"Invoice #: {order.OrderID}", regularFont, XBrushes.Black, new XRect(50, 220, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);
            //gfx.DrawString($"Invoice #: {order.OrderID}", boldFont, XBrushes.Black, new XRect(400, 40, page.Width.Point, page.Height.Point), XStringFormats.TopLeft);

            // Draw table header for order items
            int yPosition = 250;
            gfx.DrawString("Product Name", boldFont, XBrushes.Black, 50, yPosition);
            gfx.DrawString("Quantity", boldFont, XBrushes.Black, 250, yPosition);
            gfx.DrawString("Price", boldFont, XBrushes.Black, 350, yPosition);
            gfx.DrawString("Subtotal", boldFont, XBrushes.Black, 450, yPosition);

            // Draw a line under the table headers
            gfx.DrawLine(XPens.Black, 50, yPosition + 5, 500, yPosition + 5);
            yPosition += 20;

            // Draw each order item
            foreach (var item in order.OrderItems)
            {
                gfx.DrawString(item.Product.ProductName, regularFont, XBrushes.Black, 50, yPosition);
                gfx.DrawString(item.Quantity.ToString(), regularFont, XBrushes.Black, 250, yPosition);
                gfx.DrawString(item.Product.Price.ToString("C"), regularFont, XBrushes.Black, 350, yPosition);
                gfx.DrawString((item.Product.Price * item.Quantity).ToString("C"), regularFont, XBrushes.Black, 450, yPosition);
                yPosition += 20;
            }

            // Draw a line above the total
            gfx.DrawLine(XPens.Black, 50, yPosition + 5, 500, yPosition + 5);
            yPosition += 20;

            // Display the total price
            gfx.DrawString($"Total: {order.TotalPrice:C}", boldFont, XBrushes.Black, 350, yPosition);

            // Save the PDF to a MemoryStream
            using (MemoryStream stream = new MemoryStream())
            {
                document.Save(stream, false);
                return stream.ToArray();
            }
        }



    }
}
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using QRCoder;

namespace LearniVerseNew.Models.Helpers
{
    public class TrackingHelper
    {
       
        private readonly List<string> trackingStages = new List<string>
    {
        "Received",
        "Sent-To-Warehouse",
        "At-Warehouse",
        "Out-For-Delivery",
        "Delivered"
    };

        // Get the next tracking stage based on the current stage
        public string GetNextStage(string currentStage)
        {
            int currentIndex = trackingStages.IndexOf(currentStage);

            // If the current stage is not found or it's the last stage, return null
            if (currentIndex == -1 || currentIndex == trackingStages.Count - 1)
            {
                return null;
            }

            // Return the next stage in the sequence
            return trackingStages[currentIndex + 1];
        }

        // Async QR code generation
        public async Task<string> GenerateQRCodeAsync(string trackingStage, string orderId)
        {
            var baseUrl = ConfigurationManager.AppSettings["AppBaseUrl"];
            // Construct the full tracking URL
            string qrData = $"{baseUrl}/Tracking/UpdateOrderStatus?orderId={orderId}&stage={trackingStage}"; //change in prod
            // Generate the QR code
            using (QRCodeGenerator qrGenerator = new QRCodeGenerator())
            {
                QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrData, QRCodeGenerator.ECCLevel.Q);
                using (QRCode qrCode = new QRCode(qrCodeData))
                {
                    using (Bitmap qrCodeImage = qrCode.GetGraphic(20))
                    {
                        // Convert Bitmap to a byte array asynchronously
                        using (MemoryStream ms = new MemoryStream())
                        {
                            qrCodeImage.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                            byte[] qrCodeBytes = ms.ToArray();
                            return await Task.FromResult(Convert.ToBase64String(qrCodeBytes));
                        }
                    }
                }
            }
        }

        // Generate QR code for the "Send to Warehouse" stage
        public Task<string> GenerateSendToWarehouseQRCodeAsync(string orderId)
        {
            return GenerateQRCodeAsync("Sent-To-Warehouse", orderId);
        }

        // Generate QR code for the "At Warehouse" stage
        public Task<string> GenerateAtWarehouseQRCodeAsync(string orderId)
        {
            return GenerateQRCodeAsync("At-Warehouse", orderId);
        }

        // Generate QR code for the "Out for Delivery" stage
        public Task<string> GenerateOutForDeliveryQRCodeAsync(string orderId)
        {
            return GenerateQRCodeAsync("Out-For-Delivery", orderId);
        }

        // Generate QR code for the "Delivered" stage
        public Task<string> GenerateDeliveredQRCodeAsync(string orderId)
        {
            return GenerateQRCodeAsync("Delivered", orderId);
        }
    }
}

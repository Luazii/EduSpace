using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using IronBarCode;

namespace LearniVerseNew.Models.Helpers
{
    public class QRHelper
    {
      public string GenerateQRCode(string blobName)
        {
            BlobHelper helper = new BlobHelper();

            string sas = helper.GetBlobSasUri(blobName).ToString();

            var qrCode = QRCodeWriter.CreateQrCode(sas, 350);
            qrCode.AddAnnotationTextAboveBarcode(blobName);
            
            MemoryStream qrData = new MemoryStream();

            qrData = qrCode.ToPngStream();

            byte[] data = qrData.ToArray();

            return Convert.ToBase64String(data);

        }
    }
}
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs;
using Azure;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Azure.Storage.Sas;
using Azure.Storage;

namespace LearniVerseNew.Models.Helpers
{
    public class BlobHelper
    {
        private readonly BlobServiceClient _blobServiceClient;
        private readonly string _containerName = "classroom-file-container";
        private readonly string _nscContainerName = "nsc-documents";
        private readonly string _submissioncontainerName = "submissions";
        private readonly string _productContainerName = "products";
        public BlobHelper()
        {
            string connectionString = ConfigurationManager.ConnectionStrings["EmpressConnectionString"].ConnectionString; //change this in prod
            _blobServiceClient = new BlobServiceClient(connectionString);

        }

        public async Task CreateContainerAsync()
        {
            var blobContainerClient = _blobServiceClient.GetBlobContainerClient(_containerName);

            if (!await blobContainerClient.ExistsAsync())
            {
                await blobContainerClient.CreateAsync();
                Console.WriteLine($"Container '{_containerName}' created successfully.");
            }
            else
            {
                Console.WriteLine($"Container '{_containerName}' already exists.");
            }
        }

        public IEnumerable<BlobItem> ListBlobs(string courseFolder)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobItems = new List<BlobItem>();

            foreach (BlobItem blobItem in containerClient.GetBlobs(prefix: courseFolder))
            {
                blobItems.Add(blobItem);
            }

            return blobItems;
        }

        public (bool Success, string Uri) UploadNSCBlob(string studentId, string originalFileName, Stream content)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_nscContainerName);

                if (!containerClient.Exists())
                {
                    containerClient.Create();
                }

                // Generate unique blob name with student ID prefix
                string uniqueBlobName = $"{studentId}_{originalFileName}";

                // Get the blob client
                var blobClient = containerClient.GetBlobClient(uniqueBlobName);

                // Check if the blob already exists
                if (blobClient.Exists())
                {
                    return (false, $"Blob '{uniqueBlobName}' already exists in container '{_nscContainerName}'.");
                }

                // Upload the blob
                blobClient.Upload(content, true);

                // Get the URI of the uploaded blob
                var uri = blobClient.Uri.ToString();

                return (true, uri);
            }
            catch (RequestFailedException ex)
            {
                return (false, $"Error uploading file: {ex.Message}");
            }
        }


        public (bool Success, string Uri) UploadBlob(string fileName, Stream content)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);

                if (!containerClient.Exists())
                {
                    containerClient.Create();
                }

                var blobClient = containerClient.GetBlobClient(fileName);
                blobClient.Upload(content, true);

                var uri = blobClient.Uri.ToString();

                return (true, uri);
            }
            catch (RequestFailedException ex)
            {
                return (false, $"Error uploading file: {ex.Message}");
            }
        }

        public Stream DownloadBlobNSC(string studentId,string fileName)
        {
            string uniqueFileName = studentId+"_"+fileName;
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_nscContainerName);
                var blobClient = containerClient.GetBlobClient(uniqueFileName);

                if (!blobClient.Exists())
                {
                    throw new FileNotFoundException("Blob not found.");
                }

                // Create a memory stream to store the blob content
                var memoryStream = new MemoryStream();

                // Download the blob content to the memory stream
                blobClient.DownloadTo(memoryStream);

                // Reset the position of the memory stream to the beginning
                memoryStream.Seek(0, SeekOrigin.Begin);

                // Return the memory stream containing the blob content
                return memoryStream;
            }
            catch (RequestFailedException ex)
            {
                throw new Exception($"Error downloading blob: {ex.Message}");
            }
        }

        public Stream DownloadBlob(string fileName)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
                var blobClient = containerClient.GetBlobClient(fileName);

                if (!blobClient.Exists())
                {
                    throw new FileNotFoundException("Blob not found.");
                }

                // Create a memory stream to store the blob content
                var memoryStream = new MemoryStream();

                // Download the blob content to the memory stream
                blobClient.DownloadTo(memoryStream);

                // Reset the position of the memory stream to the beginning
                memoryStream.Seek(0, SeekOrigin.Begin);

                // Return the memory stream containing the blob content
                return memoryStream;
            }
            catch (RequestFailedException ex)
            {
                throw new Exception($"Error downloading blob: {ex.Message}");
            }
        }

        public bool DeleteBlob(string fileName)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
                var blobClient = containerClient.GetBlobClient(fileName);

                if (blobClient.Exists())
                {
                    blobClient.Delete();
                    return true;
                }
                else
                {
                    return false;
                }
            }
            catch (RequestFailedException ex)
            {
                // Handle exceptions
                Console.WriteLine($"Error deleting blob: {ex.Message}");
                return false;
            }
        }

        public bool DeleteProductBlob(string fileName)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_productContainerName);
                var blobClient = containerClient.GetBlobClient(fileName);

                if (blobClient.Exists())
                {
                    blobClient.Delete();
                    return true;
                }
                else
                {
                    return false;
                }
            }
            catch (RequestFailedException ex)
            {
                // Handle exceptions
                Console.WriteLine($"Error deleting blob: {ex.Message}");
                return false;
            }
        }


        public (bool Success, string name, string url) UploadProductBlob(string originalFileName, Stream content)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_productContainerName);

                if (!containerClient.Exists())
                {
                    containerClient.Create();
                }

                // Get the blob client
                var blobClient = containerClient.GetBlobClient(originalFileName);

                // Check if the blob already exists
                if (blobClient.Exists())
                {
                    return (false, $"Blob '{originalFileName}' already exists in container '{_productContainerName}'.", null);
                }

                // Upload the blob
                blobClient.Upload(content, true);

                // Get the blob URL
                var blobUrl = blobClient.Uri.AbsoluteUri;

                return (true, originalFileName, blobUrl);
            }
            catch (RequestFailedException ex)
            {
                return (false, $"Error uploading file: {ex.Message}", null);
            }
        }

        public async Task<byte[]> RetriveProductPhotoAsync(string photoName)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_productContainerName);
            var blobClient = containerClient.GetBlobClient(photoName);

            using (var memoryStream = new MemoryStream())
            {
                await blobClient.DownloadToAsync(memoryStream);
                return memoryStream.ToArray();
            }
        }

        public Uri GetBlobSasUri(string blobName)
        {
            // Get a reference to the blob container
            BlobContainerClient containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);

            // Get a reference to the blob
            BlobClient blobClient = containerClient.GetBlobClient(blobName);

            // Create the SAS token parameters
            BlobSasBuilder sasBuilder = new BlobSasBuilder
            {
                BlobContainerName = _containerName,
                BlobName = blobName,
                Resource = "b", // "b" indicates the SAS applies to the blob resource
                ExpiresOn = DateTimeOffset.UtcNow.AddHours(1), // Expiry time for the SAS token
                                                               // Set permissions for the SAS token
                StartsOn = DateTimeOffset.UtcNow.AddMinutes(-5), // Start time for the SAS token
                Protocol = SasProtocol.Https // HTTPS should be used for security reasons
            };

            // Set permissions for the SAS token
            sasBuilder.SetPermissions(BlobSasPermissions.Read);

            // Generate the SAS token
            string sasToken = sasBuilder.ToSasQueryParameters(new StorageSharedKeyCredential("empressstorage", "REPLACE_WITH_AZURE_STORAGE_KEY")).ToString(); //change in prod

            // Construct the full URI with SAS token
            UriBuilder uriBuilder = new UriBuilder(blobClient.Uri)
            {
                Query = sasToken
            };

            return uriBuilder.Uri;
        }

        public async Task<(bool Success, string Uri)> UploadSubmissionAsync(string assignmentId, string studentId, string fileName, Stream content)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_submissioncontainerName);
                if (!await containerClient.ExistsAsync())
                {
                    await containerClient.CreateAsync();
                }

                string uniqueBlobName = $"submissions/{assignmentId}/{studentId}_{fileName}";
                var blobClient = containerClient.GetBlobClient(uniqueBlobName);

                if (await blobClient.ExistsAsync())
                {
                    return (false, $"Blob '{uniqueBlobName}' already exists.");
                }

                await blobClient.UploadAsync(content, true);
                return (true, blobClient.Uri.ToString());
            }
            catch (Exception ex)
            {
                return (false, $"Error uploading file: {ex.Message}");
            }
        }

        public List<(string BlobName, Uri BlobUri)> ListAssignmentSubmissions(string assignmentId)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_submissioncontainerName);
                var submissions = new List<(string BlobName, Uri BlobUri)>();

                foreach (var blobItem in containerClient.GetBlobs(prefix: $"submissions/{assignmentId}/"))
                {
                    var blobClient = containerClient.GetBlobClient(blobItem.Name);
                    submissions.Add((blobItem.Name, blobClient.Uri));
                }

                return submissions;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error listing blobs: {ex.Message}");
            }
        }

      

        public async Task<Dictionary<string, Stream>> DownloadAssignmentSubmissionsAsync(string assignmentId)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_submissioncontainerName);
            var blobs = ListAssignmentSubmissions(assignmentId);
            var result = new Dictionary<string, Stream>();

            foreach (var (blobName, blobUri) in blobs)
            {
                var blobClient = containerClient.GetBlobClient(blobName);
                var memoryStream = new MemoryStream();
                await blobClient.DownloadToAsync(memoryStream);
                memoryStream.Seek(0, SeekOrigin.Begin);
                result.Add(blobName, memoryStream);
            }

            return result;
        }

    }
}
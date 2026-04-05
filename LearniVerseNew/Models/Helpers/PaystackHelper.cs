using LearniVerseNew.Models.ApplicationModels.Store_Models;
using Newtonsoft.Json;
using PayStack.Net;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace LearniVerseNew.Models.Helpers
{
    public class PaystackHelper
    {
        private readonly PayStackApi _api;
        private readonly HttpClient _httpClient;
        public PaystackHelper()
        {
            var secretKey = ConfigurationManager.AppSettings["PayStackSecret"];
            _api = new PayStackApi(secretKey);

            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("Authorization", "Bearer " + ConfigurationManager.AppSettings["PayStackSecret"]);
        }
    
        public TransactionInitializeResponse InitializeTransaction(string email, int amountInKobo, string callbackUrl)
        {
            // Initialize a transaction for ZAR
            var request = new TransactionInitializeRequest
            {
                Email = email,
                AmountInKobo = amountInKobo,
                Currency = "ZAR",
                CallbackUrl = callbackUrl
            };

            return _api.Transactions.Initialize(request);
        }


        // Initialize a transaction for cart checkout
        public TransactionInitializeResponse InitializeTransactionForCheckout(string email, decimal cartTotal, string callbackUrl)
        {
            // Convert cart total to kobo (if using NGN or ZAR, multiply by 100)
            int amountInKobo = (int)(cartTotal * 100);

            // Initialize the Paystack transaction
            var request = new TransactionInitializeRequest
            {
                Email = email,
                AmountInKobo = amountInKobo,
                Currency = "ZAR", // Change currency if needed
                CallbackUrl = callbackUrl
            };

            // Call Paystack API to initialize the transaction
            return _api.Transactions.Initialize(request);
        }


        public async Task<string> RefundTransactionAsync(string reference, decimal amountInRands = 0)
        {
            // Convert Rands to Kobo (multiply by 100)
            int amountInKobo = (int)(amountInRands * 100);

            var refundRequest = new
            {
                transaction = reference, // Paystack transaction reference
                amount = amountInKobo > 0 ? amountInKobo : (int?)null // Optional: specify an amount if partial refund, otherwise full refund
            };

            var json = JsonConvert.SerializeObject(refundRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("https://api.paystack.co/refund", content);

            if (response.IsSuccessStatusCode)
            {
                var responseData = await response.Content.ReadAsStringAsync();
                return responseData; // Handle the response as needed
            }
            else
            {
                throw new Exception($"Refund failed: {response.ReasonPhrase}");
            }
        }



        public TransactionVerifyResponse VerifyTransaction(string reference)
        {
            return _api.Transactions.Verify(reference);
        }

        //subscriptions
        public TransactionInitializeResponse InitializeSubscriptionTransaction(string email, string planCode, string callbackUrl)
        {
            var request = new TransactionInitializeRequest
            {
                Email = email,
                AmountInKobo = 10, // This amount will be overridden by the plan code
                Currency = "ZAR",
                CallbackUrl = callbackUrl,
                Plan = planCode // Pass the plan code to subscribe the customer
            };

            return _api.Transactions.Initialize(request);
        }


    }
}
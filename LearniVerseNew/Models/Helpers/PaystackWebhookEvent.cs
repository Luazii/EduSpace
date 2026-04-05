using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.Helpers
{
    public class PaystackWebhookEvent
    {
        public string Event { get; set; }  // The type of the event, e.g., "refund.processed", "refund.failed", etc.
        public PaystackWebhookData Data { get; set; }  // Contains the actual data related to the event

        public class PaystackWebhookData
        {
            [JsonProperty("transaction_reference")]
            public string TransactionReference { get; set; }  // Transaction reference or refund reference
            public decimal Amount { get; set; }    // Amount refunded or charged
            public string Currency { get; set; }   // Currency of the transaction
            public string Status { get; set; }     // Status, e.g., "success", "failed", "pending"
            public string OrderID { get; set; }    // Custom field for the associated Order ID, if included in the webhook
            public DateTime TransactionDate { get; set; }  // Date of the transaction
        }
    }
}
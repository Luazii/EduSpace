using Newtonsoft.Json;
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
    public class ShippoHelper
    {
        private readonly HttpClient _client;
        private readonly string _apiKey;

        public ShippoHelper()
        {
            _client = new HttpClient();
            _apiKey = ConfigurationManager.AppSettings["ShippoKey"];

            // Add Shippo API authorization header
            _client.DefaultRequestHeaders.Add("Authorization", $"ShippoToken {_apiKey}");
        }

        // Create a shipment
        public async Task<string> CreateShipmentAsync(dynamic shipmentData)
        {
            var content = new StringContent(JsonConvert.SerializeObject(shipmentData), Encoding.UTF8, "application/json");
            var response = await _client.PostAsync("https://api.goshippo.com/shipments/", content);
            response.EnsureSuccessStatusCode(); // Throw an exception if the response is not successful
            return await response.Content.ReadAsStringAsync();
        }

        // Track a shipment
        public async Task<string> TrackShipmentAsync(string carrier, string trackingNumber)
        {
            var response = await _client.GetAsync($"https://api.goshippo.com/tracks/{carrier}/{trackingNumber}/");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        // Get rates for a shipment
        public async Task<string> GetRatesAsync(string shipmentId)
        {
            var response = await _client.GetAsync($"https://api.goshippo.com/shipments/{shipmentId}/rates/");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        // Create a label for a shipment
        public async Task<string> CreateLabelAsync(dynamic labelData)
        {
            var content = new StringContent(JsonConvert.SerializeObject(labelData), Encoding.UTF8, "application/json");
            var response = await _client.PostAsync("https://api.goshippo.com/transactions/", content);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }
    }
}
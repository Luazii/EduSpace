using LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models;
using Newtonsoft.Json;
using PayStack.Net;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace LearniVerseNew.Models.Helpers
{
    public class FatsecretHelper
    {
        private readonly HttpClient _client;
        private readonly string _apiKey;
        private readonly string _apiSecret;

        public FatsecretHelper(HttpClient client)
        {
            _client = client;
            _client.BaseAddress = new Uri("https://platform.fatsecret.com/rest/server.api");
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _apiKey = ConfigurationManager.AppSettings["ConsumerKey"];
            _apiSecret = ConfigurationManager.AppSettings["Secret"];
        }

        private string GenerateOAuthSignature(string baseString, string key)
        {
            var encoding = new ASCIIEncoding();
            byte[] keyBytes = encoding.GetBytes(key);
            byte[] messageBytes = encoding.GetBytes(baseString);
            using (var hmacsha1 = new HMACSHA1(keyBytes))
            {
                byte[] hashmessage = hmacsha1.ComputeHash(messageBytes);
                return Convert.ToBase64String(hashmessage);
            }
        }

        private string GenerateOAuthParameters(string query)
        {
            var oauthNonce = Convert.ToBase64String(new ASCIIEncoding().GetBytes(DateTime.Now.Ticks.ToString()));
            var oauthTimestamp = Convert.ToInt64((DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds).ToString();
            var parameters = new SortedDictionary<string, string>
        {
            { "oauth_consumer_key", _apiKey },
            { "oauth_nonce", oauthNonce },
            { "oauth_signature_method", "HMAC-SHA1" },
            { "oauth_timestamp", oauthTimestamp },
            { "oauth_version", "1.0" },
            { "method", "foods.search" },
            { "search_expression", query },
            { "format", "json" }
        };

            var baseString = string.Join("&", parameters.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
            var signatureBaseString = $"GET&{Uri.EscapeDataString(_client.BaseAddress.ToString())}&{Uri.EscapeDataString(baseString)}";
            var oauthSignature = GenerateOAuthSignature(signatureBaseString, _apiSecret + "&");

            parameters.Add("oauth_signature", oauthSignature);

            return string.Join("&", parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
        }


        public async Task<APIResponse> SearchFoodsAsync(string query)
        {
            var oauthParameters = GenerateOAuthParameters(query);
            var requestUri = $"?{oauthParameters}";

            var response = await _client.GetAsync(requestUri);
            if (response.IsSuccessStatusCode)
            {
                var jsonResponse = await response.Content.ReadAsStringAsync();
                Console.WriteLine(jsonResponse); // Log the response

                var foodResponse = JsonConvert.DeserializeObject<APIResponse>(jsonResponse);
               

                return foodResponse;
            }
            else
            {
                throw new Exception("Error occurred while searching for foods.");
            }
        }

    }
}
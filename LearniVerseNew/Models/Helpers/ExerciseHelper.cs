using LearniVerseNew.Models.ApplicationModels.Regimen_Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.Razor.Tokenizer.Symbols;

namespace LearniVerseNew.Models.Helpers.Regimen_Models
{
    public class ExerciseHelper
    {
        private HttpClient _client;
        private readonly string _secret;
        private readonly string _Uri;

        public ExerciseHelper(HttpClient client) 
        {
            _Uri = ConfigurationManager.AppSettings["NinjaApiUrl"];
            _client = client;
            _client.BaseAddress = new Uri(_Uri);
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _secret = ConfigurationManager.AppSettings["ExcerciseAPIKey"];
            
        }

        public string GenerateRequestUri(string keyword)
        {
            return $"{_Uri}?muscle={keyword}";
        }

        public async Task<List<ExerciseResponse>> FindExercisesAsync(string keyword)
        {
            var requestUri = GenerateRequestUri(keyword);

            var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
            request.Headers.Add("X-Api-Key", _secret); 

            var response = await _client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var jsonResponse = await response.Content.ReadAsStringAsync();

                var exerciseResponse = JsonConvert.DeserializeObject<List<ExerciseResponse>>(jsonResponse);

                return exerciseResponse;
            }

            throw new Exception("Error occurred while searching for exercises.");
        }



    }
}
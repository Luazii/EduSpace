using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Regimen_Models
{
    public class ExerciseResponse
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("muscle")]
        public string Muscle { get; set; }

        [JsonProperty("equipment")]
        public string Equipment { get; set; }

        [JsonProperty("instructions")]
        public string Instructions { get; set; }
    }
}
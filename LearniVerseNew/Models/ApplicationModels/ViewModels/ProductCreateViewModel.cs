using LearniVerseNew.Models.ApplicationModels.Store_Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class ProductCreateViewModel
    {
        public string ProductName { get; set; }

        public decimal Price { get; set; }

        public string Description { get; set; }

        public int QuantityInStock { get; set; }

        public string ImageName { get; set; }

        public HttpPostedFileBase ImageFile { get; set; }
        public Guid CategoryID { get; set; }

    }
}
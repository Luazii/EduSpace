using LearniVerseNew.Models.ApplicationModels.Store_Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class WarehouseDashboardViewModel
    {
        public List<Order> LatestOrders { get; set; }
        public List<Order> UnscannedOrders { get; set; }
        public List<TotalOrdersByDay> OrdersByDay { get; set; }
        public List<Order> AtWarehouseOrders { get; set; }
        public List<Order> OutForDeliveryOrders { get; set; }
    }

    public class TotalOrdersByDay
    {
        public DateTime? Date { get; set; }
        public int TotalOrders { get; set; }
    }
}
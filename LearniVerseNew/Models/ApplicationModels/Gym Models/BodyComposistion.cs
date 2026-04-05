using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Gym_Models
{
    public class BodyComposistion
    {
        [Key]
        public Guid BodyCompositionID { get; set; }
        public DateTime DateRecorded { get; set; }
        public double Height { get; set; } // in m
        public double Weight { get; set; } //in kg
        public double BMI { get; set; }
        public string Status { get; set; }
        public double BMR { get; set; }
        public int BodyFatPercentage { get; set; } 
        public double LeanMuscleMass { get; set; } //in kg

        public string StudentID { get; set; }
        public virtual Student Student { get; set; }


        //Methods
        public double CalcBMI(double height, double weight)
        {
            BMI = weight/ Math.Pow(height, 2);
            return Math.Round(BMI, 2);
        }

        public double CalculateBMR(double height, double weight, string gender, DateTime dob)
        {
            int age = DateTime.Now.Year - dob.Year;
            if (gender == "Male")
            {
                BMR = 88.362 + (13.397 * weight) + (4.799 * (height*100)) - (5.677 * age);
                return Math.Round(BMR, 0);
            }
            else
            {
                BMR = 447.593 + (9.247 * weight) + (3.098 * (height*100)) - (4.330 * age);
                return Math.Round(BMR,0);
            }
        }

        public int CalculateBF(double bmi, string gender, DateTime dob)
        {
            int age = DateTime.Now.Year - dob.Year;
            if (gender == "Male")
            {
                BodyFatPercentage = Convert.ToInt32((1.20 * bmi) + (0.23 * age) - 16.2);
                return BodyFatPercentage;
            }
            else
            {
                BodyFatPercentage = Convert.ToInt32((1.20 * bmi) + (0.23 * age) - 5.4);
                return BodyFatPercentage;
            }
        }

        public double CalcLeanMuscleMass(double weight, double bodyFatPercentage)
        {
            LeanMuscleMass =  weight * (1 - bodyFatPercentage / 100);
            return LeanMuscleMass;
        }
    }
}
// app/mock/departmentDesignations.ts

// Department seed data
export const DEPARTMENT_SEED = [
    {
      name: "Marketing",
      description: "Handles marketing and promotion activities",
      active: true
    },
    {
      name: "Sales",
      description: "Handles customer acquisition and sales activities",
      active: true
    },
    {
      name: "Administration",
      description: "Handles administrative and operational functions",
      active: true
    },
    {
      name: "Pantry",
      description: "Manages food and refreshment services",
      active: true
    },
    {
      name: "Quality",
      description: "Ensures product and service quality",
      active: true
    },
    {
      name: "Director",
      description: "Comprises of company directors and leadership",
      active: true
    }
  ];
  
  // Designation seed data
  export const DESIGNATION_SEED = [
    {
      name: "Sales Manager",
      department: "Sales",
      description: "Manages sales team and strategies",
      active: true
    },
    {
      name: "Sales Head",
      department: "Sales",
      description: "Leads the entire sales division",
      active: true
    },
    {
      name: "SEO Analyst",
      department: "Marketing",
      description: "Handles search engine optimization strategies",
      active: true
    },
    {
      name: "Quality Analyst",
      department: "Quality",
      description: "Analyzes and ensures quality standards",
      active: true
    },
    {
      name: "Receptionist",
      department: "Administration",
      description: "Manages front desk operations",
      active: true
    },
    {
      name: "Pre Sales Associate",
      department: "Sales",
      description: "Supports sales team in pre-sales activities",
      active: true
    },
    {
      name: "Human Resource Manager",
      department: "Administration",
      description: "Manages HR functions and employee relations",
      active: true
    },
    {
      name: "Graphic Designer",
      department: "Marketing",
      description: "Creates visual content and design assets",
      active: true
    },
    {
      name: "Full Stack Developer",
      department: "Administration",
      description: "Develops and maintains digital applications",
      active: true
    }
  ];
  
  // Map departments to their designations for easy access
  export const DEPARTMENT_DESIGNATIONS = {
    "Marketing": ["SEO Analyst", "Graphic Designer"],
    "Sales": ["Sales Manager", "Sales Head", "Pre Sales Associate"],
    "Administration": ["Receptionist", "Human Resource Manager", "Full Stack Developer"],
    "Quality": ["Quality Analyst"],
    "Pantry": [],
    "Director": []
  };
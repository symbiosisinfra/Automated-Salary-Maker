"use client";

import { useState, useEffect } from "react";
import { Building, AlertTriangle } from "lucide-react";

// Import custom components
import ProjectCard from "./ProjectCard";
import ProjectsSearchFilter from "./ProjectsSearchFilter";
import ProjectHeader from "./ProjectHeader";

// Define the project type based on the MongoDB structure
interface Project {
  _id: string; // Changed from id to _id to match MongoDB
  category: string;
  projectName: string;
  developerName: string;
  location: string;
  totalLandParcel: string;
  numberOfTowers: string;
  numberOfFloors: string;
  totalNumberOfUnits: string | number;
  typologyAndSize: string[];
  constructionStatus: string;
  possessionDate: string;
  pricePerSqFt: string;
  baseUnitPrice: string;
  additionalCharges: string;
  totalStartingPrice: string;
  paymentPlan: string;
  clubhouseArea: string;
  nearbyLandmarks: string[];
  projectUSP: string[];
  rmContactDetails: string;
  nearbySocieties: string[];
  region: string;
  image: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState(""); // Default to Gurgaon
  const [developerFilter, setDeveloperFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priceFilter, setPriceFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Array of filter options (can be fetched from API OPTIONS endpoint later)
  const [categories, setCategories] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [developers, setDevelopers] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  // Fetch projects data and filter options
  useEffect(() => {
    const fetchProjectsAndOptions = async () => {
      try {
        setIsLoading(true);

        // Fetch filter options first
        const optionsResponse = await fetch("/api/projects", {
          method: "OPTIONS",
        });

        if (optionsResponse.ok) {
          const optionsData = await optionsResponse.json();
          setCategories(optionsData.categories || []);
          setRegions(optionsData.regions || []);
          setDevelopers(optionsData.developers || []);
          setStatuses(optionsData.statuses || []);
        }

        // Then fetch projects with region filter for Gurgaon
        const projectsUrl =
          regionFilter !== "All"
            ? `/api/projects?region=${regionFilter}`
            : "/api/projects";

        const projectsResponse = await fetch(projectsUrl);

        if (!projectsResponse.ok) {
          throw new Error(
            `Failed to fetch projects: ${projectsResponse.statusText}`
          );
        }

        const projectsData = await projectsResponse.json();
        setProjects(projectsData);

        // Apply initial filters
        const initialFiltered = applyFilters(projectsData);
        setFilteredProjects(initialFiltered);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError("Unable to load projects. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectsAndOptions();
  }, [regionFilter]); // Refetch when region filter changes

  // Apply all filters
  const applyFilters = (projectsToFilter: Project[]) => {
    let result = [...projectsToFilter];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (project) =>
          project.projectName.toLowerCase().includes(query) ||
          project.location.toLowerCase().includes(query) ||
          project.developerName.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== "All") {
      result = result.filter((project) => project.category === categoryFilter);
    }

    // Apply developer filter
    if (developerFilter !== "All") {
      result = result.filter(
        (project) => project.developerName === developerFilter
      );
    }

    // Apply status filter
    if (statusFilter !== "All") {
      result = result.filter((project) =>
        project.constructionStatus.includes(statusFilter)
      );
    }

    // Apply price filter
    if (priceFilter !== "All") {
      switch (priceFilter) {
        case "Under 1 Cr":
          result = result.filter((project) => {
            const price = extractPrice(project.totalStartingPrice);
            return price < 1;
          });
          break;
        case "1-2 Cr":
          result = result.filter((project) => {
            const price = extractPrice(project.totalStartingPrice);
            return price >= 1 && price <= 2;
          });
          break;
        case "2-5 Cr":
          result = result.filter((project) => {
            const price = extractPrice(project.totalStartingPrice);
            return price > 2 && price <= 5;
          });
          break;
        case "5-10 Cr":
          result = result.filter((project) => {
            const price = extractPrice(project.totalStartingPrice);
            return price > 5 && price <= 10;
          });
          break;
        case "10+ Cr":
          result = result.filter((project) => {
            const price = extractPrice(project.totalStartingPrice);
            return price > 10;
          });
          break;
      }
    }

    // Apply sorting
    result = sortProjects(result, sortBy);

    return result;
  };

  // Update filtered projects when filter states change
  useEffect(() => {
    if (projects.length > 0) {
      const filtered = applyFilters(projects);
      setFilteredProjects(filtered);
    }
  }, [
    projects,
    searchQuery,
    categoryFilter,
    developerFilter,
    statusFilter,
    priceFilter,
    sortBy,
  ]);

  // Sort projects
  const sortProjects = (
    projectsToSort: Project[],
    sortByValue: string
  ): Project[] => {
    return [...projectsToSort].sort((a, b) => {
      switch (sortByValue) {
        case "priceLowToHigh":
          return (
            extractPrice(a.totalStartingPrice) -
            extractPrice(b.totalStartingPrice)
          );
        case "priceHighToLow":
          return (
            extractPrice(b.totalStartingPrice) -
            extractPrice(a.totalStartingPrice)
          );
        case "newest":
          // Sort by possession date (closer dates first)
          const dateA = parsePossessionDate(a.possessionDate);
          const dateB = parsePossessionDate(b.possessionDate);
          if (dateA && dateB) {
            return dateA.getTime() - dateB.getTime();
          }
          return 0;
        default:
          return 0;
      }
    });
  };

  // Utility function to extract price as number from string
  const extractPrice = (priceString: string): number => {
    // Extract numeric value (assume format like "2.5 Cr" or "5.1 Cr")
    if (!priceString) return 0;

    if (priceString.includes("Cr") || priceString.includes("cr")) {
      const matches = priceString.match(/(\d+(\.\d+)?)/);
      if (matches && matches[1]) {
        return parseFloat(matches[1]);
      }
    } else if (
      priceString.includes("Lac") ||
      priceString.includes("lac") ||
      priceString.includes("L")
    ) {
      const matches = priceString.match(/(\d+(\.\d+)?)/);
      if (matches && matches[1]) {
        return parseFloat(matches[1]) / 100; // Convert lacs to crores
      }
    }

    return 0;
  };

  // Parse possession date string to Date object
  const parsePossessionDate = (dateString: string): Date | null => {
    if (!dateString) return null;

    // Check for "Ready to Move In" or similar phrases
    if (dateString.toLowerCase().includes("ready")) {
      return new Date(); // Current date
    }

    // Try to extract year
    const yearMatch = dateString.match(/\b(20\d\d)\b/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[1]), 0, 1); // January 1st of the matched year
    }

    // Default fallback
    return null;
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All");
    setDeveloperFilter("All");
    setStatusFilter("All");
    setPriceFilter("All");
    setSortBy("newest");
    // Don't reset region filter as we want to keep focusing on Gurgaon
  };

  // Helper function to format price
  const formatPrice = (price: string) => {
    // Check if price already has Cr or Lac
    if (
      price.includes("Cr") ||
      price.includes("cr") ||
      price.includes("Lac") ||
      price.includes("lac") ||
      price.includes("L")
    ) {
      return price;
    }

    // Try to extract numeric value
    const match = price.match(/(\d+(\.\d+)?)/);
    if (!match) return price;

    const numericValue = parseFloat(match[1]);
    if (numericValue >= 1 && numericValue < 100) {
      return `${numericValue} Cr`;
    } else if (numericValue >= 100) {
      return `${(numericValue / 100).toFixed(1)} Cr`;
    } else {
      return `${numericValue * 100} Lac`;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen py-12 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen py-12 bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Error Loading Projects
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <ProjectHeader />

      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-8">
        {/* Search and Filter Bar */}
        <ProjectsSearchFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          regionFilter={regionFilter}
          setRegionFilter={setRegionFilter}
          developerFilter={developerFilter}
          setDeveloperFilter={setDeveloperFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priceFilter={priceFilter}
          setPriceFilter={setPriceFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          resetFilters={resetFilters}
          categories={categories}
          regions={regions}
          developers={developers}
          statuses={statuses}
        />

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-700">
            Showing{" "}
            <span className="font-semibold">{filteredProjects.length}</span>{" "}
            {regionFilter !== "All" ? regionFilter : ""} projects
            {(searchQuery ||
              categoryFilter !== "All" ||
              developerFilter !== "All" ||
              statusFilter !== "All" ||
              priceFilter !== "All") &&
              " matching your filters"}
          </p>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project._id}
                project={{ ...project, id: project._id }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Projects Found
            </h3>
            <p className="text-gray-500 mb-6">
              No projects match your current filter criteria. Try adjusting your
              filters or search terms.
            </p>
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

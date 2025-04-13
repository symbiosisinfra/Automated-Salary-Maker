import React, { useState } from "react";
import { Search, Filter, ChevronDown, X } from "lucide-react";

interface ProjectsSearchFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  regionFilter: string;
  setRegionFilter: (region: string) => void;
  developerFilter: string;
  setDeveloperFilter: (developer: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priceFilter: string;
  setPriceFilter: (price: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  resetFilters: () => void;
  categories: string[];
  regions: string[];
  developers: string[];
  statuses: string[];
}

const ProjectsSearchFilter: React.FC<ProjectsSearchFilterProps> = ({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  regionFilter,
  setRegionFilter,
  developerFilter,
  setDeveloperFilter,
  statusFilter,
  setStatusFilter,
  priceFilter,
  setPriceFilter,
  sortBy,
  setSortBy,
  showFilters,
  setShowFilters,
  resetFilters,
  categories,
  regions,
  developers,
  statuses,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Search Box - Updated with purple focus */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="h-5 w-5 text-purple-400" />
          </div>
          <input
            type="text"
            placeholder="Search by project name, location, or developer..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition duration-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort Dropdown - Updated with purple focus */}
        <div className="md:w-48">
          <select
            className="block w-full text-gray-700 pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 sm: rounded-md"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="priceLowToHigh">Price: Low to High</option>
            <option value="priceHighToLow">Price: High to Low</option>
          </select>
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center px-4 py-2 border border-purple-200 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition duration-150"
        >
          <Filter className="h-5 w-5 mr-2" />
          <span>Filters</span>
          <ChevronDown
            className={`h-4 w-4 ml-1 transition-transform ${
              showFilters ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {/* Category Filter - Updated with purple focus */}
            <div>
              <label className="block  font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                className="block w-full text-gray-700 pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 sm: rounded-md"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Filter - Updated with purple focus */}
            <div>
              <label className="block  font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                className="block text-gray-700 w-full pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 sm: rounded-md"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
              >
                <option value="All">All Locations</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter - Updated with purple focus */}
            <div>
              <label className="block  font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="block text-gray-700 w-full pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 sm: rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter - Updated with purple focus */}
            <div>
              <label className="block  font-medium text-gray-700 mb-1">
                Price Range
              </label>
              <select
                className="block text-gray-700 w-full pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 sm: rounded-md"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <option value="All">All Prices</option>
                <option value="Under 1 Cr">Under 1 Cr</option>
                <option value="1-2 Cr">1-2 Cr</option>
                <option value="2-5 Cr">2-5 Cr</option>
                <option value="5-10 Cr">5-10 Cr</option>
                <option value="10+ Cr">10+ Cr</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className=" text-purple-600 hover:text-purple-800 flex items-center"
            >
              {showAdvancedFilters ? "Hide" : "Show"} Advanced Filters
              <ChevronDown
                className={`h-4 w-4 ml-1 transition-transform ${
                  showAdvancedFilters ? "rotate-180" : ""
                }`}
              />
            </button>
            <button
              onClick={resetFilters}
              className="px-3 py-1 border border-gray-200  font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Reset Filters
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              {/* Developer Filter - Updated with purple focus */}
              <div>
                <label className="block  font-medium text-gray-700 mb-1">
                  Developer
                </label>
                <select
                  className="block text-gray-700 w-full pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 sm: rounded-md"
                  value={developerFilter}
                  onChange={(e) => setDeveloperFilter(e.target.value)}
                >
                  <option value="All">All Developers</option>
                  {developers.map((developer) => (
                    <option key={developer} value={developer}>
                      {developer}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional filters can be added here */}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectsSearchFilter;

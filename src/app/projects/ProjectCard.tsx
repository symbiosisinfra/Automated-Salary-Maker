import React from "react";
import {
  Building,
  MapPin,
  Home,
  Calendar,
  IndianRupee,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

// Project card component with improved UI and information display
interface Project {
  id: string;
  projectName: string;
  location: string;
  image?: string;
  constructionStatus: string;
  developerName: string;
  totalLandParcel: string;
  typologyAndSize?: string[];
  totalNumberOfUnits?: string | number;
  possessionDate?: string;
  pricePerSqFt?: string;
  projectUSP?: string[];
  totalStartingPrice?: string;
}

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes("ready"))
      return "bg-green-100 text-green-800";
    if (status.toLowerCase().includes("under construction"))
      return "bg-amber-100 text-amber-800";
    if (status.toLowerCase().includes("upcoming"))
      return "bg-blue-100 text-blue-800";
    if (status.toLowerCase().includes("completed"))
      return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  // Format possession date for better readability
  const formatPossessionDate = (date: string | undefined) => {
    if (!date) return "Not specified";
    return date;
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md border transition-all duration-300 hover:shadow-lg h-full flex flex-col">
      {/* Project Image with Status Badge */}
      <div className="relative h-56 bg-gradient-to-r from-purple-50 to-blue-50">
        {project.image ? (
          <img
            src={project.image}
            alt={project.projectName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building className="w-16 h-16 text-purple-300" />
          </div>
        )}
        <div className="absolute top-0 right-0 m-3">
          <span
            className={`px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(
              project.constructionStatus
            )}`}
          >
            {project.constructionStatus}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-4">
          <h3 className="text-xl font-bold text-white">
            {project.projectName}
          </h3>
          <div className="flex items-center text-white  mt-1">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{project.location}</span>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="p-4 flex-grow">
        <div className="flex items-center justify-between mb-3">
          <span className=" font-semibold bg-purple-50 text-purple-700 px-2 py-1 rounded">
            {project.developerName}
          </span>
          <span className=" text-gray-600">{project.totalLandParcel}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-start">
            <Home className="h-4 w-4 mr-1 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Configuration</p>
              <p className=" font-medium text-gray-800">
                {project.typologyAndSize && project.typologyAndSize.length > 0
                  ? project.typologyAndSize[0]
                  : "Various"}
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <Briefcase className="h-4 w-4 mr-1 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Total Units</p>
              <p className=" font-medium text-gray-800">
                {project.totalNumberOfUnits || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-start">
            <Calendar className="h-4 w-4 mr-1 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Possession</p>
              <p className=" font-medium text-gray-800">
                {formatPossessionDate(project.possessionDate)}
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <IndianRupee className="h-4 w-4 mr-1 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Price Per Sq Ft</p>
              <p className=" font-medium text-gray-800">
                {project.pricePerSqFt || "Contact for price"}
              </p>
            </div>
          </div>
        </div>

        {/* Project USPs/Highlights */}
        {project.projectUSP && project.projectUSP.length > 0 && (
          <div className="mb-4">
            <h4 className=" font-semibold text-gray-700 mb-2">Highlights</h4>
            <div className="flex flex-wrap gap-2">
              {project.projectUSP.slice(0, 3).map((usp, index) => (
                <span
                  key={index}
                  className="text-sm bg-gray-50 text-gray-600 px-2 py-1 rounded-full"
                >
                  {usp}
                </span>
              ))}
              {project.projectUSP.length > 3 && (
                <span className="text-sm bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                  +{project.projectUSP.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Price and CTA */}
      <div className="border-t border-gray-100 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500">Starting Price</p>
            <p className="text-lg font-bold text-purple-700">
              ₹{project.totalStartingPrice || "On Request"}
            </p>
          </div>
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center px-3 py-1.5 border border-purple-600  font-medium rounded text-purple-600 bg-white hover:bg-purple-50 transition-colors"
          >
            View Details <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;

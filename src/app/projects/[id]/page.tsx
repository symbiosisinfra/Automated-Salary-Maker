"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Building,
  MapPin,
  ChevronLeft,
  ArrowLeft,
  CheckCircle,
  Phone,
  AlertTriangle,
} from "lucide-react";

import ProjectHeader from "../ProjectHeader";

// Define the project type
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

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Unwrap params using React.use()
  const id = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch project data
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setIsLoading(true);

        // Fetch specific project by ID
        const response = await fetch(`/api/projects?id=${id}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch project: ${response.statusText}`);
        }

        const data = await response.json();
        setProject(data);
      } catch (err) {
        console.error("Error fetching project details:", err);
        setError("Unable to load project details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchProjectData();
    }
  }, [id]);

  // Get status color
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen py-12 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/projects"
            className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>

          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <AlertTriangle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {error || "Project not found"}
            </h2>
            <p className="text-gray-600 mb-6">
              We couldn't find the project details you're looking for.
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Browse All Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back navigation */}
      <ProjectHeader />

      {/* Hero section with property image */}
      <div className="bg-gray-900 text-white relative">
        <div className="h-96 w-full relative">
          {project.image ? (
            <>
              <div className="absolute inset-0 bg-black opacity-50 z-10"></div>
              <img
                src={project.image}
                alt={project.projectName}
                className="w-full h-full object-cover"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-purple-800 to-blue-800">
              <Building className="w-24 h-24 text-white opacity-30" />
            </div>
          )}

          {/* Project title overlay */}
          <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 max-w-6xl mx-auto">
            <div className="max-w-3xl">
              <div
                className={`inline-block px-3 py-1  font-medium rounded-full mb-4 ${getStatusColor(
                  project.constructionStatus
                )}`}
              >
                {project.constructionStatus}
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {project.projectName}
              </h1>
              <div className="flex items-center mb-4">
                <MapPin className="h-5 w-5 mr-2" />
                <p className="text-gray-200">{project.location}</p>
              </div>
              <div className="flex items-center">
                <span className="bg-purple-700 text-white px-3 py-1 rounded-md font-medium text-lg mr-3">
                  ₹{project.totalStartingPrice}
                </span>
                <span className="text-gray-300">{project.pricePerSqFt}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Main information */}
          <div className="lg:col-span-2">
            {/* Overview section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Overview
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="flex flex-col">
                  <span className="text-gray-500">Developer</span>
                  <span className="font-medium text-gray-800">
                    {project.developerName}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium text-gray-800">
                    {project.category}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Region</span>
                  <span className="font-medium text-gray-800">
                    {project.region}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Total Land Area</span>
                  <span className="font-medium text-gray-800">
                    {project.totalLandParcel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col">
                  <span className="text-gray-500">Number of Towers</span>
                  <span className="font-medium text-gray-800">
                    {project.numberOfTowers || "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Number of Floors</span>
                  <span className="font-medium text-gray-800">
                    {project.numberOfFloors}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Total Units</span>
                  <span className="font-medium text-gray-800">
                    {project.totalNumberOfUnits}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Possession</span>
                  <span className="font-medium text-gray-800">
                    {project.possessionDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Available configurations */}
            {project.typologyAndSize && project.typologyAndSize.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Available Configurations
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.typologyAndSize.map((config, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                    >
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {config}
                      </h3>
                      <div className="text-gray-500">
                        <p>Starting Price: ₹{project.totalStartingPrice}</p>
                        <p className="mt-1">₹{project.pricePerSqFt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project USPs/Highlights */}
            {project.projectUSP && project.projectUSP.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Project Highlights
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.projectUSP.map((usp, index) => (
                    <div key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{usp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby landmarks */}
            {project.nearbyLandmarks && project.nearbyLandmarks.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Nearby Landmarks
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.nearbyLandmarks.map((landmark, index) => (
                    <div key={index} className="flex items-start">
                      <MapPin className="h-5 w-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{landmark}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby societies */}
            {project.nearbySocieties && project.nearbySocieties.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Nearby Societies
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.nearbySocieties.map((society, index) => (
                    <div key={index} className="flex items-start">
                      <Building className="h-5 w-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{society}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Price and contact info */}
          <div>
            {/* Pricing box */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8 sticky top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Pricing Details
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Starting Price</span>
                  <span className="font-bold text-lg text-purple-700">
                    ₹{project.totalStartingPrice}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Price Per Sq Ft</span>
                  <span className="font-medium text-gray-800">
                    {project.pricePerSqFt}
                  </span>
                </div>

                {project.baseUnitPrice && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Base Price</span>
                    <span className="font-medium text-gray-800">
                      ₹{project.baseUnitPrice}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Payment Plan</span>
                  <span className="font-medium text-gray-800">
                    {project.paymentPlan}
                  </span>
                </div>

                <div className="py-2">
                  <span className="text-gray-600 block mb-2">
                    Additional Charges
                  </span>
                  <span className="text-gray-700">
                    {project.additionalCharges}
                  </span>
                </div>
              </div>

              {/* Contact details */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Contact for details
                </h3>

                <div className="flex items-center mb-4">
                  <Phone className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="text-gray-700">
                    {project.rmContactDetails}
                  </span>
                </div>

                {/* Sample contact form buttons */}
                <div className="space-y-3">
                  <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors">
                    Request a Call Back
                  </button>
                  <button className="w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-md hover:bg-gray-200 transition-colors">
                    Schedule a Site Visit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

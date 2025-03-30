import React from "react";
import { DollarSign, Users, Calendar } from "lucide-react";

interface HeaderProps {
  employeeCount: number;
  maxDays: number;
  month: string;
  year: string;
}

const Header: React.FC<HeaderProps> = ({
  employeeCount,
  maxDays,
  month,
  year,
}) => {
  return (
    <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-5 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            {/* Logo */}
            <div className="bg-white p-2 rounded-lg mr-4 shadow-md">
              <div className="bg-blue-600 rounded-md w-10 h-10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-300" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold">Advanced Salary Calculator</h1>
              <p className="text-blue-100 text-sm">
                {month && year
                  ? `Reporting Period: ${month} ${year}`
                  : "Automate your salary calculations"}
              </p>
            </div>
          </div>

          <div className="flex space-x-4 items-center">
            <div className="bg-blue-600 px-3 py-2 rounded-lg shadow-sm flex items-center">
              <Users className="w-4 h-4 mr-2 text-blue-100" />
              <div>
                <span className="text-xs text-blue-200">Employees</span>
                <p className="font-bold text-lg leading-tight">
                  {employeeCount}
                </p>
              </div>
            </div>

            <div className="bg-green-600 px-3 py-2 rounded-lg shadow-sm flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-green-100" />
              <div>
                <span className="text-xs text-green-200">Days</span>
                <p className="font-bold text-lg leading-tight">{maxDays}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

export default function Footer() {
  return (
    <footer className="bg-white border-t py-4 px-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Symbiosis Infra Private Limited. All rights reserved.
        </p>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
            Privacy Policy
          </a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
            Terms of Service
          </a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

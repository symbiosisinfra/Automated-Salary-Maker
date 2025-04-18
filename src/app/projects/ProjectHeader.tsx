import Image from "next/image";
import Link from "next/link";

export default function ProjectHeader() {
  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col">
          {/* Logo and Brand Name */}
          <div className="flex items-center">
            <Link href="/projects" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Company Logo"
                width={50}
                height={50}
                className="mr-3"
                priority
              />
              <h1 className="text-2xl font-bold text-gray-800">
                Symbiosis Infra
              </h1>
            </Link>
          </div>

          {/* Description */}
          <p className="text-gray-600 mt-3 max-w-3xl">
            Explore our comprehensive database of residential and commercial
            real estate projects across prime locations in Gurugram.
          </p>
        </div>
      </div>
    </header>
  );
}

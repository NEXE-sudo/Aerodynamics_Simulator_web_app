export default function Header() {
  return (
    <div className="mb-8">
      <h1 className="text-5xl font-black bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent mb-4 tracking-tight">
        Interactive Aerodynamics Platform
      </h1>
      <p className="text-gray-600 dark:text-gray-400 text-xl font-medium max-w-3xl mx-auto">
        Fast, visual, honest aerodynamic decision-making for students
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="h-1 w-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        <div className="h-1 w-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
        <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
      </div>
    </div>
  );
}

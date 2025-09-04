import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';

export function Search() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Search
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Search across projects, subjects, and experiments.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="projects">Projects</option>
            <option value="subjects">Subjects</option>
            <option value="experiments">Experiments</option>
          </select>
          
          <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Search
          </button>
        </div>

        <div className="text-center py-12 text-gray-500">
          <SearchIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Enter a search query
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Search for projects, subjects, or experiments by name, ID, or description.
          </p>
        </div>
      </div>
    </div>
  );
}
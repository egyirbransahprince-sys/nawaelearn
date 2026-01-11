import React from 'react';
import { BookOpenIcon } from './icons';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-200 p-4">
      <main className="flex flex-col items-center justify-center text-center flex-grow">
        <BookOpenIcon className="w-32 h-32 text-blue-400 mb-6" />
        <h1 className="text-6xl md:text-7xl font-extrabold text-blue-400">
          NAWA
          <span className="block text-4xl md:text-5xl font-medium text-gray-300 mt-2">Educational App</span>
        </h1>
        <p className="mt-6 text-xl md:text-2xl text-gray-400 max-w-2xl">
          Smart and Easy Learning
        </p>
        <button
          onClick={onEnter}
          className="mt-20 px-8 py-4 bg-primary text-white font-bold text-lg rounded-full shadow-lg hover:bg-blue-800 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Enter E-Classroom
        </button>
      </main>
      <footer className="w-full text-center py-4">
        <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} NAWA Educational App. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

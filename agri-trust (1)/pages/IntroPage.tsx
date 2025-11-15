import React from 'react';
import { INTRO_PAGE_CONTENT } from '../constants';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

const IntroPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center">
      <header className="mb-20">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-emerald-500 dark:text-emerald-300 mb-4 drop-shadow-lg" aria-label="Welcome to Agri-Trust">
          Welcome to Agri-Trust
        </h1>
        <p className="text-xl md:text-2xl lg:text-3xl text-gray-400 dark:text-gray-200 mb-8" aria-label="Building trust in agriculture, one batch at a time.">
          Building trust in agriculture, one batch at a time.
        </p>
        <Button variant="primary" className="text-lg px-8 py-3" onClick={() => navigate('/login')} aria-label="Get Started with Agri-Trust">
          Get Started
        </Button>
      </header>

      <section className="p-6 md:p-10 rounded-xl shadow-lg w-full max-w-4xl dark:bg-gray-800 border border-gray-700 dark:border-gray-600 mb-20">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-200 dark:text-gray-50 border-b-2 border-emerald-300 dark:border-emerald-600 pb-3 mb-6">
          {INTRO_PAGE_CONTENT.significance.title}
        </h2>
        <ul className="list-disc pl-5 text-lg text-gray-300 dark:text-gray-200 space-y-4">
          {INTRO_PAGE_CONTENT.significance.bullets.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </ul>
      </section>

      <section className="p-6 md:p-10 rounded-xl shadow-lg w-full max-w-4xl dark:bg-gray-800 border border-gray-700 dark:border-gray-600 mb-20">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-200 dark:text-gray-50 border-b-2 border-emerald-300 dark:border-emerald-600 pb-3 mb-6">
          {INTRO_PAGE_CONTENT.solution.title}
        </h2>
        <ul className="list-disc pl-5 text-lg text-gray-300 dark:text-gray-200 space-y-4">
          {INTRO_PAGE_CONTENT.solution.bullets.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </ul>
      </section>

      <section className="p-6 md:p-10 rounded-xl shadow-lg w-full max-w-4xl dark:bg-gray-800 border border-gray-700 dark:border-gray-600">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-200 dark:text-gray-50 border-b-2 border-emerald-300 dark:border-emerald-600 pb-3 mb-6">
          How Agri-Trust Works
        </h2>
        <ol className="list-decimal pl-5 text-lg text-gray-300 dark:text-gray-200 space-y-4">
          {INTRO_PAGE_CONTENT.howItWorks.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default IntroPage;
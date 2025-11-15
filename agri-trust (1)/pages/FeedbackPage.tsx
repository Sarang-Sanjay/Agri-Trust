import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, Feedback, FeedbackQuestion } from '../types';
import { FEEDBACK_QUESTIONS } from '../constants';
import Input from '../components/Input';
import TextArea from '../components/TextArea';
import Button from '../components/Button';
import * as localDb from '../services/localDb';
import { v4 as uuidv4 } from 'uuid';

const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  // userRole from auth context will be NONE after logout, so we rely on localStorage
  const { isAuthenticated } = useAuth();

  // Get the role from localStorage. This value would have been set by AuthContext.logout.
  // If no role is found (e.g., direct navigation to feedback without logout), default to Consumer.
  const storedPreviousUserRole = localStorage.getItem('lastUserRole') as UserRole | null;
  const roleForFeedback = storedPreviousUserRole || UserRole.CONSUMER;

  const questions: FeedbackQuestion[] = FEEDBACK_QUESTIONS[roleForFeedback] || FEEDBACK_QUESTIONS[UserRole.CONSUMER]!;

  const [answers, setAnswers] = useState<{ [key: string]: string | number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // Clear the lastUserRole from localStorage once the feedback page has loaded its questions
  // and is ready to display them, or after submission.
  useEffect(() => {
    // We clear it here once, to ensure the questions are correctly displayed for the *previous* role.
    // If not submitted, and a role was found, clear it immediately after reading.
    if (storedPreviousUserRole && !feedbackSubmitted) {
      localStorage.removeItem('lastUserRole');
    }
  }, [storedPreviousUserRole, feedbackSubmitted]);


  const handleAnswerChange = (id: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionError('');

    try {
      const newFeedback: Feedback = {
        id: uuidv4(),
        role: roleForFeedback, // Use the role identified for feedback
        questions: questions,
        answers: answers,
        createdAt: new Date().toISOString(),
      };
      localDb.addFeedback(newFeedback); // Mock saving feedback
      setFeedbackSubmitted(true);
      // Automatically redirect after a short delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setSubmissionError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex items-center justify-center">
      <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg w-full max-w-2xl text-center dark:bg-gray-800">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">
          Thank you for using Agri-Trust!
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Please take a moment to provide your feedback.
        </p>

        {feedbackSubmitted ? (
          <div className="p-8 bg-emerald-50 rounded-lg text-emerald-800 dark:bg-emerald-700 dark:text-emerald-100">
            <h3 className="text-2xl font-bold mb-3">Feedback Submitted!</h3>
            <p className="text-lg">We appreciate your input. Redirecting to home...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback} className="text-left space-y-6">
            {questions.map((question) => (
              <div key={question.id} className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2 dark:text-gray-300">
                  {question.question}
                  {question.type === 'text' && <span className="text-red-500 ml-1">*</span>}
                </label>
                {question.type === 'rating' && question.options ? (
                  <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-3" role="radiogroup" aria-labelledby={`label-${question.id}`}>
                    {question.options.map((option, index) => (
                      <label key={option} className="flex flex-col items-center cursor-pointer p-2 flex-grow">
                        <input
                          type="radio"
                          id={`${question.id}-${index + 1}`}
                          name={`rating-${question.id}`}
                          value={index + 1}
                          checked={answers[question.id] === index + 1}
                          onChange={() => handleAnswerChange(question.id, index + 1)}
                          className="form-radio h-4 w-4 text-emerald-600 focus:ring-emerald-500 dark:text-emerald-500 dark:focus:ring-emerald-400"
                          required
                          aria-required="true"
                        />
                        <span className="ml-1 text-sm text-gray-700 dark:text-gray-200 mt-1">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <TextArea
                    label="" // Pass an empty label to satisfy the prop type
                    id={question.id}
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Your answer here..."
                    required={question.type === 'text'} // Make text area required
                    aria-required={question.type === 'text' ? "true" : "false"}
                  />
                )}
              </div>
            ))}
            {submissionError && <p className="text-red-500 text-sm mb-4">{submissionError}</p>}
            <Button type="submit" isLoading={isSubmitting} fullWidth variant="primary">
              Submit Feedback
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
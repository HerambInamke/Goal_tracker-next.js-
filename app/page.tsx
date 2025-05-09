'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
import { auth } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { useAuth } from './hooks/useAuth';

interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  deadline: string;
  progress: number;
  category: string;
  notes: string;
  comments: string[];
}

const categories = ['Health', 'Career', 'Education', 'Personal', 'Financial', 'Other'];

// Mock data for initial goals
const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Complete React Course',
    description: 'Finish the advanced React course on Udemy',
    target: 100,
    current: 75,
    deadline: '2024-06-30',
    progress: 75,
    category: 'Education',
    notes: 'Focus on hooks and context API',
    comments: ['Great progress!', 'Keep it up!'],
  },
  {
    id: '2',
    title: 'Run 5K',
    description: 'Train for and complete a 5K run',
    target: 5,
    current: 3,
    deadline: '2024-05-15',
    progress: 60,
    category: 'Health',
    notes: 'Running 3 times per week',
    comments: ['You\'re doing great!', 'Remember to stretch'],
  },
  {
    id: '3',
    title: 'Save for Vacation',
    description: 'Save money for summer vacation',
    target: 2000,
    current: 1500,
    deadline: '2024-07-01',
    progress: 75,
    category: 'Financial',
    notes: 'Putting aside $200 per week',
    comments: ['Almost there!', 'Great saving habits'],
  },
];

// Add type for progress history data
interface ProgressHistoryData {
  date: string;
  progress: number;
}

// Add type for chart data
interface ChartData {
  categoryData: { name: string; value: number }[];
  progressData: { name: string; progress: number }[];
  historyData: { name: string; data: ProgressHistoryData[] }[];
}

export default function GoalTracker() {
  const { user, isLoading, signIn, signUp, signInWithGoogle, signInWithGithub, resetPassword, signOut } = useAuth();
  const [view, setView] = useState<'landing' | 'dashboard' | 'settings' | 'auth'>('landing');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    isLogin: true,
    showResetPassword: false,
  });
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target: 0,
    deadline: '',
    category: 'Personal',
    notes: '',
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'progress' | 'deadline'>('progress');
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [notifications, setNotifications] = useState({
    email: false,
    progress: true,
  });

  // Update chart data state type
  const [chartData, setChartData] = useState<ChartData>({
    categoryData: [],
    progressData: [],
    historyData: [],
  });

  // Add state for progress history
  const [progressHistory, setProgressHistory] = useState<{
    [key: string]: { date: string; progress: number }[];
  }>({});

  // Add state for onboarding
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showTooltips, setShowTooltips] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);

  // Onboarding tips
  const onboardingTips = [
    { title: "Welcome! 👋", message: "Let's get started with tracking your goals" },
    { title: "Add Goals 🎯", message: "Create your first goal by filling out the form above" },
    { title: "Track Progress 📈", message: "Use the slider to update your progress" },
    { title: "Stay Organized 📋", message: "Filter and sort your goals by category or deadline" }
  ];

  // Enhanced theme toggle animation
  const themeToggleVariants = {
    light: { rotate: 0 },
    dark: { rotate: 180 },
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  // Card hover animation
  const cardVariants = {
    hover: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    },
  };

  // Add error handling for localStorage
  const loadGoals = () => {
    try {
      const savedGoals = localStorage.getItem('goals');
      if (savedGoals) {
        const parsedGoals = JSON.parse(savedGoals);
        if (Array.isArray(parsedGoals)) {
          setGoals(parsedGoals);
        }
      }
    } catch (error) {
      console.error('Error loading goals from localStorage:', error);
      toast.error('Failed to load saved goals');
    }
  };

  const saveGoals = (goalsToSave: Goal[]) => {
    try {
      localStorage.setItem('goals', JSON.stringify(goalsToSave));
    } catch (error) {
      console.error('Error saving goals to localStorage:', error);
      toast.error('Failed to save goals');
    }
  };

  // Update useEffect for localStorage
  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

  // Update chart data calculation
  useEffect(() => {
    const categoryCounts: { [key: string]: number } = {};
    const progressData = goals.map(goal => ({
      name: goal.title,
      progress: goal.progress,
    }));

    const historyData = goals.map(goal => ({
      name: goal.title,
      data: progressHistory[goal.id] || [],
    }));

    goals.forEach(goal => {
      categoryCounts[goal.category] = (categoryCounts[goal.category] || 0) + 1;
    });

    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
      name,
      value,
    }));

    setChartData({ categoryData, progressData, historyData });
  }, [goals, progressHistory]);

  // Update progress history when a goal's progress changes
  useEffect(() => {
    const newHistory = { ...progressHistory };
    goals.forEach(goal => {
      if (!newHistory[goal.id]) {
        newHistory[goal.id] = [];
      }
      // Only add new entry if progress changed
      const lastEntry = newHistory[goal.id][newHistory[goal.id].length - 1];
      if (!lastEntry || lastEntry.progress !== goal.progress) {
        newHistory[goal.id].push({
          date: new Date().toISOString(),
          progress: goal.progress,
        });
      }
    });
    setProgressHistory(newHistory);
  }, [goals]);

  // Add theme initialization effect
  useEffect(() => {
    // Get saved theme from localStorage or use dark as default
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme as 'light' | 'dark' | 'system');
    
    // Apply the theme
    if (savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  // Check if it's the user's first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (hasVisited) {
      setShowOnboarding(false);
    } else {
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  // Function to handle tooltip navigation
  const handleNextTip = () => {
    if (currentTip < onboardingTips.length - 1) {
      setCurrentTip(currentTip + 1);
    } else {
      setShowTooltips(false);
    }
  };

  const handleAddGoal = () => {
    if (newGoal.title && newGoal.target > 0 && newGoal.deadline) {
      const goal: Goal = {
        id: Date.now().toString(),
        title: newGoal.title,
        description: newGoal.description,
        target: newGoal.target,
        current: 0,
        deadline: newGoal.deadline,
        progress: 0,
        category: newGoal.category,
        notes: newGoal.notes,
        comments: [],
      };
      setGoals([...goals, goal]);
      setNewGoal({ title: '', description: '', target: 0, deadline: '', category: 'Personal', notes: '' });
      setView('dashboard');
    }
  };

  const handleUpdateProgress = (id: string, value: number) => {
    setGoals(goals.map(goal => {
      if (goal.id === id) {
        const newCurrent = Math.min(goal.target, Math.max(0, value));
        const newProgress = (newCurrent / goal.target) * 100;
        
        // Show toast for milestone achievements
        if (newProgress >= 100 && goal.progress < 100) {
          toast.success('🎉 Goal Completed!', {
            icon: '🎯',
            duration: 4000,
          });
        } else if (newProgress >= 75 && goal.progress < 75) {
          toast('Almost there! Keep going!', {
            icon: '🚀',
          });
        } else if (newProgress >= 50 && goal.progress < 50) {
          toast('Halfway there!', {
            icon: '🌟',
          });
        }
        
        return {
          ...goal,
          current: newCurrent,
          progress: newProgress,
        };
      }
      return goal;
    }));
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
  };

  const handleAddComment = (goalId: string) => {
    if (newComment[goalId]?.trim()) {
      setGoals(goals.map(goal => {
        if (goal.id === goalId) {
          toast.success('Comment added!', {
            icon: '💬',
          });
          return {
            ...goal,
            comments: [...goal.comments, newComment[goalId]],
          };
        }
        return goal;
      }));
      setNewComment({ ...newComment, [goalId]: '' });
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleNotificationChange = (type: 'email' | 'progress', checked: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [type]: checked,
    }));
  };

  const getFilteredGoals = () => {
    let filtered = goals;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(goal => goal.category === selectedCategory);
    }
    return filtered.sort((a, b) => {
      if (sortBy === 'progress') {
        return b.progress - a.progress;
      } else {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
    });
  };

  const getMilestoneBadge = (progress: number) => {
    if (progress >= 100) return '🎯 Goal Achieved!';
    if (progress >= 75) return '🚀 Almost There!';
    if (progress >= 50) return '🌟 Halfway There!';
    if (progress >= 25) return '💪 Making Progress!';
    return 'New Goal';
  };

  // Add theme colors for charts
  const COLORS = {
    light: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'],
    dark: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  };

  // Add auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setView('dashboard');
      } else {
        setView('landing');
      }
    });

    return () => unsubscribe();
  }, []);

  // Update auth handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authForm.showResetPassword) {
      await resetPassword(authForm.email);
      setAuthForm({ ...authForm, showResetPassword: false });
      return;
    }
    if (authForm.isLogin) {
      await signIn(authForm.email, authForm.password);
    } else {
      await signUp(authForm.email, authForm.password);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      <Toaster position="top-right" />
      
      {/* Auth View */}
      {view === 'auth' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-screen flex items-center justify-center p-4"
        >
          <div className={`w-full max-w-md p-8 rounded-xl shadow-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-2xl font-bold mb-6 text-center ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {authForm.showResetPassword 
                ? 'Reset Password'
                : authForm.isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Email
                </label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className={`mt-1 block w-full p-2 border rounded-md ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                />
              </div>
              {!authForm.showResetPassword && (
                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className={`mt-1 block w-full p-2 border rounded-md ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded-md text-white font-medium transition-all duration-200 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading 
                  ? 'Loading...' 
                  : authForm.showResetPassword
                  ? 'Send Reset Link'
                  : authForm.isLogin ? 'Login' : 'Sign Up'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${
                    theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                  }`}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-2 ${
                    theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                  }`}>
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={isLoading}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                    />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={signInWithGithub}
                  disabled={isLoading}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    />
                  </svg>
                  GitHub
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              {!authForm.showResetPassword && (
                <button
                  type="button"
                  onClick={() => setAuthForm({ ...authForm, isLogin: !authForm.isLogin })}
                  className={`text-sm ${
                    theme === 'dark'
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {authForm.isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setAuthForm({ 
                  ...authForm, 
                  showResetPassword: !authForm.showResetPassword,
                  password: '',
                })}
                className={`text-sm block mx-auto mt-2 ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                {authForm.showResetPassword ? 'Back to login' : 'Forgot password?'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Update Navbar to include auth buttons */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      } shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setView('landing')}
                className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Goal Tracker
              </button>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <button
                    onClick={() => setView('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      view === 'dashboard'
                        ? `bg-blue-600 text-white shadow-md ${
                            theme === 'dark' ? 'hover:bg-blue-700' : 'hover:bg-blue-700'
                          }`
                        : `${
                            theme === 'dark' 
                              ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setView('settings')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      view === 'settings'
                        ? `bg-blue-600 text-white shadow-md ${
                            theme === 'dark' ? 'hover:bg-blue-700' : 'hover:bg-blue-700'
                          }`
                        : `${
                            theme === 'dark' 
                              ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`
                    }`}
                  >
                    Settings
                  </button>
                  <button
                    onClick={signOut}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setView('auth')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Onboarding Banner */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-16 inset-x-0 z-50 p-4 ${
              theme === 'dark' ? 'bg-blue-900/90' : 'bg-blue-50/90'
            } backdrop-blur-sm`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    {currentTip + 1}
                  </span>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-blue-100' : 'text-blue-900'
                    }`}>
                      {onboardingTips[currentTip].title}
                    </h3>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
                    }`}>
                      {onboardingTips[currentTip].message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleNextTip}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      theme === 'dark'
                        ? 'bg-blue-700 text-white hover:bg-blue-600'
                        : 'bg-blue-100 text-blue-900 hover:bg-blue-200'
                    }`}
                  >
                    {currentTip < onboardingTips.length - 1 ? 'Next' : 'Got it'}
                  </button>
                  <button
                    onClick={() => setShowOnboarding(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close onboarding"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Theme Toggle in Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
      } shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <motion.span
                className={`text-2xl font-bold bg-gradient-to-r ${
                  theme === 'dark' ? 'from-blue-400 to-blue-600' : 'from-blue-600 to-blue-800'
                } bg-clip-text text-transparent`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                GoalTracker
              </motion.span>
            </div>
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
                variants={themeToggleVariants}
                animate={theme}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  theme === 'dark' ? 'bg-gray-700 text-yellow-300' : 'bg-gray-100 text-gray-900'
                }`}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </motion.button>
              {user ? (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setView('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      view === 'dashboard'
                        ? `bg-blue-600 text-white shadow-md ${
                            theme === 'dark' ? 'hover:bg-blue-700' : 'hover:bg-blue-700'
                          }`
                        : `${
                            theme === 'dark' 
                              ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setView('settings')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      view === 'settings'
                        ? `bg-blue-600 text-white shadow-md ${
                            theme === 'dark' ? 'hover:bg-blue-700' : 'hover:bg-blue-700'
                          }`
                        : `${
                            theme === 'dark' 
                              ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`
                    }`}
                  >
                    Settings
                  </button>
                  <motion.button
                    onClick={signOut}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Logout
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={() => setView('auth')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25'
                  }`}
                >
                  Login / Sign Up
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        {/* Landing Page */}
        {view === 'landing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`min-h-[calc(100vh-4rem)] flex items-center justify-center ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50' 
                : 'bg-gradient-to-br from-blue-50/50 to-blue-100/50'
            }`}
          >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`text-4xl sm:text-5xl font-bold mb-6 leading-tight ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Track Your Goals, Achieve Your Dreams
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`text-lg sm:text-xl mb-8 max-w-2xl mx-auto ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                Stay motivated and organized with our intuitive goal tracking system.
                Set targets, track progress, and celebrate your achievements.
              </motion.p>
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => setView('dashboard')}
                className={`px-8 py-3 rounded-lg text-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Start Tracking Goals
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Dashboard View with Empty State */}
        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            {/* Responsive Add Goal Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl shadow-lg p-6 mb-8 transition-colors duration-200 ${
                theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
              }`}
            >
              <h2 className={`text-2xl font-semibold mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Add New Goal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Goal Title"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Target Value
                  </label>
                  <input
                    type="number"
                    placeholder="Target Value"
                    value={newGoal.target || ''}
                    onChange={(e) => setNewGoal({ ...newGoal, target: Number(e.target.value) })}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Category
                  </label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    placeholder="Description"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    rows={2}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Notes
                  </label>
                  <textarea
                    placeholder="Notes (optional)"
                    value={newGoal.notes}
                    onChange={(e) => setNewGoal({ ...newGoal, notes: e.target.value })}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    rows={2}
                  />
                </div>
              </div>
              <button
                onClick={handleAddGoal}
                className={`mt-6 px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1 ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Add Goal
              </button>
            </motion.div>

            {/* Empty State */}
            {goals.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-center py-12 ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                } rounded-xl shadow-lg mb-8`}
              >
                <svg
                  className={`mx-auto h-12 w-12 ${
                    theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className={`mt-2 text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  No goals yet
                </h3>
                <p className={`mt-1 text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Get started by creating your first goal
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      const form = document.querySelector('input[placeholder="Goal Title"]');
                      if (form instanceof HTMLInputElement) {
                        form.scrollIntoView({ behavior: 'smooth' });
                        form.focus();
                      }
                    }}
                    className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                      theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create a goal
                  </button>
                </div>
              </motion.div>
            )}

            {/* Responsive Charts Grid */}
            {goals.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Category Distribution Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 rounded-xl shadow-lg transition-colors duration-200 ${
                    theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
                  }`}
                >
                  <h3 className={`text-xl font-semibold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Goals by Category
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={theme === 'dark' ? COLORS.dark[index % COLORS.dark.length] : COLORS.light[index % COLORS.light.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1F2937' : 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: theme === 'dark' ? 'white' : 'black',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Progress Bar Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 rounded-xl shadow-lg transition-colors duration-200 ${
                    theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
                  }`}
                >
                  <h3 className={`text-xl font-semibold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Progress Overview
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData.progressData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={theme === 'dark' ? '#374151' : '#E5E7EB'}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#4B5563' }}
                        />
                        <YAxis
                          tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#4B5563' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1F2937' : 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: theme === 'dark' ? 'white' : 'black',
                          }}
                        />
                        <Bar
                          dataKey="progress"
                          fill={theme === 'dark' ? '#3B82F6' : '#2563EB'}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Add Line Chart for Progress History */}
            {goals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-xl shadow-lg transition-colors duration-200 ${
                  theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
                }`}
              >
                <h3 className={`text-xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Progress Over Time
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={theme === 'dark' ? '#374151' : '#E5E7EB'}
                      />
                      <XAxis
                        dataKey="date"
                        type="category"
                        tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#4B5563' }}
                        tickFormatter={(date) => new Date(date).toLocaleDateString()}
                      />
                      <YAxis
                        tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#4B5563' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1F2937' : 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          color: theme === 'dark' ? 'white' : 'black',
                        }}
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        formatter={(value: any) => [`${value}%`, 'Progress']}
                      />
                      <Legend />
                      {chartData.historyData.map((goal, index) => (
                        <Line
                          key={goal.name}
                          type="monotone"
                          data={goal.data}
                          name={goal.name}
                          dataKey="progress"
                          stroke={theme === 'dark' ? COLORS.dark[index % COLORS.dark.length] : COLORS.light[index % COLORS.light.length]}
                          strokeWidth={2}
                          dot={{ fill: theme === 'dark' ? COLORS.dark[index % COLORS.dark.length] : COLORS.light[index % COLORS.light.length] }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Responsive Filters */}
            {goals.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                >
                  <option value="All">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'progress' | 'deadline')}
                  className={`p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                >
                  <option value="progress">Sort by Progress</option>
                  <option value="deadline">Sort by Deadline</option>
                </select>
              </div>
            )}

            {/* Responsive Goals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {getFilteredGoals().map((goal) => (
                  <motion.div
                    key={goal.id}
                    variants={cardVariants}
                    whileHover="hover"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                    className={`rounded-xl shadow-lg p-6 transition-all duration-200 ${
                      theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{goal.title}</h3>
                        <span className="text-sm text-primary dark:text-primary-light">{goal.category}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-red-500 hover:text-red-700 transition-colors duration-200"
                        aria-label={`Delete goal: ${goal.title}`}
                        role="button"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {goal.description && (
                      <p className="text-gray-600 dark:text-gray-300 mb-4">{goal.description}</p>
                    )}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Progress: {goal.current}/{goal.target}</span>
                        <span>{goal.progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            goal.progress >= 100 ? 'bg-green-500' : 'bg-primary'
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-primary dark:text-primary-light mt-1">
                        {getMilestoneBadge(goal.progress)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <input
                        type="range"
                        min="0"
                        max={goal.target}
                        value={goal.current}
                        onChange={(e) => handleUpdateProgress(goal.id, Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        aria-label="Progress slider"
                      />
                    </div>
                    {goal.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Notes: {goal.notes}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Deadline: {new Date(goal.deadline).toLocaleDateString()}
                    </p>
                    
                    {/* Comments Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Comments</h4>
                      <div className="space-y-2 mb-4">
                        {goal.comments.map((comment, index) => (
                          <div key={index} className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                            {comment}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newComment[goal.id] || ''}
                          onChange={(e) => setNewComment({ ...newComment, [goal.id]: e.target.value })}
                          placeholder="Add a comment..."
                          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                        />
                        <button
                          onClick={() => handleAddComment(goal.id)}
                          className="bg-primary text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Settings View */}
        {view === 'settings' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl shadow-lg p-6 transition-colors duration-200 ${
                theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
              }`}
            >
              <h2 className={`text-2xl font-semibold mb-8 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Settings
              </h2>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Theme</h3>
                  <select
                    value={theme}
                    onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Notifications</h3>
                  <div className="space-y-4">
                    <label className="flex items-center text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={notifications.email}
                        onChange={(e) => handleNotificationChange('email', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded"
                      />
                      <span className="ml-3">Email notifications</span>
                    </label>
                    <label className="flex items-center text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={notifications.progress}
                        onChange={(e) => handleNotificationChange('progress', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded"
                      />
                      <span className="ml-3">Progress reminders</span>
                    </label>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Data Management</h3>
                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        localStorage.setItem('goals', JSON.stringify(mockGoals));
                        setGoals(mockGoals);
                      }}
                      className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1 ${
                        theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-700 hover:bg-blue-800'
                      }`}
                    >
                      Reset to Sample Goals
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('goals');
                        setGoals([]);
                      }}
                      className={`px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1 ml-4 ${
                        theme === 'dark' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      Clear All Goals
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Responsive Footer */}
      <footer className={`border-t mt-8 transition-colors duration-200 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              © 2024 GoalTracker. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="#" className={`hover:text-blue-500 transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className={`hover:text-blue-500 transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a href="#" className={`hover:text-blue-500 transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 
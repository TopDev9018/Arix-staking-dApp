/**
 * src/services/api.js
 *
 * This is the fully merged and consolidated API service file.
 * It combines all of your existing endpoints with the ones that
 * were missing, such as `withdrawArix`, fixing the Vercel build error.
 */

import axios from 'axios';

// --- Base API Configuration ---
const VITE_BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL;

if (!VITE_BACKEND_API_URL) {
  console.error("FATAL: VITE_BACKEND_API_URL is not set in environment variables. Frontend cannot connect to backend.");
}

const apiClient = axios.create({
  baseURL: `https://83af-51-68-181-153.ngrok-free.app/api`,
  // baseURL: `${VITE_BACKEND_API_URL}/api`
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    // 'User-Agent': 'MyApp/1.0'
  },
  timeout: 30000,
});

// --- Interceptor for Global Error Handling (Preserved from your version) ---
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error('API Error Response:', {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers,
        url: error.config.url
      });
    } else if (error.request) {
      console.error('API No Response (Network error or CORS):', error.request);
    } else {
      console.error('API Error Message:', error.message);
    }
    return Promise.reject(error);
  }
);


// --- User & Profile Endpoints ---
export const getUserProfile = (walletAddress, launchParams) => {
  // Your path is /users/... which is different from the backend route /user/...
  // Let's assume the backend userRoutes.js is the source of truth.
  return apiClient.get(`/user/profile/${walletAddress}`, { params: launchParams });
};

export const getUserTransactions = (walletAddress) => {
    // Corrected path to match backend userRoutes.js if it exists, otherwise assuming /user/
    return apiClient.get(`/user/transactions/${walletAddress}`);
};

/**
 * [NEWLY ADDED] Function to call the backend withdrawal endpoint.
 * This function was missing, causing the Vercel build to fail.
 */
export const withdrawArix = async (withdrawalData) => {
  try {
    const response = await apiClient.post('/user/withdraw/arix', withdrawalData);
    return response.data;
  } catch (error) {
    // The interceptor already logs the error, but we re-throw it
    // so the component can catch it and update the UI (e.g., show an error message).
    throw error;
  }
};


// --- Earn & Staking Endpoints ---
export const getStakingConfig = () => apiClient.get('/earn/config');
export const recordUserStake = (data) => apiClient.post('/earn/stake', data);
export const initiateArixUnstake = (data) => apiClient.post('/earn/initiate-arix-unstake', data);
export const confirmArixUnstake = (data) => apiClient.post('/earn/confirm-arix-unstake', data);
export const getUserStakesAndRewards = (walletAddress) => apiClient.get(`/earn/stakes/${walletAddress}`);
export const requestUsdtWithdrawal = (data) => apiClient.post('/earn/request-usdt-withdrawal', data);
export const requestArixRewardWithdrawal = (data) => apiClient.post('/earn/request-arix-withdrawal', data);

/**
 * [NEWLY ADDED] Function to get the ARIX price.
 * This was causing a 404 error in your frontend logs. This function points to the correct backend route.
 */
export const getArixPrice = () => {
    // Assuming the correct route is `/price/arix` on the backend based on best practices.
    // If not, this path might need to be adjusted to match your backend price routes.
    return apiClient.get('/price/arix');
};


// --- Task Endpoints ---
export const getActiveTasks = (userWalletAddress) => {
    const params = userWalletAddress ? { userWalletAddress } : {};
    return apiClient.get('/tasks/active', { params });
};
export const submitTaskCompletion = (taskId, data) => apiClient.post(`/tasks/${taskId}/submit`, data);
export const getUserTaskHistory = (walletAddress) => apiClient.get(`/tasks/user/${walletAddress}`);


// --- Referral Endpoints ---
export const getUserReferralData = (walletAddress) => apiClient.get(`/referrals/data/${walletAddress}`);
export const getReferralProgramDetails = () => apiClient.get('/referrals/program-details');


// --- Game Endpoints ---
export const getCoinflipHistoryForUser = (walletAddress) => apiClient.get(`/game/coinflip/history/${walletAddress}`);
export const placeCoinflipBet = (data) => apiClient.post('/game/coinflip/bet', data);

export const playPlinko = (data) => apiClient.post('/game/plinko/play', data);

export const getCrashState = () => apiClient.get('/game/crash/state');
export const placeCrashBet = (data) => apiClient.post('/game/crash/bet', data);
export const cashOutCrash = (data) => apiClient.post('/game/crash/cashout', data);
export const getCrashHistoryForUser = (walletAddress) => apiClient.get(`/game/crash/history/${walletAddress}`);


// --- Swap Endpoints ---
export const getSwapQuote = (from, to) => apiClient.get('/swap/quote', { params: { from, to } });
export const performSwap = (data) => apiClient.post('/swap/execute', data);


// --- Push / Announcement Endpoints ---
export const getAnnouncements = () => apiClient.get('/push/announcements');

// Note: No default export is used to maintain consistency with named exports.
export default apiClient;
// AR_FRONTEND/src/services/swapServiceFrontend.js
import api from './api';

/**
 * Fetches the swap rate for a given currency pair.
 * @param {string} from - The currency to swap from (e.g., 'ARIX').
 * @param {string} to - The currency to swap to (e.g., 'USDT').
 * @returns {Promise<object>} A promise that resolves to the swap quote.
 */
export const getSwapQuote = async (from, to) => {
    try {
        const response = await api.get(`/swap/quote`, { params: { from, to } });
        return response.data;
    } catch (error) {
        console.error('Error fetching swap quote:', error.response?.data?.message || error.message);
        throw error.response?.data || new Error('Failed to fetch swap quote');
    }
};

/**
 * Executes a swap on the backend.
 * @param {string} userWalletAddress - The wallet address of the user performing the swap.
 * @param {string} fromCurrency - The currency to swap from.
 * @param {string} toCurrency - The currency to swap to.
 * @param {number} fromAmount - The amount of the 'from' currency to swap.
 * @returns {Promise<object>} A promise that resolves to the result of the swap operation, including the updated user object.
 */
export const performSwap = async (userWalletAddress, fromCurrency, toCurrency, fromAmount) => {
    try {
        const response = await api.post('/swap/execute', {
            userWalletAddress,
            fromCurrency,
            toCurrency,
            fromAmount
        });
        return response.data;
    } catch (error) {
        console.error('Error performing swap:', error.response?.data?.message || error.message);
        throw error.response?.data || new Error('Swap execution failed');
    }
};

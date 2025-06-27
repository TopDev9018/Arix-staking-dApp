
// AR_FRONTEND/src/utils/constants.js

// Payout multipliers for Plinko based on rows and risk
// This MUST match the configuration in the backend's constants.js file.
export const PLINKO_MULTIPLIERS = {
    8: {
        low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
        medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
        high: [29, 4, 1.5, 0.5, 0.3, 0.5, 1.5, 4, 29]
    },
    10: {
        low: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
        medium: [22, 5, 2, 1.1, 0.6, 0.5, 0.6, 1.1, 2, 5, 22],
        high: [76, 10, 3, 1, 0.5, 0.3, 0.5, 1, 3, 10, 76]
    },
    12: {
        low: [15, 4, 1.9, 1.2, 1, 1, 0.5, 1, 1, 1.2, 1.9, 4, 15],
        medium: [38, 9, 3, 1.5, 0.9, 0.6, 0.4, 0.6, 0.9, 1.5, 3, 9, 38],
        high: [170, 18, 6, 2, 1, 0.5, 0.3, 0.5, 1, 2, 6, 18, 170]
    },
    14: {
        low: [18, 5, 3, 1.5, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.5, 3, 5, 18],
        medium: [56, 15, 6, 3, 1.4, 0.8, 0.6, 0.4, 0.6, 0.8, 1.4, 3, 6, 15, 56],
        high: [350, 40, 12, 5, 1.5, 0.7, 0.5, 0.3, 0.5, 0.7, 1.5, 5, 12, 40, 350]
    },
    16: {
        low: [22, 8, 4, 2, 1.6, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.6, 2, 4, 8, 22],
        medium: [110, 25, 10, 5, 2, 1, 0.7, 0.5, 0.4, 0.5, 0.7, 1, 2, 5, 10, 25, 110],
        high: [1000, 130, 30, 10, 4, 1.5, 0.5, 0.4, 0.3, 0.4, 0.5, 1.5, 4, 10, 30, 130, 1000]
    }
};




export const ARIX_DECIMALS = 9;
export const USDT_DECIMALS = 6; 
export const USD_DECIMALS = 2;  


export const MIN_USDT_WITHDRAWAL_USD_VALUE = 3;



export const TONCONNECT_MANIFEST_URL = '/tonconnect-manifest.json';


export const TON_NETWORK = import.meta.env.VITE_TON_NETWORK || 'mainnet';


export const TON_EXPLORER_URL = TON_NETWORK === 'testnet' ? 'https://testnet.tonscan.org' : 'https://tonscan.org';


export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'arix_terminal_tma_bot'; 


export const REFERRAL_LINK_BASE = import.meta.env.VITE_TMA_URL || window.location.origin;


export const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';


export const DEFAULT_SUCCESS_MESSAGE = 'Operation successful!';


export const FALLBACK_IMAGE_URL = '/img/coin_spinning.gif'; 
export const COINFLIP_HEADS_IMG = '/img/coin_heads.png'; 
export const COINFLIP_TAILS_IMG = '/img/coin_tails.png'; 
export const COINFLIP_SPINNING_GIF = '/img/coin_spinning.gif'; 
export const COINFLIP_DEFAULT_IMG = '/img/coin-default-cf.png'; 





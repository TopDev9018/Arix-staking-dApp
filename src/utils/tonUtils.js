/**
 * AR_FRONTEND/src/utils/tonUtils.js
 *
 * [ENHANCED & RELIABLE VERSION with Toncenter API]
 *
 * This version addresses the persistent 500 errors from ton.access.orbs.network
 * by switching to the more stable Toncenter API. It includes:
 * - Advanced logging and error handling
 * - Automatic retry mechanisms
 * - Fallback endpoints
 * - All original functionality preserved
 */

import { Address, Cell, TonClient, beginCell, toNano as tonToNano } from "@ton/ton";
import { getHttpEndpoint } from "@orbs-network/ton-access";

// --- ORIGINAL CONSTANTS (PRESERVED) ---
export const ARIX_DECIMALS = 9;
export const USDT_DECIMALS = 6; 
export const USD_DECIMALS = 2;  
export const MIN_USDT_WITHDRAWAL_USD_VALUE = 3;
export const TONCONNECT_MANIFEST_URL = import.meta.env.VITE_TONCONNECT_MANIFEST_URL || '/tonconnect-manifest.json';
export const TON_NETWORK = import.meta.env.VITE_TON_NETWORK || 'mainnet';
export const TON_EXPLORER_URL = TON_NETWORK === 'testnet' ? 'https://testnet.tonscan.org' : 'https://tonscan.org';
export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'arix_terminal_tma_bot';
export const REFERRAL_LINK_BASE = import.meta.env.VITE_TMA_URL || window.location.origin;
export const FALLBACK_IMAGE_URL = '/img/placeholder-image.png';
export const COINFLIP_HEADS_IMG = '/img/coin_heads.png';
export const COINFLIP_TAILS_IMG = '/img/coin_tails.png';
export const COINFLIP_SPINNING_GIF = '/img/coin_spinning.gif';
export const COINFLIP_DEFAULT_IMG = '/img/coin-default-cf.png';

// --- ENHANCED CONFIGURATION ---
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 30000;

let memoizedTonClient = null;

// --- ENHANCED LOGGING UTILITY ---
const logWithTimestamp = (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [tonUtils.js] ${message}`;
    
    switch (level) {
        case 'info':
            console.log(logMessage, data || '');
            break;
        case 'warn':
            console.warn(logMessage, data || '');
            break;
        case 'error':
            console.error(logMessage, data || '');
            break;
        default:
            console.log(logMessage, data || '');
    }
};

// --- RETRY UTILITY ---
const retryWithDelay = async (fn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY_MS) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logWithTimestamp('info', `Attempt ${attempt}/${maxRetries}`);
            return await fn();
        } catch (error) {
            lastError = error;
            logWithTimestamp('warn', `Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
            
            if (attempt < maxRetries) {
                logWithTimestamp('info', `Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 1.5; // Exponential backoff
            }
        }
    }
    
    throw lastError;
};

// --- ENHANCED CLIENT INITIALIZATION ---
export const getTonClient = async () => {
    if (!memoizedTonClient) {
        try {
            logWithTimestamp('info', 'Initializing TonClient with Toncenter API...');
            
            // Get API key from environment (recommended for rate limiting)
            const apiKey = import.meta.env.VITE_TONCENTER_API_KEY || '';
            if (!apiKey) {
                logWithTimestamp('warn', 'No VITE_TONCENTER_API_KEY found. Consider getting one from @tonapibot on Telegram for better rate limits.');
            }
            
            // Primary endpoint: Official Toncenter
            const primaryEndpoint = `https://${TON_NETWORK === 'testnet' ? 'testnet.' : ''}toncenter.com/api/v2/jsonRPC${apiKey ? `?api_key=${apiKey}` : ''}`;
            
            // Fallback endpoints
            const fallbackEndpoints = [
                `https://${TON_NETWORK === 'testnet' ? 'testnet.' : ''}tonapi.io/v2/jsonRPC`,
                `https://${TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'}.tonhubapi.com/jsonRPC`
            ];
            
            const endpoints = [primaryEndpoint, ...fallbackEndpoints];
            
            let client = null;
            let lastError = null;
            
            for (const endpoint of endpoints) {
                try {
                    logWithTimestamp('info', `Trying endpoint: ${endpoint.replace(/api_key=[^&]*/, 'api_key=***')}`);
                    
                    client = new TonClient({ 
                        endpoint,
                        timeout: REQUEST_TIMEOUT_MS
                    });
                    
                    // Test the connection with a simple call instead of getWorkchain()
                    // Use getMasterchainInfo() which is available in TonClient
                    await client.getMasterchainInfo();
                    logWithTimestamp('info', `Successfully connected to: ${endpoint.replace(/api_key=[^&]*/, 'api_key=***')}`);
                    break;
                    
                } catch (error) {
                    lastError = error;
                    logWithTimestamp('warn', `Failed to connect to ${endpoint.replace(/api_key=[^&]*/, 'api_key=***')}: ${error.message}`);
                    client = null;
                }
            }
            
            if (!client) {
                throw new Error(`Failed to initialize TonClient with any endpoint. Last error: ${lastError?.message}`);
            }
            
            memoizedTonClient = client;
            logWithTimestamp('info', 'TonClient successfully initialized and cached');
            
        } catch (error) {
            logWithTimestamp('error', 'Critical error initializing TonClient:', error);
            throw error; 
        }
    }
    
    return memoizedTonClient;
};

// --- ORIGINAL HELPER FUNCTIONS (PRESERVED) ---
export const toSmallestUnits = (amount, decimals) => {
    if (amount === null || amount === undefined || isNaN(parseFloat(amount))) {
        return BigInt(0);
    }
    const [integerPart, decimalPart = ''] = String(amount).split('.');
    const paddedDecimalPart = decimalPart.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(integerPart + paddedDecimalPart);
};

export const toArixSmallestUnits = (amount) => {
    return toSmallestUnits(amount, ARIX_DECIMALS);
};

export const toUsdtSmallestUnits = (amount) => {
    return toSmallestUnits(amount, USDT_DECIMALS);
};

export const fromSmallestUnits = (amountInSmallestUnits, decimals) => {
    if (amountInSmallestUnits === null || amountInSmallestUnits === undefined) {
        return 0; 
    }
    try {
        const amountBigInt = BigInt(amountInSmallestUnits);
        const divisor = BigInt(10 ** decimals);
        const integerPart = amountBigInt / divisor;
        const fractionalPart = amountBigInt % divisor;

        const fractionalString = fractionalPart.toString().padStart(decimals, '0');
        
        return parseFloat(`${integerPart}.${fractionalString}`);
    } catch(e) {
        logWithTimestamp('error', 'Error in fromSmallestUnits:', { error: e, amountInSmallestUnits, decimals });
        return 0;
    }
};

export const fromArixSmallestUnits = (amountInSmallestUnits) => {
    return fromSmallestUnits(amountInSmallestUnits, ARIX_DECIMALS);
};

export const fromUsdtSmallestUnits = (amountInSmallestUnits) => {
    return fromSmallestUnits(amountInSmallestUnits, USDT_DECIMALS);
};

// --- ENHANCED JETTON WALLET ADDRESS FUNCTION ---
export const getJettonWalletAddress = async (ownerAddressString, jettonMasterAddressString) => {
    logWithTimestamp('info', `getJettonWalletAddress called`, { 
        owner: ownerAddressString, 
        master: jettonMasterAddressString 
    });
    
    // Input validation
    if (!ownerAddressString || typeof ownerAddressString !== 'string' || !ownerAddressString.includes(':')) {
        logWithTimestamp('error', 'Invalid ownerAddressString provided', { ownerAddressString });
        return null;
    }
    if (!jettonMasterAddressString) {
        logWithTimestamp('error', 'Missing jettonMasterAddressString');
        return null;
    }

    try {
        return await retryWithDelay(async () => {
            const client = await getTonClient();
            if (!client) throw new Error("TonClient not available in getJettonWalletAddress");

            const ownerAddress = Address.parse(ownerAddressString);
            const jettonMasterAddress = Address.parse(jettonMasterAddressString);

            logWithTimestamp('info', 'Calling get_wallet_address method...');
            
            // Use runMethod for TonClient from @ton/ton
            const result = await client.runMethod(
                jettonMasterAddress,
                'get_wallet_address',
                [{ type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() }]
            );
            
            const jettonWalletAddr = result.stack.readAddress().toString({
                bounceable: true, 
                testOnly: TON_NETWORK === 'testnet'
            });
            
            logWithTimestamp('info', 'Successfully derived Jetton Wallet Address', { jettonWalletAddr });
            return jettonWalletAddr;
        });

    } catch (error) {
        logWithTimestamp('error', 'CRITICAL ERROR in getJettonWalletAddress', { 
            error: error.message,
            stack: error.stack,
            owner: ownerAddressString,
            master: jettonMasterAddressString
        });
        return null;
    }
};

// --- ENHANCED JETTON BALANCE FUNCTION ---
export const getJettonBalance = async (jettonWalletAddressString) => {
    logWithTimestamp('info', `getJettonBalance called for: ${jettonWalletAddressString}`);
    
    try {
        return await retryWithDelay(async () => {
            const client = await getTonClient();
            if (!client) throw new Error("TonClient not available in getJettonBalance");

            const jettonWalletAddress = Address.parse(jettonWalletAddressString);
            
            logWithTimestamp('info', 'Getting contract state...');
            const contractState = await client.getContractState(jettonWalletAddress);

            // Check if contract is deployed/active
            if (!contractState.code || !contractState.data) {
                logWithTimestamp('warn', `Jetton wallet ${jettonWalletAddressString} is not active (not deployed). Assuming 0 balance.`);
                return BigInt(0);
            }

            logWithTimestamp('info', 'Contract is active. Calling get_wallet_data method...');
            
            // Use runMethod for TonClient from @ton/ton
            const result = await client.runMethod(jettonWalletAddress, 'get_wallet_data');
            const balance = result.stack.readBigNumber();
            
            logWithTimestamp('info', 'Successfully fetched balance', { 
                balance: balance.toString(),
                walletAddress: jettonWalletAddressString
            });
            
            return balance;
        });

    } catch (error) {
        logWithTimestamp('error', 'CRITICAL ERROR in getJettonBalance', { 
            error: error.message,
            stack: error.stack,
            walletAddress: jettonWalletAddressString
        });
        
        // Handle specific error cases
        if (error.message && (
            error.message.includes('exit_code: -256') || 
            error.message.includes('Unable to query contract state') ||
            error.message.includes('contract not found')
        )) {
            logWithTimestamp('warn', `Jetton wallet ${jettonWalletAddressString} likely not initialized. Assuming 0 balance.`);
            return BigInt(0);
        }
        
        return BigInt(0); 
    }
};

// --- ORIGINAL FUNCTIONS (PRESERVED) ---
export const createJettonTransferMessage = (
    jettonAmount,
    toAddressString,
    responseAddressString,
    forwardTonAmount = tonToNano("0.05"), 
    forwardPayload = null
) => {
    logWithTimestamp('info', 'Creating jetton transfer message', {
        jettonAmount: jettonAmount.toString(),
        toAddress: toAddressString,
        responseAddress: responseAddressString,
        forwardTonAmount: forwardTonAmount.toString()
    });
    
    try {
        const toAddress = Address.parse(toAddressString);
        const responseAddress = Address.parse(responseAddressString);

        const bodyBuilder = beginCell()
            .storeUint(0x0f8a7ea5, 32) // jetton transfer op
            .storeUint(BigInt(Date.now()), 64) // query_id
            .storeCoins(jettonAmount)
            .storeAddress(toAddress)
            .storeAddress(responseAddress)
            .storeBit(false); // custom_payload

        bodyBuilder.storeCoins(forwardTonAmount);

        if (forwardPayload instanceof Cell) {
            bodyBuilder.storeBit(true); // forward_payload in ref
            bodyBuilder.storeRef(forwardPayload);
        } else {
            bodyBuilder.storeBit(false); // no forward_payload
        }
        
        const message = bodyBuilder.endCell();
        logWithTimestamp('info', 'Successfully created jetton transfer message');
        return message;
        
    } catch (error) {
        logWithTimestamp('error', 'Error creating jetton transfer message', { error: error.message });
        throw error;
    }
};

export const createStakeForwardPayload = (params) => {
    logWithTimestamp('info', 'Creating stake forward payload', params);
    
    try {
        const payload = beginCell()
            .storeUint(0xf010c513, 32) // stake op
            .storeUint(params.queryId, 64)
            .storeUint(params.stakeIdentifier, 64)
            .storeUint(params.durationSeconds, 32)
            .storeUint(params.arix_lock_apr_bps, 16)
            .storeUint(params.arix_lock_penalty_bps, 16)
            .endCell();
            
        logWithTimestamp('info', 'Successfully created stake forward payload');
        return payload;
        
    } catch (error) {
        logWithTimestamp('error', 'Error creating stake forward payload', { error: error.message });
        throw error;
    }
};

// --- ENHANCED TRANSACTION CONFIRMATION ---
export const waitForTransactionConfirmation = async (
    walletAddressString, 
    sentMessageCellBoc, 
    timeoutMs = 180000, 
    intervalMs = 5000
) => {
    try {
        const client = await getTonClient();
        if (!client) throw new Error("TonClient not available for tx confirmation");

        const walletAddress = Address.parse(walletAddressString);

        logWithTimestamp('info', `Starting transaction confirmation poll`, {
            wallet: walletAddressString,
            timeoutMs,
            intervalMs
        });

        const startTime = Date.now();
        let lastLt = null;
        
        try {
            const initialState = await client.getContractState(walletAddress);
            lastLt = initialState.lastTransaction?.lt ? BigInt(initialState.lastTransaction.lt) : null;
        } catch (error) {
            logWithTimestamp('warn', 'Could not get initial contract state', { error: error.message });
        }

        while (Date.now() - startTime < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            
            try {
                const transactions = await client.getTransactions(walletAddress, {
                    limit: 10, 
                    archival: true 
                });

                for (const tx of transactions) {
                    if (tx.inMessage && tx.inMessage.info.type === 'external-in') {
                        if (tx.description?.computePhase?.type === 'vm' && tx.description.computePhase.success) {
                            const txHash = tx.hash().toString('hex');
                            logWithTimestamp('info', `Transaction confirmed!`, {
                                wallet: walletAddressString,
                                txHash,
                                timeElapsed: Date.now() - startTime
                            });
                            return txHash; 
                        }
                    }
                }
                
                if (transactions.length > 0) {
                    const currentLastLt = transactions[0].lt; 
                    if (lastLt && BigInt(currentLastLt) > lastLt) {
                        logWithTimestamp('info', 'New transaction detected, continuing to monitor...');
                    }
                    lastLt = BigInt(currentLastLt);
                }

            } catch (error) {
                if (error.message.includes("Unable to query contract state") && Date.now() - startTime < 15000) {
                    logWithTimestamp('warn', 'Wallet state not queryable yet, retrying...');
                } else {
                    logWithTimestamp('warn', 'Error polling for transactions', { error: error.message });
                }
            }
        }
        
        logWithTimestamp('warn', `Transaction confirmation timed out`, {
            wallet: walletAddressString,
            timeoutMs,
            timeElapsed: Date.now() - startTime
        });
        return null; 
        
    } catch (error) {
        logWithTimestamp('error', 'Error in waitForTransactionConfirmation', { 
            error: error.message,
            wallet: walletAddressString
        });
        return null;
    }
};

// --- UTILITY FUNCTIONS FOR DEBUGGING ---
export const testConnection = async () => {
    try {
        logWithTimestamp('info', 'Testing TON client connection...');
        const client = await getTonClient();
        const masterchainInfo = await client.getMasterchainInfo();
        logWithTimestamp('info', 'Connection test successful', { masterchainInfo });
        return true;
    } catch (error) {
        logWithTimestamp('error', 'Connection test failed', { error: error.message });
        return false;
    }
};

export const resetClient = () => {
    logWithTimestamp('info', 'Resetting memoized TonClient');
    memoizedTonClient = null;
};

// Export logging utility for external use
export const logTonUtils = logWithTimestamp;
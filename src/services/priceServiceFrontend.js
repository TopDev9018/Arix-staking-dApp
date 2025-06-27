



import apiClient from './api'; 

export const getArxUsdtPriceFromBackend = async () => {
  try {
    
    const response = await apiClient.get('/earn/arx-price');
    if (response.data && typeof response.data.price === 'number') {
      return response.data.price;
    }
    console.warn("Could not get ARIX price from backend dedicated endpoint (priceServiceFrontend.js):", response.data);
    return null;
  } catch (error) {
    let errorMessage = "Error fetching ARIX/USDT price via backend.";
    if (error.isAxiosError && error.response) {
      errorMessage += ` Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`;
    } else if (error.isAxiosError && error.request) {
      errorMessage += " No response received from backend.";
    } else {
      errorMessage += ` ${error.message}`;
    }
    console.error(errorMessage, error);
    return null;
  }
};





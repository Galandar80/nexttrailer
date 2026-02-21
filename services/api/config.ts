
// API Configuration file
const API_URL = "https://api.themoviedb.org/3";

// Recupera le chiavi dalle variabili d'ambiente
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const DEFAULT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN || '';

// Funzione migliorata per recuperare l'API key dallo store
export const getApiKey = (): string => {
  try {
    const storedData = localStorage.getItem('api-key-storage-v2');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.state?.apiKey) {
        return parsedData.state.apiKey;
      }
    }
  } catch (e) {
    console.error("Error retrieving API key from storage:", e);
  }
  return DEFAULT_API_KEY;
};

// Funzione per recuperare l'Access Token
export const getAccessToken = (): string => {
  try {
    const storedData = localStorage.getItem('api-key-storage-v2');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.state?.accessToken) {
        return parsedData.state.accessToken;
      }
    }
  } catch (e) {
    console.error("Error retrieving access token from storage:", e);
  }
  return DEFAULT_ACCESS_TOKEN;
};

// Funzione migliorata per gestire le richieste HTTP
export const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
  try {
    // Utilizzo diretto dell'API key memorizzata
    const apiKey = getApiKey();
    let updatedUrl = url;
    
    if (url.includes('api_key=')) {
      updatedUrl = url.replace(/api_key=([^&]*)/, `api_key=${apiKey}`);
    } else {
      const separator = url.includes('?') ? '&' : '?';
      updatedUrl = `${url}${separator}api_key=${apiKey}`;
    }
    
    console.log("Fetching with URL:", updatedUrl);
    
    const response = await fetch(updatedUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying, ${retries} retries remaining`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, retries - 1);
    }
    console.error(`Failed to fetch after retries: ${error}`);
    throw error;
  }
};

// Fetch with access token instead of API key
export const fetchWithAccessToken = async (endpoint: string) => {
  try {
    const accessToken = getAccessToken();
    const url = `${API_URL}${endpoint}`;
    
    console.log("Trying with access token instead:", url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error with token! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error("Access token approach failed:", error);
    throw error;
  }
};

export { API_URL };

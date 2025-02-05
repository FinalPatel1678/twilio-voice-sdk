import axios from 'axios';

// Fetch the Twilio access token
export const getAccessToken = async (): Promise<{ token: string }> => {
  try {
    const response = await axios.get<{ token: string }>(`${process.env.REACT_APP_BASE_URL}/access_token`);
    return response.data;
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw error;
  }
};







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

// Add new function to fetch call details
export const fetchCallDetails = async (callSid: string): Promise<any> => {
  try {
    const response = await axios.post<{ call: any }>(
      `${process.env.REACT_APP_BASE_URL}/fetch-call`,
      { callSid }
    );
    return response.data.call;
  } catch (error) {
    console.error('Error fetching call details:', error);
    throw error;
  }
};







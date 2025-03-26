import axios from 'axios';

// Fetch the Twilio access token
export const getAccessToken = async (userId:string): Promise<{ token: string }> => {
  try {
    const response = await axios.get<{ token: string }>(`./GetAccessToken`,{params: { userId }});
    return response.data;
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw error;
  }
};

// Add new function to fetch call details
export const fetchCallDetails = async (apiBaseUrl: string, callSid: string): Promise<any> => {
  try {
    const response = await axios.post<{ call: any }>(
      `./FetchCall`,
      { callSid }
    );
    return response.data.call;
  } catch (error) {
    console.error('Error fetching call details:', error);
    throw error;
  }
};

export const isCandidateInCall = async (candidatePhone: string): Promise<{ isInCall: boolean , message:string }> => {
  try {
    const response = await axios.get<{ isInCall: boolean, message:string }>(`./IsCandidateInCall`, { params: { candidatePhone } });
    return response.data;
  } catch (error) {
    console.error('Error checking if candidate is in a call:', error);
    throw error;
  }
};







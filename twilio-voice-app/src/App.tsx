import React from 'react';
import AutoDialer from './components/AutoDialer';
import { Candidate } from './types/candidate.type';

const App = (props: { apiBaseUrl: string, candidates: Candidate[], userId: string, reqId: string }) => {
  return (
    <div className="bg-gray-100">
      <AutoDialer {...props} />
    </div>
  );
};

export default App;
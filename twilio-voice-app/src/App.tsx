import React from 'react';
import AutoDialer from './components/AutoDialer';
import { Candidate } from './types/candidate.type';
import { UserSettings } from './types/user.types';

const App = (props: { apiBaseUrl: string, candidates: Candidate[], userSettings: UserSettings }) => {
  return (
    <div className="bg-gray-100">
      <AutoDialer {...props} />
    </div>
  );
};

export default App;
import React from 'react';
import AutoDialer, { AutoDialerProps } from './components/AutoDialer';

const App = (props: AutoDialerProps) => {
  return (
    <div className="bg-gray-100">
      <AutoDialer {...props} />
    </div>
  );
};

export default App;
import React from 'react';
import { BrowserRouter, Routes } from 'react-router-dom';
import { AuthRoutes } from './routes/AuthRoutes';
import { AdminRoutes } from './routes/AdminRoutes';
import './styles/index.scss';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {AuthRoutes()}
        {AdminRoutes()}
      </Routes>
    </BrowserRouter>
  );
};

export default App;

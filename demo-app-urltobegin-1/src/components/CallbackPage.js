import React, { useEffect, useState } from 'react';
import { getToken } from '../services/DataShareService';
import { useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.css';
import '../CardStyles.css'; 

const backendService = process.env.REACT_APP_BACKEND_SERVICE;

const CallbackPage = () => {
  const location = useLocation();

  useEffect(() => {

    //BUILD Request from query and local storage
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get('code');

    const tokenRequest = {
      code
    };

    // Check query param for state variables
    // const state = queryParams.get('state');
    // console.log('checking state variable: '+state);
    // console.log('checking state variable from localstorage: '+localStorage.getItem('state'));

    if (code) {
      getToken(tokenRequest, backendService)
        .then((response) => {
          console.log('response from CallbackPage:', response);
        })
        .catch((error) => {
          console.error('Error:', error);
        });
    }
  }, [location.search]);

  return (
<div className="container">
<div class="card mb-4">
  <h2 class="card-header bg-light-blue"> Callback Page </h2>
</div>
</div>
  );
};

export default CallbackPage;

// FormPage.js
import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.css';

const getVerificationURL = () => {
  const clientId = process.env.REACT_APP_CLIENT_ID;
  const redirectURI = process.env.REACT_APP_REDIRECT_URI;
  const scope = process.env.REACT_APP_SCOPE;
  let baseURL = 'https://www.strava.com/oauth/authorize';

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('redirect_uri', redirectURI);
  params.append('scope', scope);
  params.append('response_type', 'code');
  const url = new URL(baseURL);
  url.search = params.toString();

  console.log('url.href: '+url.href)
  return url.href;
};

const FormPage = () => {
  const [firstName, setFirstName] = useState('');

  const redirectToWebsite = () => {
    localStorage.setItem('firstName', firstName);
    const url = getVerificationURL();
    console.log('Navigating to: ' + url);
    window.location.href = url;
  };

  const handleFirstNameChange = (e) => {
    setFirstName(e.target.value);
  };

  return (
<div className="container">
    <div className="customer-app">
      <div className="customer-app-banner">&#169;&nbsp; Strava OAuth Launcher </div>
      <form className="customer-app-form">
        <div className="mb-3">
          <label htmlFor="firstName" className="form-label">First Name:</label>
          <input
            type="text"
            className="form-control"
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={handleFirstNameChange}
            required
          />
        </div>

        <button type="button" className="btn btn-primary" onClick={redirectToWebsite}>
          Verify
        </button>
      </form>
    </div>

    <div className="explain">
        <div className="title">
            <i>Powered by</i> CLEAR Web SDK Demo
        </div>
        <div className="subtitle">
            This sample application provides an easy way to run the 
            end-to-end <i>Powered by</i> CLEAR experience.
        </div>
        <ol>
            <li>Fill out the form with test info</li>
            <li>Click "Verify with CLEAR" to conduct a sample verification</li>
            <li>Compare results at the end: your self-attested info vs. info verified by CLEAR.</li>
        </ol>
        <div className="use-common-sense">
            <i>Note</i> - this app is for demo purposes only. All production, partner apps must 
            pass a code review with our team. This protects customers, your company and CLEAR.
        </div>
    </div>
</div>
  );
};

export default FormPage;

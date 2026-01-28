import { Link } from 'react-router-dom';
import './Convert.css';

export function Convert() {
  return (
    <div className="convert-page">
      <div className="container">
        <div className="convert-container">
          <div className="convert-header">
            <h1>Currency Conversion</h1>
            <p>Convert currencies during transfers</p>
          </div>

          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⇄</div>
              <h3>Conversion Happens During Transfers</h3>
              <p style={{ marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                Currency conversion is automatically applied when you send money in a different currency than the recipient receives.
              </p>
              <Link to="/transfer" className="btn btn-primary btn-lg">
                Go to Transfer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

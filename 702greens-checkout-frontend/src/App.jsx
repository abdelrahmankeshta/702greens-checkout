import { Routes, Route } from 'react-router-dom';
import CheckoutPage from './pages/CheckoutPage.jsx';
import SuccessPage from './pages/SuccessPage.jsx';
import EmailLoginPage from './pages/EmailLoginPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/checkout/:productSlug" element={<CheckoutPage />} />
      <Route path="/login" element={<EmailLoginPage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="/" element={<h1>702Greens Checkout Home</h1>} />
    </Routes>
  );
}

export default App;

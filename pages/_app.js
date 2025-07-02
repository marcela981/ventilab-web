import { PatientDataProvider } from '../src/contexts/PatientDataContext';
import '../src/App.css';

function MyApp({ Component, pageProps }) {
  return (
    <PatientDataProvider>
      <Component {...pageProps} />
    </PatientDataProvider>
  );
}

export default MyApp; 
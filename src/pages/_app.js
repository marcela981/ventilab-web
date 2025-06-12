// Next.js App Component - VentyLab
import { Header } from '../components/layout';
import '../theme/index.css';
import '../App.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* Header ocultado temporalmente */}
      {/* <Header 
        title="VentyLab"
        subtitle="Ventilación Mecánica"
      /> */}
      <Component {...pageProps} />
    </>
  );
} 
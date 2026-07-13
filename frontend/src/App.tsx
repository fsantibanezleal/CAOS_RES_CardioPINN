import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RealEcgi } from './pages/RealEcgi';
import { Introduction } from './pages/Introduction';
import { Methodology } from './pages/Methodology';
import { Implementation } from './pages/Implementation';
import { Experiments } from './pages/Experiments';
import { Benchmark } from './pages/Benchmark';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RealEcgi />} />
        <Route path="/introduction" element={<Introduction />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/implementation" element={<Implementation />} />
        <Route path="/experiments" element={<Experiments />} />
        <Route path="/benchmark" element={<Benchmark />} />
        <Route path="*" element={<RealEcgi />} />
      </Routes>
    </Layout>
  );
}

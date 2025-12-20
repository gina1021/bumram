import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Player from './Player';
import LyricAdd from './LyricAdd';
import './App.css';

function App() {
  return (
    <BrowserRouter basename="/bumram">
      <Routes>
        <Route path="/" element={<Player />} />
        <Route path="/lyric-add" element={<LyricAdd />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { useState, useEffect, useRef } from 'react';
import './App.css';
import { IoPlay, IoPause, IoPlayBack, IoPlayForward } from "react-icons/io5";
import LiquidGlass from 'liquid-glass-react';
import authorTxtUrl from './music/author.txt';
import { Fade } from 'react-awesome-reveal';
import { TypeAnimation } from 'react-type-animation';

// TODO
// 현재 진행중인 노래에 맞춰 타이틀 변경
// height 줄이기
// 안에 내용물 짜부시키기
// 핸드폰이랑 색감? saturation? 차이 나는 이유 찾아오기



// music 디렉토리의 모든 오디오 파일을 동적으로 불러오기 (mp3, wav)
const musicContext = require.context('./music', false, /\.(mp3|wav)$/);

// 파일명에서 트랙 이름 추출 (예: "01.Bittersweet.mp3" -> "Bittersweet", "05.Paint.wav" -> "Paint")
const getTrackName = (filename) => {
  const name = filename.replace(/^\d+\./, '').replace(/\.(mp3|wav)$/, '');
  return name || filename;
};

// 트랙 목록 생성 (파일명 순서대로 정렬)
const allFiles = musicContext.keys().sort((a, b) => {
  // 파일명 앞의 숫자로 정렬
  const getNumber = (path) => {
    const match = path.match(/(\d+)\./);
    return match ? parseInt(match[1], 10) : 999;
  };
  return getNumber(a) - getNumber(b);
});

const tracks = allFiles.map((path, index) => {
  const filename = path.replace('./', '');
  return {
    id: index + 1,
    name: getTrackName(filename),
    file: musicContext(path),
  };
});

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [authors, setAuthors] = useState([]);
  const [showIntro, setShowIntro] = useState(true);
  const audioRef = useRef(null);
  // setIsPlaying(true);

  useEffect(() => {
    // music/author.txt: 한 줄 = 한 곡의 "주인(부른 사람)" (트랙 순서대로)
    // CRA에서는 txt import가 URL로 번들링되므로 fetch로 읽는다.
    const ac = new AbortController();
    fetch(authorTxtUrl, { signal: ac.signal })
      .then((res) => res.text())
      .then((text) => {
        const lines = text
          .split(/\r?\n/g)
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith('#'));
        setAuthors(lines);
      })
      .catch(() => setAuthors([]));

    return () => ac.abort();
  }, []);

  useEffect(() => {
    // 트랙 변경(및 최초 로드) 시 자동 로드/재생 시도
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => {
      // 인트로가 보이는 동안에도 재생 시작
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.log('자동 재생 실패:', error);
      });
    };

    audio.addEventListener('canplay', handleCanPlay, { once: true });
    audio.load();

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentTrack]);

  // 컴포넌트 마운트 시 즉시 재생 시작 (인트로와 동시에)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 약간의 지연 후 재생 시도 (오디오 로드 시간 확보)
    const timer = setTimeout(() => {
      if (audio.readyState >= 2) { // HAVE_CURRENT_DATA 이상
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.log('초기 재생 실패:', error);
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateDuration = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(d || 0);
    };

    const updateTime = () => {
      const t = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      setCurrentTime(t || 0);
    };

    const handleEnded = () => {
      // 곡이 끝나면 다음 곡으로 자동 이동 (마지막이면 1번으로)
      setCurrentTrack((prev) => (prev < tracks.length ? prev + 1 : 1));
      setCurrentTime(0);
      setDuration(0);
    };

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    updateDuration();
    updateTime();

    return () => {
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((error) => {
      console.log('재생 실패:', error);
    });
  };

  const handleTrackChange = (trackId) => {
    setCurrentTrack(trackId);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleNext = () => {
    const nextTrack = currentTrack < tracks.length ? currentTrack + 1 : 1;
    handleTrackChange(nextTrack);
  };

  const handlePrevious = () => {
    const prevTrack = currentTrack > 1 ? currentTrack - 1 : tracks.length;
    handleTrackChange(prevTrack);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(e.target.value);
    audio.currentTime = Number.isFinite(next) ? next : 0;
    setCurrentTime(Number.isFinite(next) ? next : 0);
  };

  const formatTime = (seconds) => {
    const s = Number.isFinite(seconds) ? seconds : 0;
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const currentTrackData = tracks.find(t => t.id === currentTrack);
  const trackTitle = currentTrackData?.name || '';
  const currentAuthor = authors[currentTrack - 1] || '범람';

  useEffect(() => {
    // 탭(웹사이트) 타이틀: "● 범람 곡제목 - 부른사람"
    // handlePlayPause();
    document.title = trackTitle ? `${trackTitle} - ${currentAuthor} ㆍ 범람` : 'ㆍ 범람';
  }, [trackTitle, currentAuthor]);

  // 인트로 자동 종료 (페이드아웃 완료 후)
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        // 인트로가 끝날 때 재생이 안 되어 있으면 재생 시도 (모바일 대응)
        const audio = audioRef.current;
        if (audio && audio.paused && !isPlaying) {
          audio.play().then(() => {
            setIsPlaying(true);
          }).catch((error) => {
            console.log('인트로 종료 후 재생 실패:', error);
          });
        }
        setShowIntro(false);
      }, 8800); // 6.8초(페이드아웃 시작) + 2초(페이드아웃 지속) = 8.8초
      return () => clearTimeout(timer);
    }
  }, [showIntro, isPlaying]);

  const handleIntroClick = () => {
    // 모바일에서 사용자 상호작용 후 재생 시작
    const audio = audioRef.current;
    if (audio && audio.paused) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.log('인트로 클릭 후 재생 실패:', error);
      });
    }
    setShowIntro(false);
  };

  return (
    <div className="App">
      {showIntro && (
        <div className="intro-screen"> 
          <div className="intro-content">
            <TypeAnimation sequence={[
              'TTL 14th album',
            ]} wrapper="div" className="intro-text" speed={20} delay={500} />
            <div className="intro-title">
              <Fade cascade delay={2400} damping={0.5} duration={2000}>
                <div>氾</div>
                <div>濫</div>
              </Fade> 
            </div>
          </div>
        </div>
      )}
      <div className={`liquid-wrap ${showIntro ? 'hidden' : ''}`}>
        <LiquidGlass
          className="player-container"
          displacementScale={70}
          blurAmount={0.08}
          saturation={140}
          aberrationIntensity={2}
          elasticity={0}
          cornerRadius={30}
          
          // liquid-glass-react는 기본 transform이 translate(-50%) 기반이라 absolute 중앙 배치가 안정적
          style={{ position: 'absolute', top: '50%', left: '50%' }}
          padding="var(--player-pad)"
        >
          <div className="watermark">氾<br />濫</div>
          <div className="player-content">
            <audio
              ref={audioRef}
              src={currentTrackData?.file}
              preload="metadata"
            />
            
            <div className="album-art">
              <div className="album-art-pattern"></div>
              {/* <div className="album-art-logo"></div> */}
            </div>

            <div className="track-info">
              <div className="track-name">{currentTrackData?.name}</div>
              <div className="artist-name">{currentAuthor}</div>
            </div>
            <div className="progress-time">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            <div className="progress">
              <input
                className="progress-range"
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={Math.min(currentTime, duration || 0)}
                onChange={handleSeek}
                aria-label="재생 위치"
              />

            </div>

            <div className="controls">
              <button className="control-btn prev-btn" onClick={handlePrevious}>
                <IoPlayBack />
              </button>
              <button className="play-pause-btn" onClick={handlePlayPause}>
                {isPlaying ? <IoPause  /> : <IoPlay />}
              </button>
              <button className="control-btn next-btn" onClick={handleNext}>
                <IoPlayForward />
              </button>
            </div>

            <div className="playlist">
              <div className="playlist-title"></div>
              <div className="playlist-list">
                {tracks.map((track) => {
                  const isActive = track.id === currentTrack;
                  return (
                    <button
                      key={track.id}
                      className={`playlist-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleTrackChange(track.id)}
                    >
                      <div className="playlist-left">
                        <div className="playlist-number">{String(track.id).padStart(2, '0')}</div>
                        <div className="playlist-name">{track.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </div>
  );
}

export default App;

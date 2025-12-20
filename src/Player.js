import { useState, useEffect, useRef } from 'react';
import './App.css';
import { IoPlay, IoPause, IoPlayBack, IoPlayForward, IoInformationCircle, IoClose } from "react-icons/io5";
import LiquidGlass from 'liquid-glass-react';
import authorTxtUrl from './music/author.txt';
import { Fade } from 'react-awesome-reveal';
import { TypeAnimation } from 'react-type-animation';

// 앨범 소개 텍스트 (HTML 마크업 사용 가능)
const INTRODUCE_TEXT = (
  <>
    <p class="title"><b>
      “청춘은 가득 차고, 
      결국 흘러넘친다.”</b>
    </p>
    

    <div class="paragraph">
      불안과 기대, 두려움과 설렘이 한데 뒤섞여<br />
      차오르다 끝내 넘쳐흐르는 거대한 파도다.
    </div>

    <div class="paragraph">
      윤슬처럼 빛나던 꿈들은 어느 날 <br />
      선택의 무게로 다가와 나를 짓누르기도 하고,<br />
      짙은 안개 같은 미래는<br />
      때로는 벅찬 환상처럼<br />
      때로는 막막한 질문처럼 
      우리 앞에 선다.
    </div>

    <p class="paragraph">
      그 속에서 우리는 서툴지만<br />
      멈추지 못한 채 
      계속 흔들리며 나아간다.
    </p>


    <p class="subtitle">
      <b>[범람]</b>은 
      그 흔들림의 기록이다.
    </p>

    <p class="paragraph">
      해야 할 선택의 무게에 눌리던 날들과<br />
      이유 없이 가슴이 뛰던 순간들,<br />
      말로 담기지 않을 만큼 
      복잡하게 일렁이던 감정들이<br />
      이 앨범 속에서 
      조용히 번지고 흘러넘친다.
    </p>

    <p class="paragraph">
      벅차고 두렵고 설레었던 
      모든 순간 속에서<br />
      우리는 분명히 
      각자의 배 위에 서 있었다.
    </p>

    <p class="ending">
      그리고 우리는 
      여전히 앞으로 나아가고 있다.
    </p>

    <div class="quote">
      언젠가 다시 이곳으로 돌아왔을 때,<br />
      일렁이는 파도에 비친 
      서로의 모습 속에서<br />
      우리는 또다시 범람할 것이다.
    </div>

  </>
);

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

function Player() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [authors, setAuthors] = useState([]);
  const [showIntro, setShowIntro] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('playlist'); // 'playlist' or 'lyrics'
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [playlistAnimated, setPlaylistAnimated] = useState(false);
  const audioRef = useRef(null);
  const lyricsRef = useRef(null);
  const lyricRefs = useRef({});

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


  // 가사 파일 로드 (트랙 번호 기준으로 .txt 파일 찾기)
  useEffect(() => {
    // src/lyric 디렉토리에서 트랙 번호 기준으로 가사 파일 찾기
    try {
      // require.context를 사용하여 lyric 디렉토리의 모든 .txt 파일을 동적으로 로드
      const txtContext = require.context('./lyric', false, /\.txt$/);
      const txtFiles = txtContext.keys();
      
      // 현재 트랙 번호와 일치하는 파일 찾기 (파일명 형식: 트랙번호.제목.txt)
      const lyricFileKey = txtFiles.find(file => {
        const fileName = file.replace('./', '').replace(/\.txt$/, '');
        // 파일명에서 트랙 번호 추출 (예: "6.11 (17)" -> 6)
        const trackNumberMatch = fileName.match(/^(\d+)\./);
        if (trackNumberMatch) {
          const fileTrackNumber = parseInt(trackNumberMatch[1], 10);
          return fileTrackNumber === currentTrack;
        }
        return false;
      });
      
      if (lyricFileKey) {
        const lyricFile = txtContext(lyricFileKey);
        fetch(lyricFile)
          .then((res) => res.text())
          .then((text) => {
            const trimmedText = text.trim();
            if (trimmedText.length === 0) {
              setLyrics([]);
              return;
            }
            const lines = trimmedText.split(/\r?\n/).filter(line => line.trim().length > 0);
            if (lines.length === 0) {
              setLyrics([]);
              return;
            }
            
            // 첫 줄은 트랙번호.제목 형식이므로 제외
            const lyricLines = lines.slice(1);
            
            if (lyricLines.length === 0) {
              setLyrics([]);
              return;
            }
            
            const parsedLyrics = lyricLines.map((line, index) => {
              // 타임스탬프 파싱: [mm:ss.ss] 형식
              const timestampMatch = line.match(/^\[(\d+):(\d+\.?\d*)\]\s*(.*)$/);
              if (timestampMatch) {
                const minutes = parseInt(timestampMatch[1], 10);
                const seconds = parseFloat(timestampMatch[2]);
                const time = minutes * 60 + seconds;
                return {
                  id: index,
                  time,
                  text: timestampMatch[3] || line.replace(/^\[\d+:\d+\.?\d*\]\s*/, ''),
                  original: line,
                };
              }
              return {
                id: index,
                time: null,
                text: line,
                original: line,
              };
            });
            setLyrics(parsedLyrics);
          })
          .catch((error) => {
            console.error('가사 파일 로드 실패:', error);
            setLyrics([]);
          });
      } else {
        setLyrics([]);
      }
    } catch (error) {
      // 파일이 없거나 로드 실패 시 빈 배열로 설정
      setLyrics([]);
    }
  }, [currentTrack]);

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
      // 처음 재생 시 모달 표시
      if (!hasPlayedOnce) {
        setHasPlayedOnce(true);
        setShowModal(true);
      }
    }).catch((error) => {
      console.log('재생 실패:', error);
    });
  };

  const handleTrackChange = (trackId) => {
    const audio = audioRef.current;
    
    // 현재 재생 중인 트랙을 클릭한 경우 처음부터 재생
    if (trackId === currentTrack && audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
      // 재생 중이 아니면 재생 시작
      if (audio.paused) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.log('재생 실패:', error);
        });
      }
      return;
    }
    
    // 다른 트랙으로 변경
    setCurrentTrack(trackId);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleNext = () => {
    const nextTrack = currentTrack < tracks.length ? currentTrack + 1 : 1;
    handleTrackChange(nextTrack);
  };

  const handlePrevious = () => {
    const audio = audioRef.current;
    
    // 현재 곡이 5초 이하로 진행되었으면 이전 곡으로 이동
    if (audio && currentTime <= 5) {
      const prevTrack = currentTrack > 1 ? currentTrack - 1 : tracks.length;
      setCurrentTrack(prevTrack);
      setCurrentTime(0);
      setDuration(0);
    } else {
      // 5초 이상 진행되었으면 현재 곡을 처음부터 재생
      if (audio) {
        audio.currentTime = 0;
        setCurrentTime(0);
        // 재생 중이 아니면 재생 시작
        if (audio.paused) {
          audio.play().then(() => {
            setIsPlaying(true);
          }).catch((error) => {
            console.log('재생 실패:', error);
          });
        }
      }
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(e.target.value);
    audio.currentTime = Number.isFinite(next) ? next : 0;
    setCurrentTime(Number.isFinite(next) ? next : 0);
  };

  // 현재 재생 시간에 맞는 가사 찾기
  useEffect(() => {
    if (lyrics.length === 0 || currentTime === 0) {
      setCurrentLyricIndex(-1);
      return;
    }

    // 현재 시간보다 작거나 같은 타임스탬프 중 가장 큰 것 찾기
    let foundIndex = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyrics[i].time !== null && lyrics[i].time <= currentTime) {
        // 다음 가사가 없거나, 다음 가사 시간이 현재 시간보다 크면
        if (i === lyrics.length - 1 || lyrics[i + 1].time === null || lyrics[i + 1].time > currentTime) {
          foundIndex = i;
          break;
        }
      }
    }

    setCurrentLyricIndex(foundIndex);
  }, [currentTime, lyrics]);

  // 하이라이트된 가사로 자동 스크롤
  useEffect(() => {
    if (currentLyricIndex >= 0 && lyricsRef.current && activeTab === 'lyrics') {
      const container = lyricsRef.current;
      const element = lyricRefs.current[currentLyricIndex];
      
      if (element && container) {
        // container의 실제 높이 (보이는 영역)
        const containerHeight = container.clientHeight;
        // element의 높이
        const elementHeight = element.clientHeight;
        
        // 현재 스크롤 위치를 고려한 element의 실제 위치
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // element가 container 내부에서의 상대 위치
        const elementTopRelative = elementRect.top - containerRect.top + container.scrollTop;
        
        // lyrics-container 높이 기준으로 중간으로 스크롤
        // element의 중앙이 container의 중앙에 오도록
        const scrollPosition = elementTopRelative - (containerHeight / 2) + (elementHeight / 2);
        
        container.scrollTo({
          top: Math.max(0, scrollPosition), // 음수 방지
          behavior: 'smooth'
        });
      }
    }
  }, [currentLyricIndex, activeTab]);

  // 가사 탭으로 전환 시 현재 재생 중인 가사로 스크롤
  useEffect(() => {
    if (activeTab === 'lyrics' && currentLyricIndex >= 0 && lyricsRef.current) {
      // DOM 업데이트를 기다리기 위해 약간의 지연
      const timer = setTimeout(() => {
        const container = lyricsRef.current;
        const element = lyricRefs.current[currentLyricIndex];
        
        if (element && container) {
          const containerHeight = container.clientHeight;
          const elementHeight = element.clientHeight;
          
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          
          const elementTopRelative = elementRect.top - containerRect.top + container.scrollTop;
          const scrollPosition = elementTopRelative - (containerHeight / 2) + (elementHeight / 2);
          
          container.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'smooth'
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, currentLyricIndex]);

  // 가사 클릭 시 해당 타임스탬프로 이동
  const handleLyricClick = (lyric) => {
    if (lyric.time !== null && audioRef.current) {
      const audio = audioRef.current;
      
      // 타임스탬프로 이동
      audio.currentTime = lyric.time;
      setCurrentTime(lyric.time);
      
      // 재생 중이 아니면 재생 시작
      if (audio.paused) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.log('가사 클릭 후 재생 실패:', error);
        });
      }
    }
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
    document.title = trackTitle ? `${trackTitle} - ${currentAuthor} ㆍ 범람` : 'ㆍ 범람';
  }, [trackTitle, currentAuthor]);

  // 인트로 자동 종료 (페이드아웃 완료 후)
  useEffect(() => {
    if (showIntro) {
      // 페이드아웃 시작 시점(6.8초)에 플레이리스트 애니메이션 시작
      const animationTimer = setTimeout(() => {
        setPlaylistAnimated(true);
      }, 7800); // 6.8초: 페이드아웃 시작 시점
      
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
      
      return () => {
        clearTimeout(timer);
        clearTimeout(animationTimer);
      };
    }
  }, [showIntro, isPlaying]);

  // 인트로 클릭 시에도 플레이리스트 애니메이션 시작
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
    setPlaylistAnimated(true);
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
          blurAmount={0.4}
          saturation={150}
          aberrationIntensity={5}
          elasticity={0}
          cornerRadius={25}
          // overLight={true}
          
          // liquid-glass-react는 기본 transform이 translate(-50%) 기반이라 absolute 중앙 배치가 안정적
          style={{ position: 'absolute', top: '50%', left: '50%' }}
          padding="var(--player-pad)"
        >
          <div className="player-content">
            <audio
              ref={audioRef}
              src={currentTrackData?.file}
              preload="metadata"
            />
            
            <div 
              className="album-art"
              onClick={() => setShowModal(true)}
              style={{ cursor: 'pointer' }}
            >
              <div className="album-art-pattern"></div>
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
              <div className="playlist-tabs">
                <button
                  className={`playlist-tab ${activeTab === 'playlist' ? 'active' : ''}`}
                  onClick={() => setActiveTab('playlist')}
                >
                  트랙
                </button>
                <button
                  className={`playlist-tab ${activeTab === 'lyrics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lyrics')}
                >
                  가사
                </button>
              </div>
              
              {activeTab === 'playlist' ? (
                <div className={`playlist-list ${playlistAnimated ? 'animated' : ''}`}>
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
              ) : (
                <div className="lyrics-container" ref={lyricsRef}>
                  {lyrics.length > 0 ? (
                    lyrics.map((lyric, index) => {
                      const isActive = index === currentLyricIndex;
                      return (
                        <div
                          key={lyric.id}
                          ref={(el) => {
                            if (el) {
                              lyricRefs.current[index] = el;
                            }
                          }}
                          className={`lyric-line ${isActive ? 'active' : ''} ${lyric.time === null ? 'no-timestamp' : ''}`}
                          onClick={() => handleLyricClick(lyric)}
                        >
                          {lyric.text}
                        </div>
                      );
                    })
                  ) : (
                    <div className="lyric-empty">가사가 없습니다</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </LiquidGlass>
      </div>
      
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* <button 
              className="modal-close-btn"
              onClick={() => setShowModal(false)}
              aria-label="닫기"
            >
              <IoClose />
            </button> */}
            <div className="modal-text">
              {INTRODUCE_TEXT}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Player;


import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoPlay, IoPause, IoArrowBack, IoPlayBack } from 'react-icons/io5';
import './LyricAdd.css';

// lyric 디렉토리의 모든 .txt 파일 로드
const lyricContext = require.context('./lyric', false, /\.txt$/);
const lyricFiles = lyricContext.keys().sort((a, b) => {
  // 파일명 앞의 숫자로 정렬
  const getNumber = (path) => {
    const match = path.match(/(\d+)\./);
    return match ? parseInt(match[1], 10) : 999;
  };
  return getNumber(a) - getNumber(b);
});

// 트랙 목록 생성
const availableTracks = lyricFiles.map((path) => {
  const fileName = path.replace('./', '').replace(/\.txt$/, '');
  const trackNumberMatch = fileName.match(/^(\d+)\.(.+)$/);
  if (trackNumberMatch) {
    return {
      trackNumber: parseInt(trackNumberMatch[1], 10),
      trackName: trackNumberMatch[2],
      lyricFile: path,
    };
  }
  return null;
}).filter(track => track !== null);

// music 디렉토리의 모든 오디오 파일 로드
const musicContext = require.context('./music', false, /\.(mp3|wav)$/);
const musicFiles = musicContext.keys();

// 파일명에서 트랙 이름 추출
const getTrackName = (filename) => {
  const name = filename.replace(/^\d+\./, '').replace(/\.(mp3|wav)$/, '');
  return name || filename;
};

function LyricAdd() {
  const navigate = useNavigate();
  const [selectedTrack, setSelectedTrack] = useState(availableTracks[0] || null);
  const [lyrics, setLyrics] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackFile, setTrackFile] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const audioRef = useRef(null);

  // 선택한 트랙에 맞는 음악 파일 찾기
  useEffect(() => {
    if (!selectedTrack) return;

    const trackName = selectedTrack.trackName;
    // 음악 파일 찾기 (트랙 이름으로 매칭, 대소문자 무시)
    const musicFile = musicFiles.find(file => {
      const fileName = file.replace('./', '');
      const extractedName = getTrackName(fileName);
      // 대소문자 무시하고 비교
      const normalizedExtracted = extractedName.toLowerCase().trim();
      const normalizedTrackName = trackName.toLowerCase().trim();
      return normalizedExtracted === normalizedTrackName;
    });

    if (musicFile) {
      const newTrackFile = musicContext(musicFile);
      setTrackFile(newTrackFile);
      console.log('음악 파일 매칭 성공:', {
        trackName,
        musicFile,
        trackFile: newTrackFile
      });
    } else {
      console.warn('음악 파일 매칭 실패:', {
        trackName,
        availableFiles: musicFiles.map(f => ({
          file: f,
          extracted: getTrackName(f.replace('./', ''))
        }))
      });
      setTrackFile(null);
    }
  }, [selectedTrack]);

  // 가사 파일 로드
  useEffect(() => {
    if (!selectedTrack) {
      setLyrics([]);
      return;
    }

    const lyricFile = lyricContext(selectedTrack.lyricFile);
    fetch(lyricFile)
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        // 첫 줄은 트랙번호.제목 형식이므로 제외
        const lyricLines = lines.slice(1);
        
        setLyrics(lyricLines.map((line, index) => {
          // 기존 타임스탬프가 있는지 확인
          const timestampMatch = line.match(/^\[(\d+):(\d+\.?\d*)\]\s*(.*)$/);
          if (timestampMatch) {
            return {
              id: index,
              text: timestampMatch[3] || line.replace(/^\[\d+:\d+\.?\d*\]\s*/, ''),
              timestamp: `[${timestampMatch[1]}:${timestampMatch[2]}]`,
              original: line,
            };
          }
          return {
            id: index,
            text: line.trim(),
            timestamp: null,
            original: line,
          };
        }));
      })
      .catch((error) => {
        console.error('가사 파일 로드 실패:', error);
        setLyrics([]);
      });
  }, [selectedTrack]);

  // trackFile 변경 시 리셋
  useEffect(() => {
    if (trackFile) {
      setCurrentTime(0);
      setIsPlaying(false);
      setDuration(0);
    }
  }, [trackFile]);

  // 오디오 이벤트 리스너
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      const t = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      setCurrentTime(t || 0);
    };

    const updateDuration = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(d || 0);
    };

    // 오디오가 로드될 때 duration 업데이트
    const handleLoadedMetadata = () => {
      updateDuration();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', updateDuration);

    // 초기 duration 설정
    updateDuration();
    updateTime();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', updateDuration);
    };
  }, [trackFile]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !trackFile) return;

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((error) => {
      console.log('재생 실패:', error);
      setIsPlaying(false);
    });
  };

  const handleLyricClick = (lyricId) => {
    const audio = audioRef.current;
    if (!audio) return;

    const timestamp = audio.currentTime;
    const minutes = Math.floor(timestamp / 60);
    const seconds = (timestamp % 60).toFixed(2);
    const formattedTime = `[${minutes}:${seconds.padStart(5, '0')}]`;

    setLyrics((prev) =>
      prev.map((lyric) =>
        lyric.id === lyricId
          ? { ...lyric, timestamp: formattedTime }
          : lyric
      )
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // 이전 가사로 이동
  const handlePreviousLyric = () => {
    const audio = audioRef.current;
    if (!audio) return;

    // 현재 재생 시간에 맞는 가사 찾기
    let currentIndex = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyrics[i].timestamp) {
        const timestampMatch = lyrics[i].timestamp.match(/^\[(\d+):(\d+\.?\d*)\]$/);
        if (timestampMatch) {
          const minutes = parseInt(timestampMatch[1], 10);
          const seconds = parseFloat(timestampMatch[2]);
          const time = minutes * 60 + seconds;
          
          if (time <= audio.currentTime) {
            // 다음 가사가 없거나, 다음 가사 시간이 현재 시간보다 크면
            if (i === lyrics.length - 1 || !lyrics[i + 1].timestamp || 
                (() => {
                  const nextMatch = lyrics[i + 1].timestamp.match(/^\[(\d+):(\d+\.?\d*)\]$/);
                  if (nextMatch) {
                    const nextMinutes = parseInt(nextMatch[1], 10);
                    const nextSeconds = parseFloat(nextMatch[2]);
                    return (nextMinutes * 60 + nextSeconds) > audio.currentTime;
                  }
                  return true;
                })()) {
              currentIndex = i;
              break;
            }
          }
        }
      }
    }

    // 현재 가사보다 한 단계 전의 가사 찾기
    if (currentIndex > 0) {
      // 이전 타임스탬프가 있는 가사 찾기
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (lyrics[i].timestamp) {
          const timestampMatch = lyrics[i].timestamp.match(/^\[(\d+):(\d+\.?\d*)\]$/);
          if (timestampMatch) {
            const minutes = parseInt(timestampMatch[1], 10);
            const seconds = parseFloat(timestampMatch[2]);
            const time = minutes * 60 + seconds;
            audio.currentTime = time;
            setCurrentTime(time);
            return;
          }
        }
      }
    } else if (currentIndex === -1) {
      // 현재 가사가 없으면 현재 시간보다 작은 타임스탬프 중 가장 큰 것 찾기
      let previousTime = -1;
      for (let i = lyrics.length - 1; i >= 0; i--) {
        if (lyrics[i].timestamp) {
          const timestampMatch = lyrics[i].timestamp.match(/^\[(\d+):(\d+\.?\d*)\]$/);
          if (timestampMatch) {
            const minutes = parseInt(timestampMatch[1], 10);
            const seconds = parseFloat(timestampMatch[2]);
            const time = minutes * 60 + seconds;
            
            if (time < audio.currentTime && time > previousTime) {
              previousTime = time;
            }
          }
        }
      }
      
      if (previousTime >= 0) {
        audio.currentTime = previousTime;
        setCurrentTime(previousTime);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedTrack) return;

    // 첫 줄에 트랙번호.제목 추가
    const header = `${selectedTrack.trackNumber}.${selectedTrack.trackName}`;
    const content = [
      header,
      ...lyrics.map((lyric) => {
        if (lyric.timestamp) {
          return `${lyric.timestamp} ${lyric.text}`;
        }
        return lyric.text;
      })
    ].join('\n');

    // 클립보드에 복사
    try {
      await navigator.clipboard.writeText(content);
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 2000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      // 폴백: 텍스트 영역을 사용한 복사
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setShowNotification(true);
        setTimeout(() => {
          setShowNotification(false);
        }, 2000);
      } catch (err) {
        console.error('클립보드 복사 실패:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleReset = () => {
    setLyrics((prev) =>
      prev.map((lyric) => ({ ...lyric, timestamp: null }))
    );
  };

  return (
    <div className="lyric-add-container">
      {showNotification && (
        <div className="notification">
          클립보드에 복사되었습니다!
        </div>
      )}
      <div className="lyric-add-header">
        <button className="back-btn" onClick={() => navigate('/bumram')}>
          <IoArrowBack />
        </button>
        <h1>가사 동기화</h1>
        <div className="track-select-container">
          <label htmlFor="track-select">트랙 선택:</label>
          <select
            id="track-select"
            className="track-select"
            value={selectedTrack ? `${selectedTrack.trackNumber}.${selectedTrack.trackName}` : ''}
            onChange={(e) => {
              const selected = availableTracks.find(
                track => `${track.trackNumber}.${track.trackName}` === e.target.value
              );
              if (selected) {
                setSelectedTrack(selected);
                setIsPlaying(false);
                setCurrentTime(0);
                setDuration(0);
              }
            }}
          >
            {availableTracks.map((track) => (
              <option key={`${track.trackNumber}.${track.trackName}`} value={`${track.trackNumber}.${track.trackName}`}>
                트랙 {track.trackNumber}: {track.trackName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lyric-add-content">
        <div className="player-section">
          <audio 
            ref={audioRef} 
            src={trackFile} 
            preload="metadata" 
          />
          
          <div className="player-controls">
            <button className="prev-lyric-btn" onClick={handlePreviousLyric} title="이전 가사로 이동">
              <IoPlayBack />
            </button>
            <button className="play-pause-btn-large" onClick={handlePlayPause}>
              {isPlaying ? <IoPause /> : <IoPlay />}
            </button>
            <div className="time-display">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="progress-bar-container">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              step="0.01"
              onChange={(e) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = e.target.value;
                }
              }}
              className="progress-bar"
            />
          </div>

          <div className="action-buttons">
            <button className="save-btn" onClick={handleSave}>
              저장
            </button>
            <button className="reset-btn" onClick={handleReset}>
              초기화
            </button>
          </div>
        </div>

        <div className="lyrics-section">
          <div className="lyrics-list">
            {lyrics.map((lyric) => (
              <div
                key={lyric.id}
                className={`lyric-line ${lyric.timestamp ? 'synced' : ''}`}
                onClick={() => handleLyricClick(lyric.id)}
              >
                {lyric.timestamp && (
                  <span className="timestamp">{lyric.timestamp}</span>
                )}
                <span className="lyric-text">{lyric.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LyricAdd;

